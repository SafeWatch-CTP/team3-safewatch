# A deleted migration left its column behind on half the team's databases

**Filed:** no issue · **Fixed:** PR #NN · **Spec:** `docs/specs/monorepo.md`

## Report

`pnpm db:seed` failed with `P2011: Null constraint violation on the fields:
(userId)` while seeding alerts, which create an `Incident` for each row. The
same code passed `pnpm test` and `pnpm build`.

Smallest reproduction, on an affected database:

```
pnpm db:seed
# Invalid `prisma.incident.create()` invocation
# Null constraint violation on the fields: (`userId`)
```

The column it names is not in `packages/db/prisma/schema/incident.prisma` and
is not created by any migration in the repo.

## Expected vs actual

`AGENTS.md` says migrations are append-only: "Never edit an applied
migration." Deleting one is not named, which is part of why it happened.

Expected: the schema in the repo describes every database built from the repo.
Actual: `Incident` had seventeen columns on databases created before
2026-10-12 and sixteen on those created after, with nothing in the repo
explaining the difference.

## Root cause

Three steps, none wrong on its own:

1. `1ea251a` added `20260916042543_add_user_id_to_incidents`, adding
   `Incident."userId"` as `NOT NULL`.
2. Developers ran it. It is recorded in their `_migrations` table, which is
   how migrations are meant to work: applied once, never re-run.
3. `7abb39d` deleted the migration file, correctly judging that the column was
   committed by accident, and stopped there.

Step 3 is the root cause, and the mechanism is that **a migration file is an
instruction that has already been carried out**. Removing the instruction
removes it only for databases that had not yet read it. The databases that had
already run it kept the column, with no record in the repo of why.

That it went unnoticed for five weeks is a second cause: nothing creates an
`Incident` yet. `5716b6f` had briefly aligned the Prisma model to the column,
and that alignment was removed along with the migration, so the drift had no
code path that could trip over it until the alerts seed did.

## The fix

A new forward migration, `20261118000000_drop_incident_user_id`, running
`ALTER TABLE "Incident" DROP COLUMN IF EXISTS "userId"`. `IF EXISTS` makes it
a no-op where the column was never created, so both kinds of database converge
on the next `pnpm dev` without anyone resetting or losing local data.

## Why our defenses missed it

The test suite cannot see this class of bug by construction. Integration tests
run against PGlite, built from the migration files on every run, so they
describe a database that matches the repo *by definition*. A drifted developer
database and CI are different environments, and only one of them is tested.

Review missed it because the deletion looked like a cleanup. The diff removed
a file that should never have been added, which is true, and says nothing
about the databases that had already consumed it.

## What changed beyond the fix

- `AGENTS.md` gains deletion to the append-only rule: a migration that has
  shipped is repaired by a new migration, never by removing the old one.
- Nothing tests for drift, and this postmortem does not add such a test. A
  check comparing a developer's `_migrations` table against the migrations on
  disk would have caught it in seconds, and is worth its own issue.
