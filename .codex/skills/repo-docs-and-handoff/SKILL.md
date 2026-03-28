---
name: repo-docs-and-handoff
description: Use when a change may require updates to `NOTES.md`, `HANDOFF.md`, `AGENTS.md`, `WORKFLOW.md`, `WORKFLOW_NOMAD.md`, `AI_DEVELOPMENT_PROCESS.md`, or app README files. Helps decide which operational docs must change, how to record the change cleanly, and how to keep repo instructions synchronized.
---

# Repo Docs And Handoff

## Overview

This skill governs documentation updates after meaningful repository changes.
Use it to keep operating docs, handoff history, and app-facing documentation synchronized with the actual implementation and process rules.

## Trigger Conditions

Use this skill when:

1. product behavior changed;
2. repo rules, workflow, startup, release, or handoff process changed;
3. a README, process doc, or operating instruction may now be stale;
4. you need to decide whether `NOTES.md`, `HANDOFF.md`, or `AGENTS.md` must be updated.

## Workflow

1. Classify the change:
   decide whether it is `feature`, `process`, `workflow`, `runbook`, or `docs-only`.
2. Apply the doc matrix:
   use [references/doc-update-matrix.md](references/doc-update-matrix.md) to determine required updates.
3. Update the minimum correct set:
   change only the docs affected by the actual behavior or rule change.
4. Keep style aligned:
   repository docs and README files remain in Russian where required by `AGENTS.md`.
5. Write the handoff clearly:
   record request, implementation, checks, and effect without changelog noise.

## Required Output

For each non-trivial change, decide explicitly:

1. which docs were updated;
2. which docs were intentionally left unchanged;
3. what verification was run;
4. what residual documentation gap remains, if any.

## Stop Conditions

Stop and reassess when:

1. the requested change would silently alter repo policy without updating process docs;
2. a README would need to contradict `AGENTS.md`;
3. the implementation changed but no handoff or notes entry can explain it clearly.

## References

Read [references/doc-update-matrix.md](references/doc-update-matrix.md) for the repo documentation decision matrix.
