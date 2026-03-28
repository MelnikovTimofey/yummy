---
name: nomad-ui-visual-review
description: Use when a Nomad UI change needs visual review for consistency, style alignment, hierarchy, spacing, typography, palette, and overall polish. Applies to both `apps/nomad-aroma-web` and `apps/nomad-master-web`, and helps detect when a screen looks locally acceptable but globally inconsistent with the established Nomad visual language.
---

# Nomad UI Visual Review

## Overview

This skill is for reviewing UI visually, not for implementing features.
Use it to assess whether a Nomad screen remains visually coherent with the current product style, layout rhythm, and interaction polish.

## Trigger Conditions

Use this skill when:

1. a Nomad frontend screen, modal, topbar, filter block, card, or action row changed;
2. a task is described as `visual polish`, `style pass`, `consistency check`, or `UI cleanup`;
3. the UI works functionally, but there is doubt about hierarchy, rhythm, palette, typography, or component consistency;
4. you need a review pass before sign-off on `apps/nomad-aroma-web/` or `apps/nomad-master-web/`.

## Review Workflow

1. Load visual context:
   read the relevant frontend README and the visual reference file.
2. Identify the surface:
   classify the review target as `Aroma`, `Master`, or `shared Nomad language`.
3. Check local consistency:
   review the changed screen against its own nearby components and states.
4. Check cross-screen consistency:
   review whether the change still matches the wider visual system of the same app.
5. Check product-specific style:
   confirm whether the screen matches the intended character of `Арома Ателье` or `Мастера`.
6. Check interaction polish:
   verify alignment, action emphasis, mobile readability, modal rhythm, and state clarity.
7. Report findings:
   list concrete visual problems first, or explicitly state that no visual inconsistencies were found.

## Review Axes

Always review at least these axes:

1. hierarchy:
   primary vs secondary actions, header emphasis, information density.
2. spacing and rhythm:
   padding, gaps, vertical cadence, alignment, sticky blocks, mobile action placement.
3. typography:
   heading/body contrast, label weight, consistency of serif/display usage where intended.
4. palette and contrast:
   whether colors match the product tone and remain readable.
5. component consistency:
   whether buttons, chips, cards, tabs, filters, and modals still look like the same system.
6. state polish:
   loading, empty, error, selected, disabled, and hover/focus states when visible.

## Required Output

Produce one of two outcomes:

1. findings:
   ordered list of concrete visual inconsistencies with location and impact.
2. no findings:
   explicit statement that no visual inconsistencies were discovered, plus any residual risk such as unreviewed viewport or state.

## Reporting Rules

1. Prefer specific findings over broad adjectives like `looks off`.
2. Tie each finding to a visual system problem: hierarchy, rhythm, contrast, consistency, or product tone.
3. Separate `Aroma` guest-style issues from `Master` operational-style issues.
4. Do not mix product-semantic issues into a visual review unless the semantic problem manifests visually and must be flagged for escalation.

## References

Read [references/visual-checklist.md](references/visual-checklist.md) for the current Nomad visual review checklist and product tone map.
