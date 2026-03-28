---
name: nomad-task-intake
description: Use when the user wants help shaping a Nomad development task and needs the agent to ask for missing fields, normalize scope, and return a clean task brief before implementation.
---

# Nomad Task Intake

Use this skill when a user wants to formulate a development task for the Nomad contour and expects the agent to guide intake instead of jumping straight into implementation.

This skill is for brief formation, not for execution. Stop after producing the normalized brief unless the user explicitly asks to continue.

## When to use

Use this skill when:

- the user asks to "formulate a task", "help write a brief", "ask me by template", or similar;
- the task is still vague and key delivery constraints are missing;
- the user wants a reusable intake flow before handing work to Codex or another agent.

Do not use this skill when:

- the task is already specific enough to implement safely;
- the user clearly asks to execute an already-bounded change right now.

## Required output fields

The resulting brief must cover:

1. `Goal`
2. `Contour`
3. `Scope`
4. `Out of scope`
5. `Expected result`
6. `Constraints`
7. `Checks`
8. `Human review needed`

Use [docs/templates/ai-task-brief.md](/Users/admin/PycharmProjects/yummy/docs/templates/ai-task-brief.md) as the canonical output shape.

## Workflow

1. Inspect the user's request and determine which fields are already known.
2. Ask only for the missing fields that block safe implementation.
3. Keep questions short and concrete. Prefer one compact round over a long questionnaire dump.
4. If the user already mentioned a path, reuse it as the starting point for `Scope`.
5. If the user explicitly says `Nomad`, default `Contour` to `Nomad`.
6. Force explicit clarification for risky areas:
   - unclear `Scope` or `Out of scope`;
   - missing `Checks`;
   - changes touching schema, auth, env, runtime, cross-app integration, process docs, or `.github`.
7. If the task is local and low-risk, fill safe defaults instead of blocking on every field.
8. Return one normalized brief in final form and stop there.

## Questioning rules

- Ask short, direct questions in Russian.
- Do not ask about fields the user already specified.
- If the user wants speed, state assumptions explicitly and produce the brief.
- If the task mixes `Nomad` and `legacy Yummy`, ask to split the task or clearly choose one contour.
- If the task is broader than one bounded context, ask for the first vertical slice instead of accepting "redo everything".

## Human review escalation

Ask explicitly whether `Human review needed` should be `yes` when the task touches:

- `apps/nomad-backend/prisma/**`
- auth or access model
- env/runtime/deploy behavior
- `.github/**`
- `.codex/skills/**`
- `AGENTS.md`
- `AI_DEVELOPMENT_PROCESS.md`
- `WORKFLOW_NOMAD.md`

If none of the above apply and the change is local, you may default to `Human review needed: no`.

## Safe defaults

Use [references/intake-checklist.md](references/intake-checklist.md) for defaults and escalation cases.

Typical defaults:

- `Contour: Nomad` when the user explicitly talks about Nomad.
- `Human review needed: no` for local UI or backend slices without schema/auth/env/runtime/process changes.
- Default checks by scope:
  - `apps/nomad-aroma-web`: `cd apps/nomad-aroma-web && npm run build`
  - `apps/nomad-master-web`: `cd apps/nomad-master-web && npm test && npm run build`
  - `apps/nomad-backend`: `cd apps/nomad-backend && npm test && npm run build`
  - UI/integration change: `cd tests/nomad-smoke && npm run smoke`

## Output contract

Return the brief in a compact Markdown form that matches the repo template.

Do not add implementation steps, code, or architectural decisions unless the user asks for them after the brief is formed.
