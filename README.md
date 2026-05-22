# Yummy + Nomad

Монорепозиторий с двумя изолированными продуктовыми контурами.

## Контуры

- **Nomad** — активный продукт. Каталог кальянных табаков и миксов:
  - `apps/nomad-aroma-web` — гостевой `Арома Ателье` (без авторизации);
  - `apps/nomad-master-web` — backoffice `Мастер`;
  - `apps/nomad-backend` — Node/TypeScript + Prisma + Postgres;
  - `services/nomad-telegram-bot` — Telegram-бот;
  - `tests/nomad-smoke` — smoke-тесты.
- **legacy Yummy** — заморожен, read-only (`Yummy/`, `YummyExpo/`, `YummyWeb/`,
  `backend/`, `services/catalog-updater/`, `ml/`). Планируется вынести в отдельный
  репозиторий.

## Документация

- [`CLAUDE.md`](CLAUDE.md) — правила разработки, процесс, роли агентов (читать первым).
- [`PRD.md`](PRD.md) — продуктовое видение Nomad.
- [`HANDOFF.md`](HANDOFF.md) — журнал последних значимых изменений.
- [`docs/nomad/`](docs/nomad/) — план реализации, roadmap, env-matrix, чек-листы.
- [`.github/`](.github/) — issue-шаблоны, PR-шаблон, CI и review-policy.

## Разработка

Процесс описан в [`CLAUDE.md`](CLAUDE.md): задача начинается с GitHub issue, ведётся
вертикальными срезами по KISS и TDD, завершается PR в `codex/nomad-parallel-track`.
Кастомные субагенты и скиллы — в [`.claude/`](.claude/).
