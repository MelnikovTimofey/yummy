import type { InjectOptions } from 'fastify';
import { buildApp } from './app';
import { createGuestAccessToken, GUEST_ACCESS_HEADER } from './auth';

// App для тестов, где гость уже ввёл код дня (#435): каждый inject идёт с
// токеном доступа, если тест не задал свой. Сам гейт проверяет guest-access.test.ts.
export const buildGuestApp = () => {
  const app = buildApp();
  const inject = app.inject.bind(app);
  const token = createGuestAccessToken().token;
  app.inject = ((options: InjectOptions) =>
    inject({ ...options, headers: { [GUEST_ACCESS_HEADER]: token, ...options.headers } })) as typeof app.inject;
  return app;
};
