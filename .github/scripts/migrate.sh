#!/usr/bin/env bash
# Run the migrate job on $IMAGE and wait for it to finish (ADR-0014).
# Needs: JOB, RG, IMAGE, and a signed-in az. Exits non-zero unless the
# execution Succeeded; the caller bounds the total wait (timeout-minutes).
set -euo pipefail

# Same image, the job's own command (the migrator). If this fails, no
# revision is created and the old code keeps serving.
az containerapp job update -n "$JOB" -g "$RG" --image "$IMAGE" -o none
run=$(az containerapp job start -n "$JOB" -g "$RG" --query name -o tsv)
echo "Execution: $run"

while status=$(az containerapp job execution show -n "$JOB" -g "$RG" \
        --job-execution-name "$run" --query properties.status -o tsv)
      [ "$status" = Running ] || [ "$status" = Processing ]; do
  sleep 10
done

if [ "$status" != Succeeded ]; then
  echo "::error::Migration $run ended $status; nothing was deployed. Logs: az containerapp job logs show -n $JOB -g $RG --execution $run --container $JOB"
  exit 1
fi
