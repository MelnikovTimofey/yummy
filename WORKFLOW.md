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
      BASE_BRANCH="${SOURCE_BASE_BRANCH:-main}"
      WORKSPACE_BRANCH="$(basename "$PWD")"
      git clone "$REPO_SOURCE" .
      git config user.name "${GIT_AUTHOR_NAME:-Codex Symphony}"
      git config user.email "${GIT_AUTHOR_EMAIL:-codex-symphony@example.com}"
      git config symphony.repoSource "$REPO_SOURCE"
      git config symphony.baseBranch "$BASE_BRANCH"
      git checkout -B "$WORKSPACE_BRANCH"
    after_run: |
      sh scripts/symphony_auto_merge_done.sh
    timeout_ms: 120000

agent:
  max_concurrent_agents: 1
  max_turns: 12

codex:
  command: /Applications/Codex.app/Contents/Resources/codex app-server
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

Use the baseline verification gate below. It must stay small enough for routine local runs and reproducible across tasks in the active scope.

Fast routine gate:
- If `YummyWeb/` changed: `cd YummyWeb && npm run build`
- If `backend/` changed: `cd backend && npm run build`
- If `services/catalog-updater/` changed: `cd services/catalog-updater && npm run build`
- If a task changes more than one active-scope project, run the matching build command in each changed project.

Expanded or manual checks:
- If UI behavior changed and the environment is ready: `cd YummyWeb && npm run e2e:smoke:chromium`
- If UI behavior changed but Playwright is not ready, do a manual browser smoke pass for the touched flow and state that limitation in the handoff.
- Backend behavior beyond `npm run build` remains manual unless the task updates an existing automated test.
- Catalog refresh, parser, or integration behavior beyond `npm run build` remains manual unless the task updates an existing automated test.

If pure helpers or parser logic changed:
- add or update local unit tests if a suitable test runner already exists
- if no test runner exists, state that gap explicitly in the handoff

Do not complete the task without listing the actual verification commands that were run.

## Status transition protocol

At task start:
- if the issue is in `Todo`, move it to `In Progress`
- use the available Linear GraphQL tool from Symphony to perform the transition
- do not postpone this transition until the end of the task
- if a new turn starts and the issue is still in `Todo`, treat that as unfinished protocol work and update the status first

At task finish:
- move the issue to `Human Review` only if the change is critical and requires explicit human review
- otherwise, if the task is small, safe, fully verified, and does not require human judgment, move it directly to `Done`
- `Done` is now an auto-merge trigger: after the agent exits, `hooks.after_run` tries to merge the issue branch into the source repo `main`
- if that auto-merge is blocked (for example dirty target repo, merge conflict, or missing tracker credentials), the hook should move the issue back to `Human Review`

Critical changes that require `Human Review`:
- architecture changes or cross-cutting refactors
- database, Prisma schema, migration, or seed flow changes
- auth, security, permissions, or environment variable changes
- new dependencies
- public API, route, contract, or data model changes
- large UI behavior changes or product-visible logic changes
- incomplete verification or unresolved risk
- any ambiguous change where human judgment is still required

Safe changes that may go directly to `Done` after checks:
- small refactors without behavior change
- local fixes with clear verification
- extraction of helpers or deduplication with no contract change
- documentation-only updates

Required implementation detail for status changes:
- Symphony exposes the `linear_graphql` dynamic tool
- use it to resolve the target state id from the issue team, then call `issueUpdate`

Example state lookup for the current issue team:

```graphql
query ResolveWorkflowState {
  issue(id: "{{ issue.id }}") {
    team {
      states(first: 20) {
        nodes {
          id
          name
        }
      }
    }
  }
}
```

Example transition mutation:

```graphql
mutation MoveIssue($issueId: String!, $stateId: String!) {
  issueUpdate(id: $issueId, input: { stateId: $stateId }) {
    success
  }
}
```

Use that protocol at least in these cases:
- start of work: `Todo` -> `In Progress`
- finish of a critical task: `In Progress` -> `Human Review`
- finish of a small safe task: `In Progress` -> `Done`
- if a previous turn completed but the issue is still in an active state only because status was not updated, fix the status before doing more work

## Documentation and operating docs

If the change affects repo rules, developer workflow, startup, handoff, or operating instructions:
- update `NOTES.md`
- update `HANDOFF.md`
- update `AGENTS.md` only if agent rules truly changed

If the task does not change repo rules or operations, do not edit those files without reason.

## Git and completion

- Make a commit after each logical block.
- Do not use destructive git commands.
- Do not manually merge `Done` tasks inside the Codex sandbox.
- `Done` tasks are merged automatically by `hooks.after_run` into the source repo base branch.
- Tasks that require `Human Review` must never be auto-merged.

Target final state:
- default final state for small safe tasks: `Done`
- use `Human Review` only for critical changes that require explicit human review
- if checks are incomplete, risk remains, or questions stay open: `Human Review`
- if the task cannot be completed safely without clarification: `Human Review`

## Final report format

The final report must include:
- what changed
- which files changed
- which verification commands were run
- which risks or gaps remain

If tracker access is available:
- leave a short issue comment
- move the task to `Human Review` only when the critical-review criteria above apply
- otherwise move it to `Done`
- do not leave the issue in `Todo` or `In Progress` after the work is already complete
