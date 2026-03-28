---
name: nomad-release-ops
description: Use when planning, reviewing, or updating Nomad environment setup, deployment, runtime operations, Telegram bot provisioning, bootstrap admin flow, or release-readiness checks. Covers env ownership, rollout smoke, rollback attention points, and operational stop conditions.
---

# Nomad Release Ops

## Overview

This skill standardizes operational work for running Nomad outside local development.
Use it for env matrix changes, deployment prep, runtime checks, Telegram bot operations, and rollout smoke planning.

## Trigger Conditions

Use this skill when:

1. changing env vars, deployment notes, runtime configuration, or secret ownership;
2. touching `services/nomad-telegram-bot/` operational behavior;
3. updating bootstrap admin flow or backend automation access;
4. preparing or reviewing release readiness for Nomad.

## Workflow

1. Load ops context:
   read `NOMAD_ENV_MATRIX.md`, `NOMAD_DEPLOYMENT_SMOKE_CHECKLIST.md`, and the release reference file.
2. Classify the ops change:
   identify whether it affects `backend`, `aroma web`, `master web`, `bot`, or `bootstrap`.
3. Validate secret and runtime boundaries:
   confirm that Nomad secrets stay isolated from legacy and that ownership is clear.
4. Define rollout checks:
   choose the minimum smoke path needed for the changed runtime surface.
5. Record rollback attention points:
   note the condition that should stop rollout and trigger human review or incident handling.

## Required Output

For each ops change, produce:

1. affected runtime surface;
2. env or secret impact;
3. rollout checks to run;
4. stop conditions;
5. rollback or recovery note if the change is risky.

## Stop Conditions

Stop and escalate when:

1. production secrets are unclear, shared with legacy, or proposed for commit;
2. bot and backend automation tokens are out of sync;
3. bootstrap admin is being treated as a seed-only concern in production;
4. release readiness is claimed without backend, frontend, and bot smoke where applicable.

## References

Read [references/release-checklist.md](references/release-checklist.md) for the runtime matrix and rollout checklist.
