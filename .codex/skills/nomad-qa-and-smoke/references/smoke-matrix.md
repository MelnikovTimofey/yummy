# Nomad QA And Smoke Reference

## Baseline Build Gates

Run the matching build command for each changed project:

1. `cd apps/nomad-aroma-web && npm run build`
2. `cd apps/nomad-master-web && npm run build`
3. `cd apps/nomad-backend && npm run build`
4. `cd services/nomad-telegram-bot && npm run build`

## UI Verification

### Preferred

1. targeted Playwright smoke for the touched flow;
2. capture viewport and scenario;
3. save artifacts when the visual result matters.

### Fallback

1. manual browser smoke on the touched path;
2. record URL, viewport, and user journey;
3. state clearly that Playwright was not run.

## Backend Verification

Add one of these when relevant:

1. endpoint `curl` check;
2. targeted `npm test`;
3. consumer build in the dependent UI.

## Finding Format

Use this order:

1. verified;
2. findings;
3. residual risk;
4. blockers.

If no findings exist, state that explicitly and still list residual gaps.
