# Acceptance Checklist — Арома Ателье

## Назначение

Этот чеклист фиксирует минимальный набор проверок перед pilot/release Арома Ателье.

## Backend

- `apps/backend`: `npm run prisma:generate`
- `apps/backend`: `npm run prisma:dbpush`
- `apps/backend`: `npm test`
- `apps/backend`: `npm run build`
- Проверить `GET /health`
- Проверить `GET /meta`

## Арома Ателье

- Открывается экран `18+`
- После подтверждения возраста принимается daily code
- Онбординг доводит до рекомендаций
- Кнопка `Выбрать` открывает карточку микса
- Оценка микса сохраняется без ошибки
- Главная и каталог открываются после рекомендаций

## Мастер

- Логин `admin` работает
- Логин `nomad` работает
- `admin` видит раздел `Доступ`, Telegram automation state и журнал аудита
- `nomad` не получает доступ к admin-only данным
- Toggle наличия в инвентаризации работает
- CRUD миксов и рейлов не падает на базовых сценариях
- CRUD daily codes работает
- CRUD staff accounts доступен только `admin`

## Telegram automation

- `services/telegram-bot`: `npm test`
- `services/telegram-bot`: `npm run build`
- `/whoami` отвечает из allowlisted chat
- `/code` возвращает текущий active daily code
- `/rotate` создаёт новый код и фиксирует его в backend
- `Мастер` показывает актуальный automation state

## Quality smoke

- Guest smoke пройден через Playwright CLI
- Staff smoke пройден через Playwright CLI
- Артефакты лежат в `output/playwright/nomad-quality`
- В консоли нет product-breaking ошибок
- Допустимый остаточный шум: React DevTools hint в dev-режиме

## Audit trail

- Staff-sensitive операции пишутся в `AuditEvent`
- `admin` видит последние события в `Мастере`
- Аудит покрывает:
  - daily codes
  - staff accounts
  - Telegram recipients
  - inventory toggle
  - mixes
  - rails

## Перед handoff

- `git diff --check`
- `git status --short`
- PR открыт в `main` (с ветки `feature/*` или `bug/*`) и помечен для ревью
