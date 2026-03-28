---
name: nomad-accessibility-review
description: Use when a Nomad UI change needs an accessibility review for focus order, keyboard reachability, contrast, readable copy, form labels and errors, role-sensitive access surfaces, or mobile readability. Applies to both `apps/nomad-aroma-web` and `apps/nomad-master-web` before sign-off or after a UI change.
---

# Nomad Accessibility Review

## Overview

This skill is for accessibility-focused UI review, not for feature delivery.
Use it to check whether a Nomad screen remains keyboard-usable, readable, and role-safe after a UI change.

## Trigger Conditions

Use this skill when:

1. `apps/nomad-aroma-web/` or `apps/nomad-master-web/` changed;
2. form controls, tabs, modals, filters, login flows, or mobile layout changed;
3. a task is described as `a11y review`, `accessibility pass`, `keyboard check`, or `readability check`;
4. a visual polish task might also have affected contrast, focus, labels, or mobile legibility.

## Review Workflow

1. Identify the surface:
   classify the target as `Aroma`, `Master`, or a shared Nomad interaction.
2. Load context:
   read the relevant frontend README and the accessibility checklist reference.
3. Check keyboard path:
   verify tab order, focus visibility, reachable controls, and modal/button flow.
4. Check semantics:
   verify labels, input meaning, error text, and role-relevant actions.
5. Check readability:
   review contrast, readable copy, helper text clarity, and mobile text density.
6. Check role-sensitive UI:
   make sure `Master` keeps admin-only data restricted and visually understandable.
7. Report findings:
   list concrete accessibility problems first, or explicitly state that no issues were found.

## Review Axes

Always review these axes:

1. focus order and visible focus;
2. keyboard reachability of primary flows;
3. contrast and readable copy;
4. form labels, helper text, and error messages;
5. mobile readability in `Aroma`;
6. role-sensitive access surfaces in `Master`.

## Required Output

Produce one of two outcomes:

1. findings:
   ordered list of concrete accessibility issues with screen and impact.
2. no findings:
   explicit statement that no accessibility issues were found, plus any residual unverified state or viewport.

## Reporting Rules

1. Tie each finding to a concrete failure mode: unreachable control, unclear label, unreadable contrast, or role confusion.
2. Keep visual style findings separate unless they directly create an accessibility problem.
3. If verification was partial, say which state, viewport, or flow was not checked.

## References

Read [references/accessibility-checklist.md](references/accessibility-checklist.md) for the current Nomad accessibility review checklist.
