#!/usr/bin/env bash
# Wait until the app's latest revision is its latest *ready* revision, i.e.
# the platform has moved traffic to it (ADR-0013). Needs: APP, RG, and a
# signed-in az. Exits non-zero if that hasn't happened within ~5 minutes.
set -euo pipefail

cond="properties.latestReadyRevisionName == properties.latestRevisionName"

# The revision may be waking from zero. az resource wait exits 0 even when
# it times out, so it only paces us; the check below decides.
az resource wait -g "$RG" -n "$APP" --resource-type Microsoft.App/containerApps \
  --custom "$cond" --interval 10 --timeout 300 || true

if [ "$(az containerapp show -n "$APP" -g "$RG" --query "$cond" -o json)" != true ]; then
  echo "::error::New revision never became ready; the previous one is still serving. Logs: az containerapp logs show -n $APP -g $RG"
  exit 1
fi
