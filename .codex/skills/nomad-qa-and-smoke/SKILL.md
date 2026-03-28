---
name: nomad-qa-and-smoke
description: Use when a Nomad change needs verification, smoke planning, regression review, or release-readiness checks. Covers the default build gates, UI smoke strategy, Playwright/manual fallback, and how to report findings and residual risk for Nomad apps and services.
---

# Nomad QA And Smoke

## Overview

This skill standardizes verification for Nomad work.
Use it to choose the smallest correct smoke path, collect evidence, and separate confirmed behavior from unverified risk.

## Trigger Conditions

Use this skill when:

1. a Nomad app or service changed;
2. UI behavior changed in `apps/nomad-aroma-web/` or `apps/nomad-master-web/`;
3. backend changes need endpoint or flow confirmation;
4. you need a release-oriented smoke checklist or handoff-quality findings.

## Workflow

1. Identify changed scope:
   map the change to one or more Nomad projects.
2. Run baseline gates:
   always run the relevant builds from [references/smoke-matrix.md](references/smoke-matrix.md).
3. Choose flow verification:
   use Playwright when the environment is ready; otherwise do a manual smoke and say so explicitly.
4. Capture evidence:
   store command results, screenshots, URLs, viewport, and any missing prerequisites.
5. Report findings:
   separate `verified`, `not verified`, and `blocked`.

## Required Output

Every QA pass should produce:

1. changed scope;
2. commands actually run;
3. flows actually checked;
4. findings or explicit statement that no findings were discovered;
5. residual risks, gaps, or environment blockers.

## Reporting Rules

1. Prefer concrete findings over general summaries.
2. State exact commands and affected project paths.
3. If a smoke path could not run, explain why and what remains unverified.
4. Do not claim release readiness when only build checks were executed.

## References

Read [references/smoke-matrix.md](references/smoke-matrix.md) for the default Nomad verification matrix.
