---
name: nomad-master-web-delivery
description: Use when implementing, reviewing, or refining frontend work in `apps/nomad-master-web`. Covers the staff/admin operational console, role boundaries, CRUD surfaces for access, inventory, mixes, rails, Telegram operations, and the minimum verification path for Master UI changes.
---

# Nomad Master Web Delivery

## Overview

This skill standardizes frontend work for the staff/admin product `Мастер`.
Use it to keep operational UI changes bounded, role-aware, and aligned with the current Master console structure.

## Trigger Conditions

Use this skill when:

1. editing files in `apps/nomad-master-web/`;
2. changing login, dashboard, inventory, mixes, rails, access, audit trail, or Telegram admin UI;
3. adjusting staff/admin permissions or visibility in the frontend shell;
4. reviewing whether a Master UI change still fits the current operational model.

## Workflow

1. Load context:
   read `AGENTS.md`, `AI_DEVELOPMENT_PROCESS.md`, `WORKFLOW_NOMAD.md`, and the master reference file.
2. Frame the slice:
   identify whether the change is `auth`, `dashboard`, `inventory`, `mixes`, `rails`, `access`, `telegram`, or `audit`.
3. Validate role boundaries:
   confirm whether the change is staff-visible, admin-only, or shared.
4. Keep the console operational:
   prefer clarity, CRUD consistency, and bounded UI changes over generic visual experimentation.
5. Implement:
   make the smallest frontend change that preserves current shell and module boundaries.
6. Verify:
   run the relevant checks from [references/master-checklist.md](references/master-checklist.md).

## Required Output

For each Master slice, produce:

1. affected module;
2. affected role boundary;
3. verification commands and checked flows;
4. operational risk that remains unverified.

## Stop Conditions

Stop and escalate when:

1. role boundaries are changing but backend or product rules are not aligned;
2. staff/admin access semantics are ambiguous;
3. a broad console redesign is bundled with operational behavior changes;
4. the requested change would blur Master and guest product responsibilities.

## References

Read [references/master-checklist.md](references/master-checklist.md) for the current module map and verification path.
