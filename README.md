# Nomad

Репозиторий продукта Nomad — каталог кальянных табаков и миксов.

## Поверхности

- `apps/nomad-aroma-web` — гостевой `Арома Ателье` (без авторизации);
- `apps/nomad-master-web` — backoffice `Мастер`;
- `apps/nomad-backend` — Node/TypeScript + Prisma + Postgres;
- `services/nomad-telegram-bot` — Telegram-бот;
- `tests/nomad-smoke` — smoke-тесты.

## Legacy Yummy

Исходный продукт Yummy вынесен в отдельный архивный репозиторий
[MelnikovTimofey/yummy](https://github.com/MelnikovTimofey/yummy) с сохранением
истории. В этом репозитории legacy-код больше не поддерживается. Состояние
монорепо до split зафиксировано tag-ом `pre-legacy-split`.

## Документация

- [`CLAUDE.md`](CLAUDE.md) — правила разработки, процесс, роли агентов (читать первым).
- [`PRD.md`](PRD.md) — продуктовое видение Nomad.
- [`HANDOFF.md`](HANDOFF.md) — журнал последних значимых изменений.
- [`docs/nomad/`](docs/nomad/) — план реализации, roadmap, env-matrix, чек-листы.
- [`.github/`](.github/) — issue-шаблоны, PR-шаблон, CI и review-policy.

## Разработка

Production-ветка — `main`. Рабочие ветки именуются `feature/<slug>` (новый
функционал, рефакторинг, документация) или `bug/<slug>` (исправление). Процесс
описан в [`CLAUDE.md`](CLAUDE.md): задача начинается с GitHub issue, ведётся
вертикальными срезами по KISS и TDD, завершается PR в `main`. Кастомные
субагенты и скиллы — в [`.claude/`](.claude/).
