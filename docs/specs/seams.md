---
type: infrastructure
---
# Seams — the unifying pattern

The same shape appears across every cloud dependency in this project:

```
local dev:  a stand-in (emulator, stub, env flag)
production: the real thing (Azure, real auth, etc.)
```

The stand-in is the default. Production is a single environment variable away.
This is called the **seam pattern** — a deliberate cut point where local and
production behavior diverge, controlled by configuration, not code branches.

## Instances

| Subsystem | Local stand-in | Production | Env var / switch |
|---|---|---|---|
| Database (tests) | PGlite (in-memory) | — | `PGLITE_DATA_DIR` flag |
| Database (dev) | Local Postgres via `apps/db-server/` | Azure Postgres | `DATABASE_URL` |
| Blob storage | Azurite | Azure Blob Storage | `AZURE_STORAGE_CONNECTION_STRING` |
| Queue | Azurite | Azure Storage Queue | `AZURE_STORAGE_CONNECTION_STRING` |
| Identity | Auth.js GitHub OAuth + database sessions | Same session-backed auth | `GITHUB_ID`, `GITHUB_SECRET`, `AUTH_SECRET` |
| Redis (geo index) | **None** — exception, see ADR-0012; tests use an in-memory fake | Upstash Redis | `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` |

## Design intent

- **No code branches.** The seam is never an `if (isLocal)`. The stand-in and
  the real thing implement the same interface, and the configuration chooses
  which one the SDK connects to.
- **Default to running.** `pnpm dev` starts the local stand-ins (Postgres,
  Azurite); GitHub sign-in requires OAuth app credentials.
- **Safe by default.** Identity comes from a verified provider identity and a
  database-backed session. Client-supplied user ids are never trusted.
- **Explicit configuration.** Azure Blob and Queue share
  `AZURE_STORAGE_CONNECTION_STRING`; the database has its own
  (`DATABASE_URL`); identity uses `GITHUB_ID`, `GITHUB_SECRET`, and
  `AUTH_SECRET`.

## ADRs

- [ADR-0005](../adr/0005-pglite-tests.md) — PGlite as the test-database seam.
- [ADR-0008](../adr/0008-azurite-seam.md) — Azurite as the blob/queue seam.
- [ADR-0003](../adr/0003-dev-identity-stub.md) — the original identity stub.
- [auth](auth.md) — the current session-backed identity contract.
- [ADR-0012](../adr/0012-upstash-redis-cloud-dependency.md) — Upstash Redis,
  the one cloud dependency with no local stand-in.

## Adding a new seam

1. Write the stand-in (emulator, stub, env guard).
2. Default to the stand-in.
3. Require one env var to swap to production.
4. Add a health check or probe that tells the user if the stand-in is down.
5. Write an ADR capturing the decision.
6. Add a row to this table.