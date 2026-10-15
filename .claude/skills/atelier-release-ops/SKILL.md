---
name: atelier-release-ops
description: Планирование и ревью окружения, деплоя, runtime-операций, Telegram-бота, bootstrap-admin и release-readiness контура Арома Ателье. Покрывает владение env, rollout-smoke, точки внимания при откате и операционные stop-conditions.
---

# Арома Ателье Release Ops

Скилл стандартизирует операционную работу по запуску Арома Ателье вне локальной разработки.
Контекст: `docs/atelier/prod-operations.md` (выкатка, откат, мониторинг, бэкапы),
`docs/atelier/env-matrix.md`, `docs/atelier/deployment-smoke-checklist.md`,
`docs/atelier/acceptance-checklist.md`.

## Когда применять

- изменение env-переменных, конфигурации runtime, deployment-нот или владения секретами;
- операционное поведение `services/telegram-bot`;
- bootstrap-admin или доступ backend-автоматизации;
- подготовка или ревью release-readiness.

## Цикл

1. Загрузить ops-контекст — прочитать env-matrix и deployment smoke checklist.
2. Классифицировать изменение: `backend`, `aroma web`, `master web`, `bot`, `bootstrap`.
3. Проверить границы секретов и runtime: секреты Арома Ателье изолированы от legacy, владение
   явное.
4. Определить rollout-чеки: минимальный smoke-путь для затронутой runtime-поверхности.
5. Зафиксировать точки внимания при откате — условие, останавливающее rollout.
6. Выкатить: дождаться зелёного `Atelier Images` для коммита, затем на хосте
   `scripts/atelier/deploy.sh [сервис …]` (готовые образы из GHCR, `--no-deps` для
   точечной выкатки). Перед схемной миграцией — `scripts/atelier/pg-backup.sh`.
   Откат — `DEPLOY_TAG=<sha> scripts/atelier/deploy.sh`. `up -d --build` на хосте —
   только аварийно.
7. После выкатки: домены отвечают 200, `host-check.sh` чистый, алертов в Telegram нет.
   Для фичи с клиентом — шаг «приёмка клиентом» из `atelier-feature-design`.

## Runtime-поверхности

`apps/backend`, `apps/aroma-web`, `apps/master-web`,
`services/telegram-bot`.

## Базовые rollout-чеки

1. backend health endpoint;
2. доступ backend-автоматизации;
3. гостевой поток до выбора карточки микса;
4. вход в `Мастер` и операционные модули;
5. доступность Telegram-бота и command flow;
6. bootstrap-admin при первой production-настройке.

## Красные флаги rollout

- backend `401` на валидный automation-ключ;
- crash-loop бота или сломанная связь с Telegram API;
- гостевой поток не доходит до рекомендаций или карточки микса;
- вход в `Мастер` падает после деплоя;
- ломается flow `rotate` / daily code для активного доступа;
- алерт от `host-check` или внешнего наблюдателя (Франкфурт) после выкатки.

## Stop-conditions

Эскалировать, если: production-секреты неясны, шарятся с legacy или предлагаются к
коммиту; токены бота и backend-автоматизации рассинхронены; bootstrap-admin трактуется
как seed-only в production; release-готовность заявлена без backend/frontend/bot smoke
там, где он применим.

## Результат

Затронутая runtime-поверхность; влияние на env/секреты; rollout-чеки к выполнению;
stop-conditions; заметка об откате/восстановлении, если изменение рискованное.
