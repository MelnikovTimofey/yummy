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

## Phase 2

Добавлены первые рабочие staff-экраны:

1. инвентаризация табаков с загрузкой `/staff/inventory/tobaccos`;
2. переключение `in stock / out of stock` через `PATCH /staff/inventory/tobaccos/:id`;
3. сводка дашборда из `/staff/dashboard/summary`.

## Phase 4

Добавлены контентные менеджеры:

1. список и редактирование миксов через `/staff/mixes`;
2. создание и обновление рейлов через `/staff/rails`;
3. табовый staff-shell с экранами `Дашборд`, `Инвентаризация`, `Миксы`, `Рейлы`.

## Локальный запуск

```bash
cd apps/nomad-master-web
npm install
npm run dev
```

По умолчанию frontend слушает `5176`.

## Стадия

Текущая стадия: Phase 4 staff operations + content managers.
