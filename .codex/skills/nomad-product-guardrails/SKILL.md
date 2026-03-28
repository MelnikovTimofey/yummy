---
name: nomad-product-guardrails
description: Use when a Nomad task changes product behavior, semantics, UI flow, onboarding, recommendations, access, or operational meaning. Helps validate the request against current Nomad PRD constraints, guest/staff boundaries, and non-negotiable product invariants before implementation.
---

# Nomad Product Guardrails

## Overview

This skill protects Nomad implementation from drifting away from the current PRD and documented product semantics.
Use it before changing any user-visible or operator-visible behavior in the Nomad contour.

## Trigger Conditions

Use this skill when:

1. the change touches guest flow, onboarding, recommendations, catalog, mix selection, or Master operations;
2. a feature request could reintroduce legacy Yummy behavior into Nomad;
3. there is doubt about the meaning of `Покурить`, access flow, guest auth, or recommendation logic;
4. you need to confirm whether the request is allowed by current Nomad docs.

## Workflow

1. Read product sources:
   load `PRD.md`, `AGENTS.md`, `NOMAD_IMPLEMENTATION_PLAN.md`, and the invariant reference file.
2. Classify the requested change:
   identify whether it affects `guest semantics`, `staff semantics`, `access`, `recommendations`, or `analytics meaning`.
3. Compare against invariants:
   confirm whether the request is already allowed, explicitly forbidden, or ambiguous.
4. Decide the outcome:
   proceed, stop, or escalate for product clarification.
5. Record the invariant:
   state which rule was preserved, changed, or found ambiguous.

## Required Output

Before product-facing implementation, produce:

1. affected product area;
2. governing invariant;
3. decision: `allowed`, `forbidden`, or `needs clarification`;
4. follow-up doc updates required if semantics change.

## Stop Conditions

Stop and escalate when:

1. the request would add auth, favorites, profile, or smoking sessions back into `Арома Ателье`;
2. `Покурить` is being reinterpreted as a user session instead of an analytical choice event;
3. recommendations stop depending on onboarding or available inventory;
4. guest and staff responsibilities become blurred.

## References

Read [references/invariants.md](references/invariants.md) for the current Nomad product rules.
