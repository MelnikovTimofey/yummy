---
name: nomad-backend-delivery
description: Use when implementing, reviewing, or refactoring backend work in `apps/nomad-backend` or closely related Nomad backend contracts. Covers contract-first delivery, bounded backend scope, and the minimum verification path for Nomad APIs, content, recommendations, state, and operational backend slices.
---

# Nomad Backend Delivery

## Overview

This skill standardizes backend work inside the Nomad contour.
Use it to keep backend slices contract-first, bounded, testable, and aligned with Nomad product rules.

## Trigger Conditions

Use this skill when:

1. editing files in `apps/nomad-backend/`;
2. changing Nomad API contracts, payloads, seeds, content, recommendation logic, or state handling;
3. touching backend behavior consumed by `apps/nomad-aroma-web`, `apps/nomad-master-web`, or `services/nomad-telegram-bot`;
4. reviewing whether a backend task is safe to split across agents.

## Workflow

1. Load context:
   read `AGENTS.md`, `AI_DEVELOPMENT_PROCESS.md`, `WORKFLOW_NOMAD.md`, and the backend-specific reference file.
2. Frame the slice:
   identify request type: `contract`, `content`, `domain logic`, `endpoint`, or `ops`.
3. Freeze the contract first:
   define payload shape, invariants, and caller expectations before code edits.
4. Keep scope bounded:
   prefer one backend slice at a time and avoid mixing schema, auth, and broad infra changes.
5. Implement:
   make the smallest backend change that satisfies the current vertical slice.
6. Verify:
   run the relevant commands from [references/backend-checklist.md](references/backend-checklist.md).
7. Record risk:
   call out manual follow-up if an automated test or live smoke could not be run.

## Required Output

For each backend task, produce:

1. touched contract or invariant;
2. write scope;
3. verification commands actually run;
4. residual risk or manual follow-up;
5. whether frontend consumers need synchronized updates.

## Stop Conditions

Stop and escalate when:

1. the task requires a new dependency without clear approval;
2. backend and frontend contract changes are still unresolved;
3. the change would couple Nomad and legacy data models;
4. the requested slice includes architecture, schema, auth, and runtime changes at once.

## References

Read [references/backend-checklist.md](references/backend-checklist.md) for the delivery checklist and routine verification path.
