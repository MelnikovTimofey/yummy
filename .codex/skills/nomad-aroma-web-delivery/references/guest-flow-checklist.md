# Nomad Aroma Web Delivery Reference

## Current Guest Flow

The intended journey is:

1. `18+` gate
2. daily code
3. intro
4. onboarding
5. recommendations
6. showcase
7. rail view
8. catalog
9. selected mix handoff for the master

## Product Invariants

1. `Арома Ателье` is a guest product without user authorization.
2. Do not add favorites, user profile, or smoking sessions unless docs explicitly change.
3. `Выбрать микс` is an explicit CTA; analytics and selection semantics must remain intentional.
4. UI and copy stay in Russian.
5. Layout remains mobile-first.

## Frontend Verification Path

Run what matches the change:

1. `cd apps/nomad-aroma-web && npm run build`
2. manual smoke on the touched flow
3. targeted Playwright smoke when the environment is ready

For manual smoke, record:

1. URL;
2. viewport;
3. stage of the flow;
4. what was actually verified.

## Common Risk Areas

1. intro appearing at the wrong time;
2. selected mix getting lost in long mobile scroll;
3. catalog CTA placement becoming inaccessible on mobile;
4. modal interactions accidentally changing analytics semantics.
