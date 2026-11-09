#!/usr/bin/env bash
# Refuse to deploy without the readiness gate or the migrate job.
# Without single-revision mode and a readiness probe, a new revision could
# take traffic (or be declared live) before it can reach the database.
# Without the job, nothing migrates. See docs/runbooks/provision-production.md.
# Needs: APP, JOB, RG, and a signed-in az.
set -euo pipefail

mode=$(az containerapp show -n "$APP" -g "$RG" \
  --query properties.configuration.activeRevisionsMode -o tsv)
probes=$(az containerapp show -n "$APP" -g "$RG" \
  --query "length(properties.template.containers[0].probes[?type=='Readiness'] || \`[]\`)" -o tsv)
if [ "$mode" != "Single" ] || [ "$probes" = "0" ]; then
  echo "::error::Need single-revision mode and a readiness probe (mode=$mode, readiness probes=$probes). See docs/runbooks/provision-production.md."
  exit 1
fi
if ! az containerapp job show -n "$JOB" -g "$RG" -o none; then
  echo "::error::Migrate job $JOB not found. See docs/runbooks/provision-production.md."
  exit 1
fi
