---
name: nomad-aroma-web-delivery
description: Use when implementing, reviewing, or refining frontend work in `apps/nomad-aroma-web`. Covers the guest mobile-first flow for `Арома Ателье`, current UI invariants, product-safe scope, and the minimum verification path for recommendations, showcase, catalog, and selected-mix interactions.
---

# Nomad Aroma Web Delivery

## Overview

This skill standardizes frontend work for the guest product `Арома Ателье`.
Use it to keep the flow mobile-first, product-safe, and consistent with the current Nomad UX contract.

## Trigger Conditions

Use this skill when:

1. editing files in `apps/nomad-aroma-web/`;
2. changing guest flow, onboarding, recommendations, showcase, catalog, or mix-card behavior;
3. adjusting mobile layout, filters, intro, tabs, or selected-mix handoff UX;
4. reviewing whether a UI proposal conflicts with current Nomad product rules.

## Workflow

1. Load context:
   read `AGENTS.md`, `AI_DEVELOPMENT_PROCESS.md`, `WORKFLOW_NOMAD.md`, and the guest-flow reference file.
2. Validate product boundaries:
   confirm that the change still matches the guest product model for `Арома Ателье`.
3. Frame the slice:
   identify whether this is `access`, `intro`, `onboarding`, `recommendations`, `showcase`, `catalog`, or `visual polish`.
4. Preserve UX invariants:
   keep the flow mobile-first, in Russian, and aligned with the current guest journey.
5. Implement the smallest correct change:
   avoid mixing broad visual redesign, product semantic changes, and multi-screen rewrites in one slice.
6. Verify:
   run the relevant checks from [references/guest-flow-checklist.md](references/guest-flow-checklist.md).

## Required Output

For each UI slice, produce:

1. changed guest-flow stage;
2. preserved or updated invariant;
3. verification commands and smoke path actually run;
4. residual UX risk or unverified viewport/state.

## Stop Conditions

Stop and escalate when:

1. the requested change reintroduces user auth, favorites, profile, or smoking sessions into `Арома Ателье`;
2. `Покурить` or `Выбрать` semantics are being changed without product approval;
3. the task mixes broad product-flow changes with unrelated visual restyling;
4. the implementation would couple Aroma UI to legacy runtime paths.

## References

Read [references/guest-flow-checklist.md](references/guest-flow-checklist.md) for the current frontend invariants and smoke path.
