# ADR-0013: The platform's readiness probe decides when a revision gets traffic

## Status

Proposed

## Context

A deploy must never send users to a revision whose env is broken or
whose migration failed. The obvious way to enforce that is in the
workflow: run the app in multiple-revision mode with traffic pinned to a
named revision, start each new revision at 0%, curl its `/api/health`
until it says `db: "ok"`, move traffic with
`az containerapp ingress traffic set`, and deactivate the revision if
the smoke test fails. That is about forty lines of shell, plus a
precondition (traffic must be pinned, never "latest revision") that the
workflow has to check and the provisioning runbook has to set up.

Container Apps can do the same thing itself. In single-revision mode, a
new revision replaces the old one only after its replicas pass their
readiness probe. Until then the old revision keeps serving. A revision
that never becomes ready never takes traffic. `/api/health` already
returns 503 when the database is unreachable, so it works as a
readiness probe unchanged.

## Decision

The app runs in **single-revision mode** with a **readiness probe** on
`GET /api/health` (HTTP, 503 = not ready). The probe's failure threshold
leaves room for a cold start, about two minutes. The deploy workflow builds the image, runs the migrate job (ADR-0014),
then calls `azure/container-apps-deploy-action`. It has no smoke test,
no traffic step and no pin check. A liveness probe on the same path restarts a
replica that later loses the database.

**Runner-up: multiple-revision mode and a smoke test in the workflow.**
It has one advantage: the gate is visible in the
Actions log and in the job summary, rather than in the platform's
revision status. It was rejected because it duplicates a feature the
platform has, and because the "traffic must be pinned" rule is easy to
break by hand and awkward to explain.

**Also considered: labels mode (`targetLabel`).** This gives
blue/green with stable per-label URLs. It still needs a scripted smoke
test and a label swap, so it is no simpler than the runner-up. It would
be worth it if we wanted to test a revision by hand before promoting it.

## Consequences

- **Easier**: the workflow has one deploy step, there is no pin rule to
  check, and a failed revision cleans itself up.
- **Harder**: a failed deploy shows up in Azure (revision
  `provisioningState` / `healthState`), not as a failed smoke-test step
  in Actions. The deploy action's `update` returns before the revision
  is ready, so a red build no longer means "didn't ship". The workflow
  should wait on the revision's state so CI still goes red.
- **Harder**: rollback is not "move traffic to the old revision".
  Single-revision mode keeps one active revision, so rolling back means
  redeploying the previous image (`az containerapp update --image
  <previous-sha>`), which takes minutes instead of seconds.
- **Unverified**: how this interacts with min replicas 0. The platform
  needs a replica running to probe it, and we believe a new revision is
  started for provisioning regardless of min replicas. The
  broken-revision drill (`docs/specs/deploy.md` → Verify) must pass
  before this ADR is accepted.
- **Accepted tradeoff**: the probe checks only what `/api/health` checks:
  the process is up and the DB is reachable. It does not check Upstash
  Redis or sign-in; the smoke-test runbook covers those by hand.

## See also

- `docs/specs/deploy.md` — the deploy contract.
- `docs/runbooks/provision-production.md` — sets single-revision mode and the probes.
- `docs/runbooks/rollback-bad-deploy.md` — rollback as a redeploy of the previous image.
