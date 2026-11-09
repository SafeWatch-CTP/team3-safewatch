# A bad revision took traffic

**Use when:** a deploy passed its readiness probe, took traffic, and broke
something (errors, sign-in failing, wrong data) that the previous deploy
didn't.
**Last drilled:** ⚠ never

## Before you start

- `az login` works and you have Contributor on the resource group. Check
  now: `az containerapp show -n "$APP" -g "$RG" -o none`.
- Set the names: `APP=<container app>` and `RG=<resource group>` (the repo
  variables `AZURE_CONTAINERAPP` and `AZURE_RESOURCE_GROUP`).
- Blast radius: the app runs one revision at a time, so rolling back is a
  redeploy of the previous image. It takes a few minutes, and the bad
  revision keeps serving until the good one passes its readiness probe. It
  moves code only. The database stays exactly as the bad deploy left it.

## Steps

1. List the revisions and their images, newest last:
   `az containerapp revision list -n "$APP" -g "$RG" --all --query "sort_by(@, &properties.createdTime)[].{name:name, image:properties.template.containers[0].image, active:properties.active, health:properties.healthState}" -o table`
2. Write down the bad image (the newest, active one) and the last good one
   (the newest image before it that you know worked).
3. Redeploy the good image:
   `az containerapp update -n "$APP" -g "$RG" --image <good-image> -o none`
4. Wait until the platform serves it. This prints the new revision's name
   once it's ready:
   `az containerapp show -n "$APP" -g "$RG" --query "{latest:properties.latestRevisionName, ready:properties.latestReadyRevisionName}" -o table`
   Repeat until `latest` and `ready` match.
5. ⚠ Main still contains the bad commit, and the next merge to main deploys
   it again. Open a revert PR now (`git revert <sha>`) and merge it before
   anything else.
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
