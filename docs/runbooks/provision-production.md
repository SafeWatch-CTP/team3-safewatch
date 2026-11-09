# Production doesn't exist yet

**Use when:** standing up production from nothing: the first deploy, or a
rebuild after the resource group is gone.
**Last drilled:** ⚠ never

## Before you start

- Azure CLI signed in (`az login`) on the subscription that pays, with
  permission to create app registrations (Entra ID) and assign roles.
- `jq` installed (manual steps only; the script uses `node`).
- Admin on the GitHub repo (repo variables, package visibility) and `gh`
  signed in.
- A `DATABASE_URL` for a Postgres server that admits Azure services (on the
  server's *Networking* page, "Allow public access from any Azure service"
  is checked), ending in `?sslmode=require`.
- The production Upstash database's REST URL and token.
- Blast radius: creates new resources only. Nothing existing changes.

## Steps

Steps 1–9 are automated. Run `.github/scripts/provision-production.sh`
from the repo root (Git Bash on Windows), answer its prompts, then
continue at step 10. It defaults to `LOC=canadacentral`; override any name
by setting it first (`LOC=eastus .github/scripts/provision-production.sh`).
Re-running it keeps whatever already exists. The manual steps below are
what it does, for when it fails partway.

1. Install the CLI pieces and register the providers:
   `az extension add --name containerapp --upgrade`
   `az provider register --namespace Microsoft.App`
   `az provider register --namespace Microsoft.OperationalInsights`
2. Pick the names (lowercase; these are examples):
   `RG=rg-safewatch; LOC=eastus; ENV=cae-safewatch; APP=safewatch`
