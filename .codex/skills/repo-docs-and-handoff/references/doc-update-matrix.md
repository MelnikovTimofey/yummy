# Repo Docs And Handoff Reference

## Documentation Decision Matrix

### Update `NOTES.md`

Update when:

1. behavior changed in a meaningful way;
2. workflow or operating rules changed;
3. a technical decision should remain discoverable beyond one commit.

### Update `HANDOFF.md`

Update when:

1. a logical block of work is completed;
2. verification results matter for future turns;
3. a human or another agent needs the compact delivery history.

### Update `AGENTS.md`

Update only when:

1. agent behavior rules changed;
2. repo-level guardrails changed;
3. the change affects how Codex or other agents must work by default.

### Update `WORKFLOW.md` or `WORKFLOW_NOMAD.md`

Update when:

1. execution order changed;
2. verification gates changed;
3. issue handling, active scope, or status protocol changed.

### Update `AI_DEVELOPMENT_PROCESS.md`

Update when:

1. the operating model changed;
2. role definitions changed;
3. skill lifecycle or repo skill standards changed.

### Update README files

Update when:

1. setup, run path, stage, or feature behavior changed;
2. a project-local workflow would otherwise become misleading.

Remember:

1. README files must remain in Russian;
2. interface copy must remain in Russian;
3. avoid updating docs that were not actually affected.
