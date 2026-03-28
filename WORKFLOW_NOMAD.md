---
tracker:
  kind: linear
  api_key: "$LINEAR_API_KEY"
  project_slug: "noman-yummy-f37a4787dbf5"

workspace:
  root: "~/codex-workspaces/yummy-nomad-symphony"
  hooks:
    after_create: |
      set -eu
      REPO_SOURCE="${SOURCE_REPO_URL:-/Users/admin/PycharmProjects/yummy}"
      BASE_BRANCH="${SOURCE_BASE_BRANCH:-codex/nomad-parallel-track}"
      WORKSPACE_BRANCH="$(basename "$PWD")"
      git clone "$REPO_SOURCE" .
      git config user.name "${GIT_AUTHOR_NAME:-Codex Symphony}"
      git config user.email "${GIT_AUTHOR_EMAIL:-codex-symphony@example.com}"
      git config symphony.repoSource "$REPO_SOURCE"
      git config symphony.baseBranch "$BASE_BRANCH"
      git checkout "$BASE_BRANCH"
      git checkout -B "$WORKSPACE_BRANCH"
    timeout_ms: 120000

agent:
  max_concurrent_agents: 1
  max_turns: 14

codex:
  command: /Applications/Codex.app/Contents/Resources/codex app-server
  approval_policy: never
  thread_sandbox: workspace-write
---

# Nomad Symphony Workflow

Current issue:
- Issue: `{{ issue.identifier }}`
- Title: `{{ issue.title }}`
- Attempt: `{{ attempt }}`

Issue description:

{{ issue.description }}

## Goal

Этот workflow обслуживает только Nomad parallel track и не должен использоваться для legacy `Yummy`.

## Required order of work

1. Read the root `AGENTS.md` first.
2. Read `AI_DEVELOPMENT_PROCESS.md` before using multi-agent, Symphony batching, or changing skill/process rules.
3. Read `.github/NOMAD_REVIEW_POLICY.md` before changing Nomad GitHub workflow, PR policy, labels, CODEOWNERS, or CI governance.
4. Read `NOMAD_PARALLEL_EXECUTION_PLAN.md` before making architecture or repo-structure decisions.
5. Read `NOMAD_ROADMAP.md` before choosing issue priority or batching work.
6. Read `CONTRIBUTING_NOMAD.md` before changing Nomad startup, task intake, handoff templates, or solo-agent operating flow.
7. Use `docs/templates/ai-task-brief.md` and `docs/templates/agent-handoff.md` when the task needs a formal intake or a structured handoff.
8. Work only inside the current Nomad issue scope.
9. If the task is ambiguous or requires a repo-level or architecture decision, do not decide silently.
   Stop, explain the question or options, and hand off to `Human Review`.
10. Keep changes small and vertical. Prefer scaffold completion and bounded slices over broad rewrites.

## Roadmap-driven execution

Symphony should follow `NOMAD_ROADMAP.md`, not invent its own priority order.

Preferred batch order:
- `Batch 1`: `Release Foundation`
- `Batch 2`: `Master Operations`
- `Batch 3`: `Analytics And Rails`
- `Batch 4`: `Quality And Hardening`
- `Batch 5`: `Aroma Polish`

Preferred task granularity:
- `1 issue = 1 bounded context = 1 clear verification result`
- default scope should be one Nomad app/service at a time
- use cross-app issues only when an integration step is truly needed after smaller issues are complete

Do not use Symphony for:
- repo-wide architecture decisions
- large schema/auth/UI/infra changes in one issue
- legacy repurposing
- premature shared-package extraction

## Active scope

Default priority:
- `apps/nomad-aroma-web/`
- `apps/nomad-master-web/`
- `apps/nomad-backend/`

Secondary scope only when the issue explicitly requires it:
- `services/nomad-telegram-bot/`
- `NOMAD_IMPLEMENTATION_PLAN.md`
- `NOMAD_PARALLEL_EXECUTION_PLAN.md`
- `WORKFLOW_NOMAD.md`

Do not touch legacy paths unless the issue explicitly requires extract/reuse:
- `YummyWeb/`
- `backend/`
- `services/catalog-updater/`
- `Yummy/`
- `YummyExpo/`
- `ml/`

## Repository rules

- Follow `KISS > premature optimization`.
- Do not add dependencies without explicit justification in the final report.
- UI strings must remain in Russian.
- `README.md` files must remain in Russian.
- Do not silently repurpose legacy `Yummy` runtime paths for Nomad.
- For tobacco catalog data, keep this split:
  - `flavorProfiles` - categories
  - `flavors` - flavors
  - `flavorTags` - meta tags only

## Expected change types

Preferred:
- scaffold completion
- local feature slices in Nomad apps
- small refactors inside a single Nomad bounded context
- contract-first backend work
- developer workflow improvements for Nomad

Avoid without explicit confirmation:
- large cross-app rewrites
- shared package extraction before duplication is understood
- schema changes that couple Nomad and legacy
- tracker/workflow changes outside Nomad scope

## Checks before handoff

Run only relevant checks.

Fast routine gate:
- If `apps/nomad-aroma-web/` changed: `cd apps/nomad-aroma-web && npm run build`
- If `apps/nomad-master-web/` changed: `cd apps/nomad-master-web && npm run build`
- If `apps/nomad-backend/` changed: `cd apps/nomad-backend && npm run build`
- If `services/nomad-telegram-bot/` changed: `cd services/nomad-telegram-bot && npm run build`

If a task changes more than one Nomad project, run the matching build command in each changed project.

Expanded checks:
- If Nomad UI behavior changed and the environment is ready, run a targeted browser smoke for the touched flow.
- If `tests/nomad-smoke/` is available and the local stack is up, prefer `cd tests/nomad-smoke && npm run smoke`.
- If automated browser checks are unavailable, do a manual smoke pass and say so in the handoff.
- Backend behavior beyond build remains manual unless an automated test is explicitly added.

Do not complete the task without listing the actual verification commands that were run.

## Status transition protocol

At task start:
- if the issue is in `Todo`, move it to `In Progress`

At task finish:
- default final state for Nomad tasks: `Human Review`
- use `Done` only for clearly safe documentation-only changes or tiny isolated fixes
- do not rely on auto-merge; this workflow intentionally has no merge hook

Critical changes that require `Human Review`:
- architecture changes
- new dependencies
- schema, auth, permissions, or environment variable changes
- public API or contract changes
- repo structure changes
- incomplete verification or unresolved product risk

## Documentation and operating docs

If the change affects Nomad repo rules, workflow, startup, handoff, or operating instructions:
- update `NOTES.md`
- update `HANDOFF.md`
- update `AGENTS.md` only if agent rules truly changed
- update `AI_DEVELOPMENT_PROCESS.md` if the AI operating model or skill lifecycle changed
- update `.github/NOMAD_REVIEW_POLICY.md` if Nomad GitHub governance changed
- update `CONTRIBUTING_NOMAD.md` if local startup, task intake, smoke, or solo-agent flow changed

## Git and completion

- Make a commit after each logical block.
- Do not use destructive git commands.
- Do not auto-merge Nomad work into `main`.
- Use `codex/nomad-parallel-track` as the default base branch unless the issue explicitly requires another branch.

## Final report format

The final report must include:
- what changed
- which files changed
- which verification commands were run
- which risks or gaps remain
