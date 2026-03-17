---
tracker:
  kind: linear
  api_key: "$LINEAR_API_KEY"
  project_slug: "noman-yummy-f37a4787dbf5"

workspace:
  root: "~/codex-workspaces/yummy-symphony"
  hooks:
    after_create: |
      set -eu
      REPO_SOURCE="${SOURCE_REPO_URL:-/Users/admin/PycharmProjects/yummy}"
      git clone "$REPO_SOURCE" .
      git config user.name "${GIT_AUTHOR_NAME:-Codex Symphony}"
      git config user.email "${GIT_AUTHOR_EMAIL:-codex-symphony@example.com}"

agent:
  max_concurrent_agents: 1
  max_turns: 12

codex:
  command: codex app-server
  approval_policy: never
  thread_sandbox: workspace-write
---

# Yummy Symphony Workflow

Current issue:
- Issue: `{{ issue.identifier }}`
- Title: `{{ issue.title }}`
- Attempt: `{{ attempt }}`

Issue description:

{{ issue.description }}

## Goal

Symphony in this repository must handle only small and safe tasks.
The main goal is predictable delivery in the active path: `YummyWeb`, `backend`, `services/catalog-updater`.

## Required order of work

1. Read the root `AGENTS.md` first.
2. Work only within the current issue scope.
3. If the task touches product logic, UI copy, or catalog structure, follow the invariants from `AGENTS.md`.
4. If the task is ambiguous or requires an architectural choice, do not decide silently.
   Stop, explain the question or options, and hand off to `Human Review`.
5. Keep changes small. Prefer extraction, deduplication, and local simplification over large rewrites.

## Active scope

Default priority:
- `YummyWeb/` - main mobile-first web client
- `backend/` - main Fastify API
- `services/catalog-updater/` - catalog update service

Do not touch `Yummy/`, `YummyExpo/`, or `ml/` unless the issue explicitly requires it.

## Repository rules

- Follow `KISS > premature optimization`.
- Do not add dependencies without explicit justification in the final report.
- Do not change architecture unless the issue clearly requires it.
- UI strings must remain in Russian.
- `README.md` files must remain in Russian.
- For tobacco catalog data, keep this split:
  - `flavorProfiles` - categories
  - `flavors` - flavors
  - `flavorTags` - meta tags only
- Do not rename public APIs, routes, env vars, or Prisma entities without an explicit requirement.

## Expected change types

Preferred:
- small refactors without behavior change
- local bug fixes
- extraction of testable business logic
- removal of duplication
- improvements to checks and developer workflow

Avoid without explicit confirmation:
- large file moves
- new state management
- library swaps
- schema changes
- unrelated changes across multiple subprojects

## Checks before handoff

Run only relevant checks.

If `YummyWeb/` changed:
- `cd YummyWeb && npm run build`
- if UI behavior changed and the environment is ready: `cd YummyWeb && npm run e2e:chromium`

If `backend/` changed:
- `cd backend && npm run build`

If `services/catalog-updater/` changed:
- `cd services/catalog-updater && npm run build`

If pure helpers or parser logic changed:
- add or update local unit tests if a suitable test runner already exists
- if no test runner exists, state that gap explicitly in the handoff

Do not complete the task without listing the actual verification commands that were run.

## Documentation and operating docs

If the change affects repo rules, developer workflow, startup, handoff, or operating instructions:
- update `NOTES.md`
- update `HANDOFF.md`
- update `AGENTS.md` only if agent rules truly changed

If the task does not change repo rules or operations, do not edit those files without reason.

## Git and completion

- Make a commit after each logical block.
- Do not use destructive git commands.
- Do not auto-merge or auto-land the task.

Target final state:
- default handoff target: `Human Review`
- if checks are incomplete, risk remains, or questions stay open: `Human Review`
- if the task cannot be completed safely without clarification: `Human Review`

## Final report format

The final report must include:
- what changed
- which files changed
- which verification commands were run
- which risks or gaps remain

If tracker access is available, leave a short issue comment and move the task to `Human Review`.
