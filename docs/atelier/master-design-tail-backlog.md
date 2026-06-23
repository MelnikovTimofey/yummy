# Master design alignment — остаточный backlog

> Self-contained handoff после сессии 2026-05-26, в которой основной backlog
> (PR #70 → #76) был закрыт. Этот файл — стартовый промпт для нового сеанса
> Claude Code, чтобы доделать long-tail без обращения к транскрипту.

## Контекст

Репозиторий `nomad-yummy` (cwd `/Users/admin/PycharmProjects/yummy`).
Контур **Nomad**, scope `apps/nomad-master-web`. Правила работы — `CLAUDE.md`
в корне репо (особенно §3 TDD, §5 worktree-дисциплина, §7 продуктовые
инварианты). Self-merge политика — см. `~/.claude/projects/<...>/memory/
feedback_self_merge.md`.

Mockup-дизайн: `design/design_handoff_master_refactor/` (mockups.html +
master/*.jsx). Сессия 2026-05-26 закрыла основной backlog за **7 PR**:

| PR | Тема | Merge commit |
|---|---|---|
| #70 | chore: убрать дублирующую `master-stage__header--compact` | `730cbebc` |
| #71 | feature: ghost-кнопки page-header (Поставка / Сохранённые виды / Витрина гостя) | `3aff5471` |
| #72 | feature: Access StatsRow + helper + page-header actions | `66da76db` |
| #73 | chore: «Данные актуальны» + кликабельный cmdK pill | `450b6c23` |
| #74 | feature: MasterSortPill — единый popover sort-pill | `a19c51a9` |
| #75 | feature: MixCatalog row cleanup | `7c3445e9` |
| #76 | chore: RailsView polish-2 (StatsRow off, green mix-tokens, eye/pencil icons) | `f5946b04` |

Что осталось — мелкий long-tail без блокеров.

## База

Перед стартом любой задачи:

```bash
cd /Users/admin/PycharmProjects/yummy
git rev-parse --abbrev-ref HEAD && git status --short   # anchor check
git fetch origin main && git log origin/main --oneline -5
git worktree list
```

Каждая задача = отдельный worktree от свежего `origin/main`:

```bash
git worktree add /Users/admin/PycharmProjects/nomad-<slug> -b <type>/<slug> origin/main
```

Не работать в основной копии при наличии незакоммиченных правок (см.
CLAUDE.md §5). Один PR = один bounded context.

Тестовый стек master-web — `tsx --test` (pure-функции). **НЕ добавлять**
`@testing-library/react` / `vitest` / `jsdom`. Для UI верификация —
`npm run build` + ручной browser-smoke через `mcp__Claude_Preview__preview_start`
(см. `.claude/launch.json`).

CI на GitHub может быть в suspension. Узнать у пользователя, можно ли
игнорировать. Если можно — self-merge по тому же паттерну (label `risk:safe`
или пусто, `gh pr merge <num> --squash --delete-branch`).

## Задачи

### PR-8 · `chore/master-aroma-web-env`

**Bounded context:** убрать hardcoded `http://localhost:5174` для гостевого
контура.

**Scope:**

- `apps/nomad-master-web/src/components/rails/rails-view.tsx` — найти
  `http://localhost:5174` (кнопка «Витрина гостя», PR #71). Заменить на
  `import.meta.env.VITE_AROMA_WEB_URL ?? 'http://localhost:5174'`.
- `apps/nomad-master-web/.env.example` — добавить
  `VITE_AROMA_WEB_URL=http://localhost:5174`. Если файла нет — создать.
- `apps/nomad-master-web/README.md` — упомянуть env var в секции «Локальный
  запуск», если такая секция уже существует.

**Verification:**

```bash
cd apps/nomad-master-web && npm test && npm run build
```

**Self-merge condition:** `risk:safe`, нет триггера `risk:human-review`.

---

### PR-9 · `chore/master-cleanup-unused-reset-filters`

**Bounded context:** удалить dead-prop `onResetFilters` из API двух view.

**Scope:**

PR #74 свёл sort-controls к одному pill'у и удалил кнопку «Сбросить».
Prop `onResetFilters` остался в API:

- `apps/nomad-master-web/src/components/inventory/inventory-view.tsx`
- `apps/nomad-master-web/src/components/mixes/mix-catalog-view.tsx`

Callers (`App.tsx` или хук-обёртки) ещё передают эту функцию. Грепни:

```bash
grep -rn "onResetFilters\|resetFilters" apps/nomad-master-web/src
```

Удалить:

1. Поля из типов props у обоих view.
2. Деструктуризацию в сигнатурах компонентов.
3. Передачу из родителя (наиболее вероятно `App.tsx` + handler
   `handleReset*`).
4. Если `handleResetFilters` нигде больше не нужен — удалить и сам handler.

Не трогать функцию `setFilters({...defaults})` если она используется ещё
где-то (например, на initial mount).

**Verification:**

```bash
cd apps/nomad-master-web && npm test && npm run build
```

**Self-merge condition:** `risk:safe`.

---

### PR-10 · `feature/master-sort-pill-short-label` (опциональный, низкий приоритет)

**Bounded context:** упростить compound-label sort-pill'а до короткого
ярлыка как в mockup.

**Текущее состояние (PR #74):** pill показывает «По популярности · По
убыванию» (~30 chars). Mockup имеет «По популярности ⌄» (только поле).
Direction хранится отдельно в backend'е.

**Опции (обсудить с пользователем перед стартом):**

- **A. Direction-токен в иконке.** На pill'е рендерится только
  field-label. Рядом с `ChevronDown` — маленькая стрелка `↓` (desc) /
  `↑` (asc). Внутри popover'а выбор только поля; направление
  переключается отдельной мини-кнопкой рядом с pill'ом, не внутри
  popover'а.
- **B. Default-direction per field.** Поле `popularity` всегда `desc`,
  поле `name` всегда `asc` и т.д. Direction не выбирается явно,
  фиксируется в `mixSortFieldOptions` записи. В `contracts.ts`
  появляется `defaultDirectionByField`. Pill чисто mockup-faithful,
  но теряется ручная смена направления.
- **C. Не делать.** Compound label — рабочий компромисс. Закрыть как
  wontfix, если пользователю не мешает.

**Рекомендация:** A (даёт visual mockup-faithful + сохраняет direction
control). B упрощает UI, но теряет функциональность.

**Scope (если A):**

- `apps/nomad-master-web/src/components/shell/master-sort-pill.tsx` —
  добавить prop `direction: SortDirection` + `onDirectionChange`.
  Рендерить `ArrowUp` / `ArrowDown` lucide-icon рядом с chevron.
- `apps/nomad-master-web/src/components/shell/master-sort-pill.helpers.ts` —
  можно упростить `buildSortPillOptions` до single-direction (только
  field) + отдельный `directionOptions`.
- `*.helpers.test.ts` — обновить тесты (TDD red→green).
- `inventory-view.tsx` + `mix-catalog-view.tsx` — обновить prop'ы.

**Verification:**

```bash
cd apps/nomad-master-web && npm test && npm run build
```

**Self-merge condition:** `risk:safe`.

---

### Backend-задачи (НЕ master-web, отдельный scope)

#### PR-11 · `feature/backend-telegram-window-delivery-ratio`

**Bounded context:** backend отдаёт delivery-ratio для последних N окон
daily code'а.

**Scope:**

- `apps/nomad-backend/prisma/schema.prisma` — у модели `DailyAccessCode`
  (или как она называется) есть `chatsTotal` / `chatsConfirmed`? Грепни.
  Если нет — добавить.
- `apps/nomad-backend/src/app.ts` или route-файл (`access.ts`?) —
  endpoint возвращает
  `windowHistory: [{ codeValue, expiresAt, chatsConfirmed, chatsTotal }]`
  (последние 5).
- `apps/nomad-backend/src/access.test.ts` — TDD на endpoint.
- Mock / seed: в `prisma/seed.ts` заполнить history для нескольких окон.
- Frontend:
  `apps/nomad-master-web/src/components/access/telegram-bot-status-block.tsx`
  заменить `«—»` в колонке RATIO на реальный `confirmed/total`.

**Triggers `risk:human-review`** — изменение Prisma-schema. Дождаться
human review (см. `.github/NOMAD_REVIEW_POLICY.md`).

#### PR-12 · `feature/master-inventory-supply-flow`

**Bounded context:** активировать кнопку «Поставка» в Tobaccos page-header.

**Scope:**

- Backend: endpoint `/staff/inventory/supply` принимающий list of
  `tobaccoId` + qty. Создать `InventorySupplyEvent` в Prisma. Audit-log.
- Frontend: модалка `<InventorySupplySheet>` или маршрут
  `/inventory/supply`. Сейчас кнопка disabled с `title='В разработке'`.

**Triggers `risk:human-review`** — Prisma change. Дождаться human review.

#### PR-13 · `feature/master-saved-views`

**Bounded context:** активировать «Сохранённые виды» на Mixes.

**Scope:**

- Backend: модель `StaffSavedView` (per-user-per-screen JSON-blob с filter
  state'ом). Endpoint CRUD.
- Frontend: popover'ом по клику на ghost-кнопку — список сохранённых,
  кнопка «Сохранить текущий вид».

**Triggers `risk:human-review`** — Prisma change.

---

## Порядок выполнения

**Frontend long-tail (быстро, по очереди):**

1. PR-8 (env var) — ~10 минут.
2. PR-9 (cleanup) — ~15 минут.
3. PR-10 (sort-pill short label) — обсудить с пользователем вариант A/B/C
   перед стартом.

**Backend (medium effort, human-review):**

4. PR-11 (delivery ratio) — после согласования схемы.
5. PR-12 (supply flow) — отдельная фича.
6. PR-13 (saved views) — отдельная фича.

**CI hygiene:**

7. Когда GitHub снимет suspension с аккаунта — `gh run rerun` на последнем
   master-merge'е (`f5946b04`) чтобы получить зелёный baseline. Если
   что-то упадёт — отдельный bug-fix PR.

## Что НЕ делать

- НЕ возвращать дубль-шапку `master-stage__header--compact`.
- НЕ возвращать кнопку «Сбросить» в filter-toolbar (PR #74 убрал её
  сознательно).
- НЕ менять структуру `MasterPageHeader` / `MasterStatsRow` без
  обновления всех 5 view'шек одновременно.
- НЕ добавлять `@testing-library/react` / `vitest` / `jsdom` (см. KISS).
- НЕ работать в `/Users/admin/PycharmProjects/yummy` напрямую при
  наличии worktree-дисциплины (CLAUDE.md §5).

## Полезные ссылки

- Mockup HTML: `design/design_handoff_master_refactor/mockups.html` —
  поднять через
  `python3 -m http.server 8765 --directory design/design_handoff_master_refactor`
  → http://localhost:8765/mockups.html
- Master JSX (source of truth для цветов, иконок, label'ов):
  `design/design_handoff_master_refactor/master/Inventory.jsx`,
  `MixCatalog.jsx`, `Rails.jsx`, `Access.jsx`, `Dashboard.jsx`.
- Текущие смерженные PR-цепочки:
  `gh pr list --state merged --limit 10 --search 'master-web in:title'`.
- Локальный запуск:

  ```bash
  cd apps/nomad-backend && npm run db:start
  DATABASE_URL='postgresql://nomad:nomad@127.0.0.1:5433/nomad?schema=public' \
    npx prisma db push --force-reset && npx prisma db seed
  npm run dev   # порт 3021

  cd ../nomad-master-web && npm run dev   # порт 5176
  ```

- Логин: `admin/admin` (admin) или `nomad/nomad` (nomad).
