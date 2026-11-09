# ADR-0014: Migrations run in a Container Apps Job before each deploy

## Status

Proposed

## Context

A deploy has to apply pending SQL migrations to production Postgres before
the new code takes traffic. The Postgres firewall admits addresses it lists
plus, optionally, Azure services. GitHub's hosted runners are neither: their
outbound addresses come from a large, changing pool, so a migrate step on
the runner can't reach the database without opening the firewall to most of
the internet. Migrations have to run from inside Azure.

[ADR-0013](0013-readiness-probe-gates-traffic.md) also shapes where they can
run. The platform decides readiness from probes, and a liveness probe
restarts a replica that hasn't answered `/api/health` within about 150
seconds of starting. Anything that runs before the server starts spends
that budget.

## Decision

A **Container Apps Job** (manual trigger, same environment, same image,
command = `apps/migrate`) applies migrations. The deploy workflow runs it
between building the image and rolling out the revision:

1. Build and push the image.
2. Point the job at the new image and start it
   (`az containerapp job update --image …`, then `az containerapp job start`).
3. Wait for that run to reach `Succeeded`. If it fails, the workflow goes
   red and **no revision is created**. The old code keeps serving against a
   schema that is at worst partly migrated, which expand-only migrations
   tolerate.
4. Deploy the revision. The readiness gate from ADR-0013 applies unchanged.

The web image's start command is plain `next start`. The job gets its own
`database-url` secret, set by the provisioning runbook.

Build and deploy are two steps. The off-the-shelf deploy action builds and
deploys in one call, so the workflow builds with `docker/build-push-action`
(keeping its layer cache) and gives the action `imageToDeploy` only.

**Runner-up: migrate in the web image's start command, then start Next.**
No new resource, and it runs inside Azure with the app's own env. Rejected
because a migration longer than the liveness budget gets killed partway and
retried; every cold start after scale-to-zero runs the migrator first; a
failed migration looks like any other revision that never got ready; and
nothing locks against a second migrator once there is more than one replica.

**Also considered: an init container on the app that runs the migrator.**
Probes don't apply to init containers, so this fixes the liveness timing
with no new resource. It still runs on every cold start and every replica,
has no lock, and couples migrating to serving. It would be the right answer
if a second Azure resource were the main cost.

**Also considered: migrating from the GitHub runner.** This would mean
opening the Postgres firewall to the runner's IP for the duration of the
job, or using a self-hosted runner inside Azure. Rejected. A firewall
rule that CI adds and removes is easy to leave open, and a self-hosted
runner is infrastructure to patch.

## Consequences

- **Easier**: cold starts serve straight away; a failed migration is a
  named red step ("Migrate"), with its own execution logs; migrations run
  exactly once per deploy, whatever the replica count.
- **Easier**: the 150-second liveness budget applies to Next starting, not
  to the schema.
- **Harder**: one more resource to provision and keep in sync. The job
  needs the same `DATABASE_URL` secret as the app, and rotating it means
  updating both.
- **Harder**: the schema changes before new code is live, for as long as
  the revision takes to become ready. That's why migrations are
  expand-only, and why that rule matters.
- **Accepted tradeoff**: a migration that succeeds followed by a revision
  that never gets ready leaves the new schema under old code. Expand-only
  covers it.
- **Accepted tradeoff**: migrations never roll back automatically. A
  rollback redeploys code, not schema.
- **Unverified**: how long a job execution takes to cold-start in the
  consumption environment. It adds to deploy time, which the spec holds
  to under 10 minutes.

## See also

- `docs/specs/deploy.md` — the deploy contract.
- `docs/runbooks/provision-production.md` — creates the migrate job.
- `docs/runbooks/rollback-bad-deploy.md` — rollback moves code, not schema.
