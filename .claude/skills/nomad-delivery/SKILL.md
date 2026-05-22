---
name: nomad-delivery
description: Доставка вертикальных срезов в контуре Nomad — backend (apps/nomad-backend), backoffice (apps/nomad-master-web) и гостевой продукт (apps/nomad-aroma-web). Использовать при реализации, ревью или рефакторинге кода этих поверхностей.
---

# Nomad Delivery

Скилл держит срезы Nomad contract-first, ограниченными и проверяемыми. Перед работой
свериться с `CLAUDE.md` (принципы, инварианты, изоляция контуров).

Общий цикл: определить тип среза → зафиксировать контракт → минимальное изменение →
verification gate → зафиксировать остаточный риск.

## Backend — `apps/nomad-backend`, `services/nomad-telegram-bot`

Типы срезов: `contract` (форма payload, валидация, новые поля), `content/state`
(intro-карточки, rails, данные рекомендаций, сиды), `domain logic`, `endpoint`, `ops`.

Дисциплина:
- сначала зафиксировать контракт: форма payload, инварианты, ожидания вызывающей стороны;
- бизнес-логика отделена от data-access и тестируема;
- продуктовая семантика из `PRD.md` не нарушается; legacy-поведение не протекает в Nomad;
- изменения `prisma/schema.prisma` применяются через `prisma db push` — требуют ревью.

Проверки: `cd apps/nomad-backend && npm test && npm run build`; целевой `curl`-чек
endpoint при необходимости; сборка зависимого UI, если контракт его затрагивает.

## Master web — `apps/nomad-master-web`

Модули: login/shell, dashboard, inventory, mixes, rails, access, Telegram-статус,
audit trail.

Дисциплина:
- определить затронутый модуль и границу роли (`nomad` staff / `admin` / общее);
- admin-only поверхности не должны протекать к не-admin ролям;
- единообразие CRUD между модулями важнее визуальных экспериментов;
- минимальное изменение, сохраняющее текущий shell и границы модулей.

Проверки: `cd apps/nomad-master-web && npm test && npm run build`; ручной smoke
затронутого модуля (login/session, навигация по табам, CRUD open/save/cancel,
admin-only видимость, audit trail); сборка backend, если UI зависит от изменённого
контракта.

## Aroma web — `apps/nomad-aroma-web`

Гостевой поток: `18+` → daily code → intro → онбординг → рекомендации → showcase →
rail view → каталог → передача выбранного микса мастеру.

Инварианты (см. `CLAUDE.md`):
- гостевой продукт без авторизации; без избранного, профиля, smoking sessions;
- `Выбрать микс` / `Покурить` — осознанные CTA с аналитической семантикой;
- интерфейс на русском, layout mobile-first.

Дисциплина: не смешивать broad-редизайн, смену продуктовой семантики и multi-screen
переписывание в одном срезе.

Проверки: `cd apps/nomad-aroma-web && npm run build`; ручной smoke затронутого этапа
(фиксировать URL, viewport, этап, что именно проверено); Playwright-smoke, когда
окружение готово.

## Stop-conditions

Остановиться и эскалировать, если: нужна новая зависимость без явного согласования;
backend- и frontend-контракт ещё не согласованы; изменение связывает модели данных
Nomad и legacy; в один срез сведены архитектура + схема + auth + runtime; меняются
границы ролей или продуктовая семантика без зафиксированного решения.

## Результат

Затронутый контракт/модуль/этап, write-scope, реально выполненные проверки,
остаточный риск, нужна ли синхронизация у потребителей контракта.
