#!/usr/bin/env bash
# Refuse to deploy without the readiness gate or the migrate job.
# Without single-revision mode and a readiness probe, a new revision could
# take traffic (or be declared live) before it can reach the database.
# Without the job, nothing migrates. See docs/runbooks/provision-production.md.
# Needs: APP, JOB, RG, and a signed-in az.
set -euo pipefail

mode=$(az containerapp show -n "$APP" -g "$RG" \
  --query properties.configuration.activeRevisionsMode -o tsv)
# The web container is the first container, as in provisioning and deployment.
app=$(az containerapp show -n "$APP" -g "$RG" -o json)
if [ "$mode" != "Single" ] || ! node -e '
  const app = JSON.parse(process.argv[1]);
  const port = app.properties.configuration.ingress?.targetPort;
  const probes = app.properties.template.containers[0]?.probes ?? [];
  process.exit(port && probes.some(p => p.type === "Readiness" &&
    !p.tcpSocket && p.httpGet?.path === "/api/health" &&
    p.httpGet.port === port) ? 0 : 1);
' "$app"; then
  echo "::error::Need single-revision mode and an HTTP readiness probe on /api/health at the serving port. See docs/runbooks/provision-production.md."
  exit 1
fi
if ! az containerapp job show -n "$JOB" -g "$RG" -o none; then
  echo "::error::Migrate job $JOB not found. See docs/runbooks/provision-production.md."
  exit 1
fi
