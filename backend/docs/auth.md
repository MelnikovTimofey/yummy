# Magic Link Auth (v0.1)

## Flow
1) Client submits email to `POST /auth/magic-link`.
2) Server generates one-time token, stores its hash + expiry.
3) Server sends email with deep link: `yummy://auth?token=...`.
4) Client opens link and calls `POST /auth/verify` with token.
5) Server validates token, marks as used, returns JWT access token + refresh token.

## Refresh flow
1) Client submits `POST /auth/refresh` with `{ "refreshToken": "..." }`.
2) Server validates token, revokes it, issues new refresh + access token.

## Notes
- Token TTL: `MAGIC_LINK_TTL_MINUTES`.
- Email delivery is via SMTP; for local use Mailpit on port 1025.
- Deep link scheme is configured by `APP_DEEPLINK_SCHEME`.
- JWT is signed by `JWT_SECRET` and expires by `JWT_EXPIRES_IN`.
- Refresh sessions expire by `REFRESH_SESSION_TTL_DAYS` and are stored hashed.
