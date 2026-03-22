# Nomad Backend

Отдельный backend для продуктов `Арома Ателье`, `Мастер` и `Telegram-бот`.

## Назначение

Пакет не переиспользует напрямую legacy `backend/` как runtime-контур.

Он должен стать отдельной backend-базой для:

1. guest access flow;
2. staff auth;
3. inventory;
4. mixes;
5. rails;
6. analytics.

## Локальный запуск

```bash
cd apps/nomad-backend
npm install
npm run dev
```

По умолчанию backend слушает `3021`.

## Стадия

Текущая стадия: scaffold c healthcheck и meta endpoint.
