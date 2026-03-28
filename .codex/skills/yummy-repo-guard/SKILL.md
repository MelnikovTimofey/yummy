---
name: yummy-repo-guard
description: Use when starting work in this repository, when scope or contour is unclear, or before changing repo-level process/docs. Helps classify the task into legacy Yummy or Nomad, validate allowed paths, choose safe reuse strategy, and decide whether single-agent, multi-agent, or Symphony is appropriate.
---

# Yummy Repo Guard

## Overview

This skill is the entry guard for repository work in `Yummy + Nomad parallel track`.
Use it to avoid contour mixing, unsafe reuse from legacy, and premature multi-agent execution.

## Trigger Conditions

Use this skill when at least one condition is true:

1. the request touches repo structure, process, workflow, or agent rules;
2. it is not obvious whether the task belongs to `legacy Yummy` or `Nomad`;
3. the change may span more than one app or service;
4. you want to decide whether reuse should be `copy with adaptation`, `extract shared module`, or `keep separate`;
5. you plan to use multi-agent or Symphony.

## Workflow

1. Identify the contour:
   classify the task as `legacy Yummy`, `Nomad`, or `repo-level`.
2. Read the governing docs:
   always read `AGENTS.md` and `AI_DEVELOPMENT_PROCESS.md`, then load contour-specific docs from [references/source-map.md](references/source-map.md).
3. Validate allowed scope:
   confirm which directories may be changed and which must remain untouched.
4. Decide reuse policy:
   explicitly choose `copy with adaptation`, `extract shared module`, or `keep separate`.
5. Choose execution mode:
   decide between single-agent, multi-agent, and Symphony based on the current contract stability.
6. Define the task frame:
   write down goal, write scope, verification path, and blockers before implementation.

## Required Output

Produce a short working frame before substantive changes:

1. contour;
2. active scope;
3. forbidden paths for this task;
4. reuse decision;
5. execution mode;
6. verification path;
7. open questions that require human review.

## Stop Conditions

Stop and escalate instead of deciding silently when:

1. the task would repurpose legacy code for Nomad without explicit approval;
2. schema, auth, public API, or repo structure changes are bundled together;
3. two agents would need the same write scope;
4. the product interpretation conflicts with `PRD.md` or `AGENTS.md`.

## References

Read [references/source-map.md](references/source-map.md) for the repo decision map and governing documents.
