# Nomad Release Ops Reference

## Read First

1. `NOMAD_ENV_MATRIX.md`
2. `NOMAD_DEPLOYMENT_SMOKE_CHECKLIST.md`

## Runtime Surfaces

1. `apps/nomad-backend`
2. `apps/nomad-aroma-web`
3. `apps/nomad-master-web`
4. `services/nomad-telegram-bot`

## Minimum Ops Questions

1. Which runtime surface changed?
2. Which env vars or secrets are affected?
3. Does the change affect auth, automation, bot delivery, or admin bootstrap?
4. Which smoke steps must run before calling the rollout healthy?

## Common Checks

1. backend health endpoint;
2. backend automation access;
3. guest flow up to mix-card selection;
4. Master login and admin operational modules;
5. Telegram bot reachability and command flow;
6. bootstrap admin path if this is the first production setup.

## Rollout Red Flags

1. backend `401` on valid automation key;
2. bot crash loop or broken Telegram API connectivity;
3. guest flow cannot reach recommendations or mix card;
4. Master login fails after deploy;
5. rotate or daily code flow breaks active access.
