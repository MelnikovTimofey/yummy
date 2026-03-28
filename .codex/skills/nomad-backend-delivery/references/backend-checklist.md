# Nomad Backend Delivery Reference

## Backend Slice Types

### Contract slice

Examples:

1. response payload changes;
2. endpoint shape or validation changes;
3. new fields for frontend rendering.

Minimum discipline:

1. define caller;
2. define payload;
3. define compatibility impact;
4. verify dependent UI if necessary.

### Content or state slice

Examples:

1. intro cards;
2. home rails;
3. recommendation data;
4. seeded operational content.

Minimum discipline:

1. preserve product semantics from `PRD.md` and `AGENTS.md`;
2. keep logic testable;
3. confirm no legacy behavior leaked into Nomad.

## Verification Path

Run what matches the change:

1. `cd apps/nomad-backend && npm test`
2. `cd apps/nomad-backend && npm run build`
3. targeted endpoint check such as `curl -s http://localhost:3021/...`

If the backend contract is consumed by a Nomad UI, also run the matching build:

1. `cd apps/nomad-aroma-web && npm run build`
2. `cd apps/nomad-master-web && npm run build`

## Split Rules

Safe to separate:

1. backend implementation and read-only explorer research;
2. backend contract preparation and frontend shell work, if the contract is already fixed;
3. backend slice and QA verification after implementation stabilizes.

Unsafe to separate:

1. two workers editing the same backend module;
2. schema and auth redesign in parallel;
3. backend logic and repo-level architecture changes in one batch.
