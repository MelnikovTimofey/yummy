# Nomad Master Web

Staff/admin frontend для продукта `Мастер`.

## Назначение

Этот пакет отвечает за служебные сценарии Nomad:

1. авторизация сотрудников;
2. инвентаризация;
3. менеджер миксов;
4. менеджер рейлов;
5. аналитические дашборды.

## Phase 1

В текущем спринте реализован минимальный staff login flow:

1. вход по `admin` или `nomad`;
2. запрос `POST /staff/auth/login`;
3. подтверждение через `GET /staff/auth/me`;
4. хранение токена в `sessionStorage`;
5. authenticated shell с профилем и списком следующих модулей.

## Локальный запуск

```bash
cd apps/nomad-master-web
npm install
npm run dev
```

По умолчанию frontend слушает `5176`.

## Стадия

Текущая стадия: scaffold.
