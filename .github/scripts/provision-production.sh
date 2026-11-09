#!/usr/bin/env bash
# Stand up production from nothing (docs/runbooks/provision-production.md,
# steps 1-9). Safe to re-run: anything that already exists is kept as is.
#
#   .github/scripts/provision-production.sh
#
# Override any name by setting it first, e.g. LOC=eastus .github/scripts/...
# Needs: az (signed in), gh (signed in, repo admin), node. Run from the repo
# root in Git Bash, macOS or Linux. Secrets are read without echoing and are
# never written to disk.
set -euo pipefail

# Git Bash rewrites arguments that look like paths (/subscriptions/...) into
# Windows paths, which breaks every Azure resource id. Turn that off.
export MSYS_NO_PATHCONV=1

RG=${RG:-rg-safewatch}
LOC=${LOC:-canadacentral}
ENV=${ENV:-cae-safewatch}
APP=${APP:-safewatch}
JOB="$APP-migrate"
SP_NAME=${SP_NAME:-gh-$APP-deploy}

step() { printf '\n==> %s\n' "$*"; }
exists() { "$@" -o none >/dev/null 2>&1; }

step "Checking tools and sign-ins"
for tool in az gh node; do
  command -v "$tool" >/dev/null || { echo "Missing: $tool"; exit 1; }
done
az account show -o none || { echo "Run: az login"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "Run: gh auth login"; exit 1; }
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
SUB_ID=$(az account show --query id -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)
echo "Subscription: $(az account show --query name -o tsv) ($SUB_ID)"
echo "Repo: $REPO   RG=$RG  LOC=$LOC  ENV=$ENV  APP=$APP"
read -r -p "Continue? [y/N] " ok
[ "$ok" = y ] || [ "$ok" = Y ] || exit 1

step "1. CLI extension and resource providers"
az extension add --name containerapp --upgrade --only-show-errors
for ns in Microsoft.App Microsoft.OperationalInsights; do
  az provider register --namespace "$ns" --wait -o none
done

step "3. Resource group and Container Apps environment"
az group create -n "$RG" -l "$LOC" -o none
if exists az containerapp env show -n "$ENV" -g "$RG"; then
  echo "Environment $ENV exists; keeping it."
else
  az containerapp env create -n "$ENV" -g "$RG" -l "$LOC" -o none
fi

step "4. Identity GitHub Actions signs in as (OIDC, no password)"
CLIENT_ID=$(az ad app list --display-name "$SP_NAME" --query "[0].appId" -o tsv)
if [ -z "$CLIENT_ID" ]; then
  CLIENT_ID=$(az ad app create --display-name "$SP_NAME" --query appId -o tsv)
fi
exists az ad sp show --id "$CLIENT_ID" || az ad sp create --id "$CLIENT_ID" -o none
RG_ID=$(az group show -n "$RG" --query id -o tsv)
if [ -z "$(az role assignment list --assignee "$CLIENT_ID" --scope "$RG_ID" --role Contributor --query "[0].id" -o tsv)" ]; then
  # A new service principal takes a moment to be visible to role assignment.
  for attempt in 1 2 3 4 5 6; do
    az role assignment create --assignee "$CLIENT_ID" --role Contributor --scope "$RG_ID" -o none && break
    [ "$attempt" = 6 ] && exit 1
    echo "Waiting for the identity to propagate..."; sleep 10
  done
fi
SUBJECT="repo:$REPO:ref:refs/heads/main"
if [ -z "$(az ad app federated-credential list --id "$CLIENT_ID" --query "[?subject=='$SUBJECT'].name" -o tsv)" ]; then
  az ad app federated-credential create --id "$CLIENT_ID" -o none --parameters "{
    \"name\": \"deploy-from-main\",
    \"issuer\": \"https://token.actions.githubusercontent.com\",
    \"subject\": \"$SUBJECT\",
    \"audiences\": [\"api://AzureADTokenExchange\"]}"
fi

step "5. Repo variables the workflow reads (none are secrets)"
gh variable set AZURE_CLIENT_ID --body "$CLIENT_ID"
gh variable set AZURE_TENANT_ID --body "$TENANT_ID"
gh variable set AZURE_SUBSCRIPTION_ID --body "$SUB_ID"
gh variable set AZURE_RESOURCE_GROUP --body "$RG"
gh variable set AZURE_CONTAINERAPP --body "$APP"

APP_EXISTS=no; exists az containerapp show -n "$APP" -g "$RG" && APP_EXISTS=yes
JOB_EXISTS=no; exists az containerapp job show -n "$JOB" -g "$RG" && JOB_EXISTS=yes