3. Create the resource group and the Container Apps environment:
   `az group create -n "$RG" -l "$LOC"`
   `az containerapp env create -n "$ENV" -g "$RG" -l "$LOC" --environment-mode WorkloadProfiles`
   (Without `--environment-mode`, preview CLI builds create an Express
   environment, which can't run the migrate job in step 9.)
4. Create the identity GitHub Actions signs in as, allowed to manage this
   resource group only:
   ```bash
   CLIENT_ID=$(az ad app create --display-name gh-safewatch-deploy --query appId -o tsv)
   az ad sp create --id "$CLIENT_ID"
   az role assignment create --assignee "$CLIENT_ID" --role Contributor \
     --scope "$(az group show -n "$RG" --query id -o tsv)"
   az ad app federated-credential create --id "$CLIENT_ID" --parameters '{
     "name": "deploy-from-main",
     "issuer": "https://token.actions.githubusercontent.com",
     "subject": "repo:SafeWatch-CTP/team3-safewatch:ref:refs/heads/main",
     "audiences": ["api://AzureADTokenExchange"]}'
   ```
5. Give the workflow the names it reads (none of these are secrets):
   ```bash
   gh variable set AZURE_CLIENT_ID --body "$CLIENT_ID"
   gh variable set AZURE_TENANT_ID --body "$(az account show --query tenantId -o tsv)"
   gh variable set AZURE_SUBSCRIPTION_ID --body "$(az account show --query id -o tsv)"
   gh variable set AZURE_RESOURCE_GROUP --body "$RG"
   gh variable set AZURE_CONTAINERAPP --body "$APP"
   ```
6. Read the secrets into the shell without echoing them. The Upstash
   values come from the production database's *REST API* panel, not a
   developer's:
   `read -s DATABASE_URL; read -s UPSTASH_URL; read -s UPSTASH_TOKEN`
   `AUTH_SECRET=$(openssl rand -base64 33)`
7. Create the app from Microsoft's placeholder image. The first deploy
   replaces it with ours.
   ```bash
   az containerapp create -n "$APP" -g "$RG" --environment "$ENV" \
     --image mcr.microsoft.com/k8se/quickstart:latest \
     --ingress external --target-port 3000 \
     --min-replicas 0 --max-replicas 1 --revisions-mode single \
     --secrets database-url="$DATABASE_URL" auth-secret="$AUTH_SECRET" \
       github-id=unset github-secret=unset \
       upstash-url="$UPSTASH_URL" upstash-token="$UPSTASH_TOKEN" \
     --env-vars DATABASE_URL=secretref:database-url AUTH_SECRET=secretref:auth-secret \
       GITHUB_ID=secretref:github-id GITHUB_SECRET=secretref:github-secret \
       UPSTASH_REDIS_REST_URL=secretref:upstash-url \
       UPSTASH_REDIS_REST_TOKEN=secretref:upstash-token \
       AUTH_TRUST_HOST=true PG_POOL_MAX=1 LOG_LEVEL=info
   ```
8. Add the readiness and liveness probes. From now on a new revision gets
   traffic only after `/api/health` answers 200 (ADR-0013). The `set-mode`
   line also converts an older app that still runs in multiple-revision
   mode.
   ```bash
   az containerapp revision set-mode -n "$APP" -g "$RG" --mode single
   APP_ID=$(az containerapp show -n "$APP" -g "$RG" --query id -o tsv)
   CONTAINERS=$(az containerapp show -n "$APP" -g "$RG" \
     --query properties.template.containers -o json | jq 'del(.[0].imageType) | .[0].probes = [
       {"type":"Readiness","httpGet":{"path":"/api/health","port":3000},
        "periodSeconds":10,"timeoutSeconds":5,"failureThreshold":3},
       {"type":"Liveness","httpGet":{"path":"/api/health","port":3000},
        "initialDelaySeconds":60,"periodSeconds":30,"timeoutSeconds":5,"failureThreshold":3}]')
   az rest --method patch \
     --url "https://management.azure.com$APP_ID?api-version=2024-03-01" \
     --body "{\"properties\":{\"template\":{\"containers\":$CONTAINERS}}}"
   ```
   Check: `az containerapp show -n "$APP" -g "$RG" --query "properties.template.containers[0].probes[].type"`
   lists `Readiness` and `Liveness`.
9. Create the migrate job. The workflow points it at each new image and
   runs it before deploying (ADR-0014). Its name must be `$APP-migrate`.
   ```bash
   az containerapp job create -n "$APP-migrate" -g "$RG" --environment "$ENV" \
     --trigger-type Manual --replica-timeout 1800 --replica-retry-limit 0 \
     --parallelism 1 --replica-completion-count 1 --cpu 0.5 --memory 1Gi \
     --image mcr.microsoft.com/k8se/quickstart-jobs:latest \
     --command "/app/apps/migrate/node_modules/.bin/tsx" \
     --args "/app/apps/migrate/src/index.ts" \
     --secrets database-url="$DATABASE_URL" \
     --env-vars DATABASE_URL=secretref:database-url
   ```
10. Run the deploy: `gh workflow run deploy.yml --ref main`. Expect it to
    build and push the image, then fail at "Migrate". The new package is
    private, so Azure can't pull it yet.
11. Make the image public: the org's *Packages* → `team3-safewatch/web` → *Package
    settings* → *Change visibility* → Public.
12. Re-run the deploy (`gh run rerun --failed "$(gh run list --workflow deploy.yml -L 1 --json databaseId -q '.[0].databaseId')"`)
    and expect it green. "Migrate" applies every migration to the empty
    database.
13. Get the public address and check it:
    `FQDN=$(az containerapp show -n "$APP" -g "$RG" --query properties.configuration.ingress.fqdn -o tsv)`
    `curl -s "https://$FQDN/api/health"` → `{"status":"ok","db":"ok"}`
14. On GitHub, create a **production** OAuth app (Settings → Developer
    settings → OAuth Apps): homepage `https://$FQDN`, callback
    `https://$FQDN/api/auth/callback/github`. Generate a client secret.
15. Store its id and secret (`read -s GH_ID; read -s GH_SECRET` first), then
    restart so the revision reads them:
    `az containerapp secret set -n "$APP" -g "$RG" --secrets github-id="$GH_ID" github-secret="$GH_SECRET"`
    `az containerapp revision restart -n "$APP" -g "$RG" --revision "$(az containerapp show -n "$APP" -g "$RG" --query properties.latestReadyRevisionName -o tsv)"`
16. Set a budget alert: Cost Management → Budgets → $5, email alert.

## Verify it worked

- `curl -s "https://$FQDN/api/health"` says `{"status":"ok","db":"ok"}`.
- Signing in with GitHub on `https://$FQDN` works, and the session cookie is
  `__Secure-authjs.session-token`.
- A one-line PR, merged, reaches the live URL in under 10 minutes.

## If this didn't work

- `az ad app create` is refused: your tenant doesn't let you register apps
  (common on school-managed accounts). Ask the tenant admin, or use a
  subscription in a tenant you control.
- "Migrate" fails at step 12: read the execution's logs with
  `az containerapp job logs show -n "$APP-migrate" -g "$RG" --container "$APP-migrate"`.
  `Could not reach` means the Postgres firewall or the job's `DATABASE_URL`.
- `/api/health` doesn't say `db: "ok"` at step 13: read the logs with
  `az containerapp logs show -n "$APP" -g "$RG" --follow`.
  `Could not reach` means the Postgres firewall or `DATABASE_URL`.
- Anything else: stop and get help — don't widen the Postgres firewall to
  "everyone" to make it work.

## Related

- Spec of the system being operated on: `docs/specs/deploy.md`
- What to do when a deploy goes wrong later: `docs/runbooks/rollback-bad-deploy.md`
