# Nomad Product Guardrails Reference

## Core Sources

1. `PRD.md`
2. `AGENTS.md`
3. `NOMAD_IMPLEMENTATION_PLAN.md`
4. `NOMAD_PARALLEL_EXECUTION_PLAN.md`
5. `NOMAD_ROADMAP.md`

## Non-Negotiable Invariants

1. `Арома Ателье` is a guest product without user authorization.
2. Do not return favorites, user profile, or smoking sessions unless docs explicitly change.
3. `Покурить` is an analytics event for choosing a mix, not a user smoking session.
4. Recommendations must depend on onboarding choices and inventory presence.
5. Nomad evolves in parallel and must not silently repurpose legacy `YummyWeb/` or `backend/`.

## Decision Labels

1. `allowed`
   current docs already support the change.
2. `forbidden`
   current docs explicitly disallow the change.
3. `needs clarification`
   docs do not resolve the product meaning cleanly.

## Typical Ambiguities To Escalate

1. returning persistent guest identity to `Арома Ателье`;
2. changing selection semantics from analytics to session tracking;
3. reducing recommendation inputs to static or ruleless behavior;
4. sharing runtime, schema, or product DB between legacy and Nomad.