if [ "$APP_EXISTS" = no ] || [ "$JOB_EXISTS" = no ]; then
  step "6. Secrets (typing is hidden; paste and press Enter)"
  read -r -s -p "DATABASE_URL (ends in ?sslmode=require): " DATABASE_URL; echo
  [ -n "$DATABASE_URL" ] || { echo "DATABASE_URL is required."; exit 1; }
fi

if [ "$APP_EXISTS" = no ]; then
  read -r -s -p "UPSTASH_REDIS_REST_URL (production database): " UPSTASH_URL; echo
  read -r -s -p "UPSTASH_REDIS_REST_TOKEN: " UPSTASH_TOKEN; echo
  AUTH_SECRET=$(node -e "process.stdout.write(require('crypto').randomBytes(33).toString('base64'))")

  step "7. Container App (placeholder image; the first deploy replaces it)"
  az containerapp create -n "$APP" -g "$RG" --environment "$ENV" -o none \
    --image mcr.microsoft.com/k8se/quickstart:latest \
    --ingress external --target-port 3000 \
    --min-replicas 0 --max-replicas 1 --revisions-mode single \
    --secrets database-url="$DATABASE_URL" auth-secret="$AUTH_SECRET" \
      github-id=unset github-secret=unset \
      upstash-url="${UPSTASH_URL:-unset}" upstash-token="${UPSTASH_TOKEN:-unset}" \
    --env-vars DATABASE_URL=secretref:database-url AUTH_SECRET=secretref:auth-secret \
      GITHUB_ID=secretref:github-id GITHUB_SECRET=secretref:github-secret \
      UPSTASH_REDIS_REST_URL=secretref:upstash-url \
      UPSTASH_REDIS_REST_TOKEN=secretref:upstash-token \
      AUTH_TRUST_HOST=true PG_POOL_MAX=1 LOG_LEVEL=info
else
  echo "Container App $APP exists; keeping its secrets and settings."
fi

step "8. Readiness and liveness probes on /api/health (ADR-0013)"
az containerapp revision set-mode -n "$APP" -g "$RG" --mode single -o none
APP_ID=$(az containerapp show -n "$APP" -g "$RG" --query id -o tsv)
CONTAINERS=$(az containerapp show -n "$APP" -g "$RG" --query properties.template.containers -o json \
  | node -e '
    let s = ""; process.stdin.on("data", d => s += d).on("end", () => {
      const c = JSON.parse(s);
      c[0].probes = [
        { type: "Readiness", httpGet: { path: "/api/health", port: 3000 },
          periodSeconds: 10, timeoutSeconds: 5, failureThreshold: 3 },
        { type: "Liveness", httpGet: { path: "/api/health", port: 3000 },
          initialDelaySeconds: 60, periodSeconds: 30, timeoutSeconds: 5, failureThreshold: 3 },
      ];
      process.stdout.write(JSON.stringify(c));
    });')
az rest --method patch -o none \
  --url "https://management.azure.com$APP_ID?api-version=2024-03-01" \
  --body "{\"properties\":{\"template\":{\"containers\":$CONTAINERS}}}"
echo "Probes: $(az containerapp show -n "$APP" -g "$RG" --query "properties.template.containers[0].probes[].type" -o tsv | tr '\n' ' ')"

step "9. Migrate job (ADR-0014)"
if [ "$JOB_EXISTS" = no ]; then
  az containerapp job create -n "$JOB" -g "$RG" --environment "$ENV" -o none \
    --trigger-type Manual --replica-timeout 1800 --replica-retry-limit 0 \
    --parallelism 1 --replica-completion-count 1 --cpu 0.5 --memory 1Gi \
    --image mcr.microsoft.com/k8se/quickstart-jobs:latest \
    --command "/app/apps/migrate/node_modules/.bin/tsx" \
    --args "/app/apps/migrate/src/index.ts" \
    --secrets database-url="$DATABASE_URL" \
    --env-vars DATABASE_URL=secretref:database-url
else
  echo "Job $JOB exists; keeping it."
fi

FQDN=$(az containerapp show -n "$APP" -g "$RG" --query properties.configuration.ingress.fqdn -o tsv)
cat <<EOF

Done. Production is provisioned; nothing is deployed yet.
Public address: https://$FQDN

Next (docs/runbooks/provision-production.md, step 10 onward):
  - Merge the deploy workflow to main, then: gh workflow run deploy.yml --ref main
  - Make the GHCR package public, re-run the deploy, check https://$FQDN/api/health
  - Production GitHub OAuth app with callback https://$FQDN/api/auth/callback/github
EOF
