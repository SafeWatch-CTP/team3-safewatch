---
type: infrastructure
---
<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:e46214ae46972b520a609d9c7e0b26a257f482e57c6bdca57bc30f58e203aeed -->

# Deploy — merges to main ship themselves

Shipping is a merge, not a ritual performed by someone who remembers the steps.

## Behavior

- CI builds the web app's image (the **only** place images are built) from
  `apps/web/Dockerfile` and pushes it to GHCR, tagged with the commit SHA.
  Contributor laptops never need docker.
- On main, `.github/workflows/deploy.yml` builds the image, runs the
  migrate job on it, and only if that succeeds starts a new Azure Container
  Apps revision from the same image. The app runs in single-revision mode with a readiness probe on
  `GET /api/health` (503 when the database is unreachable): the platform
  moves traffic to the new revision only once that probe passes, and the
  old revision serves until then. A revision that never becomes ready never
  takes traffic.
- The workflow waits for the new revision to become the latest *ready*
  revision and goes red if it doesn't within about five minutes. It refuses
  to deploy at all if the app isn't in single-revision mode, has no
  HTTP readiness probe for `/api/health` on the web container’s serving
  port (the ingress target port), or has no migrate job. TCP probes and
  other HTTP paths are rejected.
- Migrations run once per deploy, before the revision, in a Container Apps
  Job (`<app>-migrate`, manual trigger, no retries) that starts the web
  image with `apps/migrate` as its command. A failed migration turns the
  workflow red and no revision is created. The web container only serves;
  it never migrates.
- Secrets (`DATABASE_URL`, `AUTH_SECRET`, `GITHUB_ID`, `GITHUB_SECRET`,
  `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) live in Container
  Apps secrets, referenced by env vars (`secretref:`); the migrate job
  holds its own copy of `database-url`. Before deployment, verify that
  the job’s `DATABASE_URL` and the app’s database URL target the same
  database; update both when rotating it. The connectivity-only readiness
  probe cannot prove migrations ran against the app’s database;
  `.env.example` documents every variable; readiness and liveness probes
  point at /api/health.
- `PG_POOL_MAX=1` in production — a B1ms or shared Postgres has few connections to spare.

## Error states

| Failure | What happens |
|---|---|
| broken database connection settings detected by readiness | never ready; old revision keeps traffic; workflow red. GitHub OAuth credentials need separate sign-in verification; database reachability does not confirm sign-in works |
| migration fails | job execution fails; no revision created; old revision keeps serving; workflow red |
| migration succeeds, revision never ready | old code serves the new schema (expand-only makes that safe); workflow red |
| image can't be pulled (GHCR package private) | revision never starts; old revision keeps traffic; workflow red |
| image build fails | workflow red; nothing deploys |
| app not in single-revision mode, no required HTTP readiness probe, or no migrate job | workflow refuses before building |
| a bad revision passed its probe and took traffic | [rollback-bad-deploy](../runbooks/rollback-bad-deploy.md) |

## Constraints & decisions

- GHCR, not ACR — free for public repos. The package is public so Container
  Apps can pull it without stored credentials. On first deployment, make
  the newly published package public **before the migration job runs**, or
  configure durable GHCR pull credentials on **both** the migration job
  and the Container App. A first attempt that publishes a private package
  can fail at Migrate; make it public before retrying.
  `docker/build-push-action` builds and pushes the image, then
  `azure/container-apps-deploy-action` deploys that image after migration.
  The separate `docker/login-action` authenticates the build runner to
  GHCR; the deploy action receives no registry credentials, so it does not
  store the short-lived `GITHUB_TOKEN` on the app.
- Container Apps consumption, min replicas 0 (scale-to-zero is the default
  posture), max replicas 1; anything needing always-on gets its own
  discussion.
- The workflow's multi-line steps live in `.github/scripts/` (`preflight.sh`,
  `migrate.sh`, `wait-ready.sh`), runnable by hand after `az login` with the same env vars.
  `provision-production.sh` there creates the Azure resources the workflow
  expects; it is run by a person once, never by the workflow.
- Azure access from Actions is OIDC (federated credential on `main`), never
  a stored password.
- Migrations are expand-only: add tables, columns, and indexes; never drop
  or rename in the same deploy that stops using them. While a new revision
  waits to become ready, and after any rollback, the *old* code runs against
  the *new* schema. Additions and constraints must preserve old-revision
  reads and writes throughout deployment and rollback: for example, do not
  add a NOT NULL column without a default when old code may insert rows.
- The Azure migrator acquires a PostgreSQL session advisory lock before
  reading pending migrations and holds it through applying them. Closing
  its dedicated database connection releases the lock on success or
  failure; cancellation or timeout of the GitHub waiter does not release
  a lock held by a still-running Azure execution.
- The platform gates traffic, not the workflow; rollback is redeploying the
  previous image, not moving traffic. See ADR-0013.
- The worker deploys separately (as a Functions timer when precomputation
  arrives — an epic ticket, not part of the base deploy).
- Standing up production from nothing is
  [provision-production](../runbooks/provision-production.md).

## Verify

- The broken-revision drill, run on purpose periodically, including from
  scale-to-zero: deploy a revision with a bad `DATABASE_URL`, watch the old
  revision keep serving, and watch the workflow go red.
- A one-line PR reaches the live URL in < 10 minutes, untouched by hands.
- `curl https://<app>/api/health` says `db: "ok"`.

## Key ADRs

- [ADR-0013](../adr/0013-readiness-probe-gates-traffic.md) — the readiness
  probe, not the workflow, decides when a revision gets traffic.
- [ADR-0014](../adr/0014-migrate-in-a-container-apps-job.md) — migrations
  run in a Container Apps Job before each deploy.
- [ADR-0008](../adr/0008-azurite-seam.md) — the same code talks to local
  stand-ins or Azure by env var alone.
- [ADR-0012](../adr/0012-upstash-redis-cloud-dependency.md) — production
  uses its own Upstash database.


<!-- /coderabbit-ai-generated:v1 -->