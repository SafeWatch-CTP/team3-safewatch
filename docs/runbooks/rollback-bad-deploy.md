<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:ea5f7710360ea4cd2f53783d3bfed4571f4bb4fb1b3e9092f3ece83cc405b1d5 -->

# A bad revision took traffic

**Use when:** a deploy passed its readiness probe, took traffic, and broke
something (errors, sign-in failing, wrong data) that the previous deploy
didn't.
**Last drilled:** ⚠ never

## Before you start

- Set the names: `APP=<container app>` and `RG=<resource group>` (the
  repository variables `AZURE_CONTAINERAPP` and `AZURE_RESOURCE_GROUP`,
  respectively).
- `az login` works and you have Contributor on the resource group. Check
  now: `az containerapp show -n "$APP" -g "$RG" -o none`.
- Blast radius: the app runs one revision at a time, so rolling back is a
  redeploy of the previous image. It takes a few minutes, and the bad
  revision keeps serving until the good one passes its readiness probe. It
  moves code only. The database stays exactly as the bad deploy left it.

## Steps

1. List the revisions and their images, newest last:
   `az containerapp revision list -n "$APP" -g "$RG" --all --query "sort_by(@, &properties.createdTime)[].{name:name, image:properties.template.containers[0].image, active:properties.active, health:properties.healthState}" -o table`
2. Identify the revision currently serving traffic before choosing images:
   `az containerapp show -n "$APP" -g "$RG" --query "{ready:properties.latestReadyRevisionName, latest:properties.latestRevisionName, traffic:properties.configuration.ingress.traffic}" -o json`
   In single-revision mode, use the latest **ready** revision and confirm
   the traffic assignment; a newer revision may still be starting and
   active alone does not prove it serves traffic. Match the serving
   revision to its image in step 1, record the bad image, and choose a
   verified last-good image whose behavior worked and whose code remains
   compatible with the current schema.
3. Pause new deployments before recovery: disable the Deploy workflow
   (`gh workflow disable deploy.yml`) and pause merges/manual deployments.
   Drain queued and running deployment workflows (inspect with
   `gh run list --workflow deploy.yml`), then inspect Azure migration job
   executions (`az containerapp job execution list -n "$APP-migrate" -g "$RG"`)
   and wait for all outstanding executions to finish. Cancelling a GitHub
   run does not stop its Azure migration execution. Confirm no deployment
   or migration is still running before proceeding.
   Redeploy the good image:
   `az containerapp update -n "$APP" -g "$RG" --image <good-image> -o none`
4. Wait until the platform serves it. This prints the new revision's name
   once it's ready:
   `az containerapp show -n "$APP" -g "$RG" --query "{latest:properties.latestRevisionName, ready:properties.latestReadyRevisionName}" -o table`
   Repeat until `latest` and `ready` match.
5. ⚠ Main still contains the bad commit, and the next merge to main deploys
   it again. Open a revert PR now (`git revert <sha>`) and merge it before
   anything else. Keep deployments paused until the revert is merged and
   recovery is verified, then re-enable the workflow
   (`gh workflow enable deploy.yml`) and deploy the corrected main.
6. Post in the team channel: what broke, which image is serving, the
   revert PR link.

## Verify it worked

- `curl -s https://<app-fqdn>/api/health` says `{"status":"ok","db":"ok"}`.
- `az containerapp show -n "$APP" -g "$RG" --query "properties.template.containers[0].image" -o tsv`
  prints the good image.
- The thing that broke works again, checked by hand on the live URL.

## If this didn't work

- The good image never becomes ready (step 4 never matches): the deploy
  isn't the problem. Check the database (is Postgres running? did a secret
  change?) and read
  `az containerapp logs show -n "$APP" -g "$RG" --follow`.
- The bad deploy ran a migration, and the old revision errors against the
  new schema: stop and get help. Do not hand-edit the production database.
- Afterward, write a postmortem from `docs/postmortems/_template.md`.

## Related

- Spec of the system being operated on: `docs/specs/deploy.md`
- Why migrations don't roll back: `docs/adr/0014-migrate-in-a-container-apps-job.md`
- Why rollback is a redeploy: `docs/adr/0013-readiness-probe-gates-traffic.md`


<!-- /coderabbit-ai-generated:v1 -->