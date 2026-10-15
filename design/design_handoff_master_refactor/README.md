# Handoff: Nomad Master — refactor

Backoffice-редизайн `Мастер` (`apps/nomad-master-web` в монорепо).
Передаётся для интеграции через Claude Code.

---

## О файлах в бандле

Файлы в `master/` и `mockups.html` — это **дизайн-референс**,
интерактивный HTML-прототип на React 18 + Babel (loose JSX через
`<script type="text/babel">`). **Не нужно копировать этот HTML в
продакшен.** Задача — воссоздать выбранные экраны в существующей
кодовой базе (`apps/nomad-master-web`: React 19 + Vite + TS +
Tailwind v4 с `@theme inline` + shadcn `new-york` baseColor neutral +
lucide-react + recharts), используя её установленные паттерны, токены
и shadcn-примитивы.

Что есть в бандле:

- `mockups.html` — рабочий прототип. Откройте в браузере (`open mockups.html`
  или статический сервер) — рендерит всю backoffice-оболочку. Между
  экранами переключение в шапке (`Дашборд / Табаки / Миксы / Рейлы /
  Доступ`). Cmd-K открывает командную палитру, Cmd-K снова закрывает.
- `master/app.jsx` — оболочка приложения: топбар, навигация, роутинг
  состоянием, lookup-карты (`tobaccoMap / mixesMap / railsMap`), все
  обработчики CRUD, монтаж drawer-ов и `MixBuilder`.
- `master/screens.jsx` — четыре основных списка и два редактора:
  `MixesList, TobaccosList, TobaccoEditor, RailsList, RailEditor`.
- `master/mix-builder.jsx` — полноэкранный конструктор миксов
  (`MixBuilder`, `ProportionBar`, `LibraryItem`, `ComponentCard`).
- `master/access.jsx` — экран `Доступ` (suite из блоков: дневной код,
  Telegram-операторы, сотрудники, аудит).
- `master/cmdk.jsx` — командная палитра (`CommandPalette`).
- `master/ui.jsx` — общие примитивы: `Button, IconButton, Lucide, Tag,
  Chip, Toggle, SearchInput, Drawer, Stars, BrandPill`. **В продакшен не
  идут** — это упрощённые версии для прототипа. В кодовой базе их
  место занимают shadcn-примитивы (`@/components/ui/button`, `.../badge`,
  `.../sheet`, `.../dialog`, `.../card`, `.../searchable-entity-select`)
  + `lucide-react` иконки.
- `master/data.jsx` — sample data (табаки, миксы, рейлы, операторы,
  аудит) + `colorForTobacco`, `FLAVOR_PROFILES`. В проде источник —
  backend (`nomad-backend`, нормалайзеры в `src/contracts.ts`).
- `master/tweaks-panel.jsx` — рантайм-панель для переключения вариантов
  прототипа. **Не нужна в проде.**
- `master/styles.css` — токены прототипа на чистом CSS (нет Tailwind).
  В проде эти токены маппятся на CSS-переменные `apps/nomad-master-web/src/styles.css`
  (раздел `:root`) и далее на `@theme` Tailwind v4. Маппинг — в §`Design tokens`.

## Фидельность

**High-fidelity** в части макета, плотности, иерархии и поведения.
Цвета и типографика — **близкие, не финальные**: прототип использует
`IBM Plex Sans/Mono + Source Serif 4` и тёплую терракотовую палитру
на OKLCH; продовый Master уже стоит на `Geist Variable +
Fraunces Variable` с близкой по тону медно-песочной палитрой.
Задача — взять **структуру, плотность, layout, ergonomics** из прототипа
и переложить на токены `apps/nomad-master-web/src/styles.css` без
введения новых fonts/палитр.

> Если визуальный язык хочется тоже подвинуть к прототипу
> (Source Serif 4 в заголовках, IBM Plex в монаспейс-метках) — это
> отдельное продуктовое решение, выносится в issue.

---

## Контекст: текущее состояние Master

`apps/nomad-master-web/src/App.tsx` — монолит **~3400 строк**. В нём:

1. Все четыре вкладки рендерятся inline (`view === 'dashboard' && (...)`),
2. Все редакторы (`Sheet`/`Dialog`) объявлены прямо в `App.tsx`,
3. Все обработчики CRUD и нормализация API-ответов — рядом,
4. Контракты вынесены в `contracts.ts`, но всё ещё импортируются
   только в `App.tsx`.

**Цель рефакторинга** — раздробить `App.tsx` по экранам и редакторам,
следуя структуре прототипа, **не меняя контрактов API** и **не трогая
бэкенд**. Это позволит smoke-тестам, разделению ролей агентов
(`frontend-dev` per-screen) и code-review (`1 PR = 1 bounded context`,
см. `CLAUDE.md §5`) работать на меньших срезах.

---

## Выбранные варианты

| Маршрут | Файл прототипа | Компонент | Куда смотреть в `App.tsx` |
|---|---|---|---|
| Дашборд | `master/app.jsx` | `DashboardPlaceholder` | `view === 'dashboard'` |
| Табаки | `master/screens.jsx` | `TobaccosList` | `view === 'inventory'` (использует `InventoryView`) |
| Табак — редактор | `master/screens.jsx` | `TobaccoEditor` | `inventoryEditorState`, секция Sheet с табаком |
| Миксы | `master/screens.jsx` | `MixesList` | `view === 'mixes'` (использует `MixCatalogView`) |
| Микс — конструктор | `master/mix-builder.jsx` | `MixBuilder` + `ProportionBar` | `mixEditorState`, Sheet (но прототип рекомендует **полноэкранный layout**, не Sheet) |
| Рейлы | `master/screens.jsx` | `RailsList` | `view === 'rails'` |
| Рейл — редактор | `master/screens.jsx` | `RailEditor` | `railEditorState`, Sheet |
| Доступ | `master/access.jsx` | `AccessView` (composer из 4 блоков) | `view === 'access'` |
| Командная палитра | `master/cmdk.jsx` | `CommandPalette` (`⌘K`) | **новый компонент**, в текущем `App.tsx` отсутствует |

---

## Целевая структура файлов

```
apps/nomad-master-web/src/
├── App.tsx                       ← остаётся тонкий: auth gate, роут-табы, Suspense, монтаж редакторов
├── main.tsx
├── contracts.ts                  ← без изменений
├── lib/
│   ├── utils.ts                  ← без изменений
│   └── api-client.ts             ← [new] вынести fetch-обёртки из App.tsx
├── hooks/                        ← [new]
│   ├── use-mixes.ts              ← состояние списка миксов + CRUD
│   ├── use-tobaccos.ts
│   ├── use-rails.ts
│   ├── use-access.ts             ← daily code, staff, telegram, audit
│   └── use-cmdk.ts               ← ⌘K + горячие клавиши
├── components/
│   ├── shell/                    ← [new]
│   │   ├── topbar.tsx            ← из прототипа: brand mark + nav + status-pill + user-chip
│   │   ├── command-palette.tsx   ← из master/cmdk.jsx
│   │   └── workspace-tabs.ts     ← массив `workspaceTabs` (уже есть в App.tsx)
│   ├── dashboard/
│   │   └── dashboard-view.tsx    ← существующий, не трогать в этом PR
│   ├── inventory/
│   │   ├── inventory-view.tsx    ← существующий
│   │   └── tobacco-editor.tsx    ← вынести из App.tsx (~250 строк)
│   ├── mixes/
│   │   ├── mix-catalog-view.tsx  ← существующий
│   │   └── mix-builder/          ← [new directory, полноэкранный layout]
│   │       ├── mix-builder.tsx
│   │       ├── proportion-bar.tsx
│   │       ├── component-card.tsx
│   │       ├── tobacco-library.tsx       ← правая колонка
│   │       └── co-occurrence-suggest.ts  ← алгоритм из master/mix-builder.jsx
│   ├── rails/
│   │   ├── rails-view.tsx        ← [new] из master/screens.jsx RailsList
│   │   └── rail-editor.tsx       ← [new] из master/screens.jsx RailEditor
│   ├── access/
│   │   ├── access-view.tsx       ← [new] composer
│   │   ├── daily-code-block.tsx  ← из master/access.jsx DailyCodeBlock
│   │   ├── operators-block.tsx
│   │   ├── operator-editor.tsx
│   │   ├── staff-block.tsx
│   │   ├── staff-editor.tsx
│   │   └── audit-block.tsx
│   └── ui/                       ← существующий shadcn
└── styles.css                    ← минимальные дополнения (см. §Design tokens)
```

**Принцип распила:**

- Один экран = одна папка под `components/<feature>/`.
- Один редактор = один файл `<entity>-editor.tsx`, экспорт — controlled
  компонент с пропсами `{ open, value, onClose, onSave }`.
- Состояние списков и CRUD выносится в `hooks/use-<entity>.ts` —
  возвращает `{ items, meta, filters, refetch, create, update, delete, toggle }`.
- API-вызовы из `App.tsx` (нормализация ответов уже сделана в
  `contracts.ts`) собираются в `lib/api-client.ts` с типизированными
  функциями `fetchMixes(query)`, `saveMix(payload)`, и т.д.
- `App.tsx` после рефакторинга должен ужаться до **<300 строк** и
  содержать только: auth gate, layout shell, табы, монтаж модалок,
  токен-стораджа.

---

## Экраны

### Дашборд (`dashboard`)

В прототипе это placeholder с hero-статистикой и двумя списками
(топ-миксы по популярности, заблокированные). **В этом PR не трогаем
существующий `DashboardView` — он уже распилен.** Прототип нужен только
для проверки, что hero-статистика влезает в новый shell.

### Табаки (`inventory`)

Layout прототипа (`TobaccosList`):

- `page-header` — eyebrow + h1 + subtitle слева, справа кнопки `Импорт`
  и `Новый табак` (primary).
- Stats-полоса (4 ячейки): `Всего / В наличии / Использовано в миксах /
  Стоп-лист`.
- Toolbar: `SearchInput` (с горячей `/`) + чипы статуса
  (`Все / В наличии / Стоп-лист`) + select сортировки.
- Таблица: `Название · Бренд · Линейка · Профиль · Крепость · В миксах ·
  Наличие · ⋯`. Плотность — `--row-h: 36px` (compact: 32, cozy: 48).
  Bulk-actions — флажок в шапке колонки.

В проде сейчас живёт `InventoryView`. Из прототипа в неё лифтить:

1. **stats-полоса** (сейчас её нет на табаках, но шаблон уже у миксов
   и рейлов — повторить).
2. **density токен** `--row-h` (см. §Design tokens) — заменить
   хардкоды padding на одну переменную.
3. **`BrandPill`** — двухбуквенная плитка бренда (см. `master/ui.jsx:175`).
   В проде она уже частично есть — выровнять (один компонент в
   `components/ui/brand-pill.tsx`).

`TobaccoEditor` (Sheet `size="lg"`):

- Левая колонка: `Название · Бренд · Линейка · Описание`.
- Правая: `Профили вкуса` (мульти-чипы из `FLAVOR_PROFILES`), `Вкусы`
  (свободный ввод через запятую), `Крепость` (segmented light/medium/strong),
  `В наличии` (toggle).
- Footer: `Отмена` (ghost) + `Сохранить` (primary). Между ними —
  `Удалить` (danger, ghost) только в режиме edit.

### Миксы (`mixes`)

`MixesList` — главное место рефакторинга. Layout:

- Stats: `Всего · Видно гостю · В рейлах · Заблокировано`.
- Profile-filter-bar: горизонтальный скролл чипов по `flavorProfiles`
  с counter-ами (топ-8 по частоте).
- Toolbar: search + chips статуса (`Все / Видны / Скрыты / Заблокированы`) +
  sort (`Популярность / Рейтинг / Имя / Обновлены`).
- Карточка микса (compact): brand-strip (плитки компонентов), `name`,
  `description` (1 строка), `flavors` (3 чипа + overflow), `rating`,
  `popularity bar`, action-row (`Открыть, В рейлах, Скрыть/Показать,
  Дублировать, ⋯`).

### Микс — конструктор (`MixBuilder`, **полноэкранный**)

🚨 **Важно:** в текущем `App.tsx` `MixBuilder` живёт в `Sheet`. Прототип
делает его **full-page route** (рекомендация — UX выигрывает).

Layout (см. `master/mix-builder.jsx`):

- Верх — sticky bar: breadcrumb (`Миксы / <Название>`), правый блок
  `Cancel / Save`.
- 3 колонки (`grid-template-columns: 280px 1fr 320px`):
  - **Слева** — `ProportionBar` (горизонтальная stack-полоса с
    drag-handles) + список `ComponentCard` (название табака, brand-pill,
    proportion %, − +, удалить).
  - **Центр** — preview (имя, описание-textarea, агрегированные
    `flavorProfiles + flavors`).
  - **Справа** — `TobaccoLibrary`: search + список табаков с
    Co-Occurrence suggestions сверху. Клик → добавить в микс,
    автоматический ребаланс до 100% (`rebalanceTo100`).

`ProportionBar`:

- Drag handles между сегментами меняют пропорцию соседних табаков.
- Min 5%, max 95% на компонент.
- На каждом сегменте — цвет из `colorForTobacco(id)` (детерминированный
  hue по id).

`MixBuilder` Tweaks (опционально перенести):

- `builder_layout` (`split` / `stack`) — выбор сетки.
- `proportions_ui` (`numeric` / `bar`) — два режима ввода долей.

### Рейлы (`rails`)

`RailsList`:

- Page-header c кнопкой `Витрина гостя` (ghost) + `Новый рейл` (primary).
- Карточки рейлов: `name`, `description`, `mixIds.length`, тип
  (`Подготовленный / Статистический / Кураторский`), toggle `active`.

`RailEditor` (Sheet `size="xl"`, 3 колонки):

- **Левая** — настройки + список включённых миксов с drag-reorder.
- **Центр** — picker остальных миксов (search + click → add).
- **Правая** — `guest-preview` — мокап телефона с тем, как рейл
  смотрится на витрине Aroma.

Drag-reorder в левой колонке использует HTML5 DnD (`draggable` +
`onDragStart/Over/Drop`), без библиотек.

🚨 **Hooks-order ловушка:** в прототипе была починена; перенося в TS,
не возвращайтесь к ранее-багу — `useMemo` не должен стоять после
`if (!draft) return null` (см. историю `master/screens.jsx` коммит
о RailEditor).

### Доступ (`access`)

Composer из 4 независимых блоков (см. `master/access.jsx`):

1. **`DailyCodeBlock`** — дневной код доступа в Aroma. Hero-display
   (большой код, IBM Plex Mono, letter-spacing 0.32em), countdown
   `useCountdown(endsAt)`, кнопки `Скопировать / Сгенерировать
   новый / Автоповорот`.
2. **`OperatorsBlock`** — Telegram allowlist. Filter (all / active /
   pending / inactive), search, таблица: `Имя · Phone · Статус ·
   Последнее уведомление · ⋯`.
3. **`StaffBlock`** — учётки сотрудников. Таблица: `Логин · Имя ·
   Роль · Активен · ⋯`. Редактор — Sheet `size="md"`.
4. **`AuditBlock`** — журнал событий. Filter по типу события,
   relative-time (`relativeFromNow`), таблица: `Когда · Кто ·
   Действие · Сущность · Детали`.

Each block — separate file, separate hook (`useDailyCode`, `useOperators`,
`useStaff`, `useAudit`).

### Командная палитра (⌘K)

**Нового нет в проде** — добавить компонент `CommandPalette`. См.
`master/cmdk.jsx`:

- Открывается `⌘K` (или `/` вне input).
- Группы: `Навигация · Создать · Открыть микс · Открыть табак ·
  Открыть рейл · Действия`.
- Стрелки ↑↓, Enter — действие, Esc — закрыть.
- Live-фильтр по `name + description + flavors`.

Это самый простой PR в наборе — изолированный компонент + хук
`useCmdK` + горячая клавиша в `App.tsx`.

---

## Design tokens

Цветовой словарь прототипа (`master/styles.css :root`) на OKLCH.
В проде уже есть параллельные токены в `apps/nomad-master-web/src/styles.css`.
Маппинг (прототип → прод):

| Прототип | Прод (`apps/nomad-master-web/src/styles.css`) |
|---|---|
| `--bg-base`        | `--background` / `#111013` |
| `--bg-raised`      | `--card` / `#17161a` |
| `--bg-elevated`    | `--popover` / `#1b191d` |
| `--bg-overlay`     | `--nomad-glass` |
| `--border-subtle`  | `--border` |
| `--border-default` | `--nomad-border-strong` |
| `--text-primary`   | `--foreground` / `--nomad-ink` |
| `--text-secondary` | `--nomad-ink-soft` |
| `--text-muted`     | `--muted-foreground` |
| `--accent`         | `--primary` / `--nomad-primary` |
| `--accent-soft`    | `--accent` (rgba primary) |
| `--accent-fg`      | `--primary-foreground` |
| `--success`        | _новый_ — добавить `--success: oklch(0.75 0.13 155)` |
| `--warning`        | _новый_ — `--warning: oklch(0.82 0.13 75)` |
| `--danger`         | `--destructive` |
| `--info`           | _новый_ — `--info: oklch(0.72 0.1 230)` |

**Не плодите дубликаты.** Если переменная уже есть в проде с другим
именем — используйте прод-имя, а в прототипе это просто ссылка.

### Радиусы

| Прототип | Прод |
|---|---|
| `--r-xs: 4px`   | _новый_ — `--radius-xs` |
| `--r-sm: 6px`   | _новый_ — `--radius-sm` |
| `--r-md: 8px`   | `--radius` × 0.8 |
| `--r-lg: 12px`  | `--radius` |
| `--r-xl: 16px`  | `--radius` × 1.3 |
| `--r-pill: 999px` | `--radius-full` |

### Spacing

Прототип использует фиксированную шкалу `--space-1..10` (4,8,12,16,20,24,32,40).
В проде — Tailwind утилиты (`p-1`, `gap-4`); шкала совпадает (Tailwind
по 4px). **Никаких новых spacing-токенов в проде не нужно** — используйте
Tailwind-классы.

### Типографика

| Роль | Прототип | Прод |
|---|---|---|
| Sans-serif | `IBM Plex Sans` 13/14/16 | `Geist Variable` (уже подключён) |
| Serif (page-title) | `Source Serif 4` 28/36 | `Fraunces Variable` (уже подключён) |
| Mono | `IBM Plex Mono` (коды, kbd) | _добавить_ `font-mono` через `font-family: ui-monospace, "JetBrains Mono", ...` |
| Caps eyebrow | `font-sans`, 11px, `letter-spacing: 0.18em`, uppercase, `--text-muted` | то же, через Tailwind `text-xs uppercase tracking-[0.18em] text-muted-foreground` |
| Page title | `font-serif`, 28-36px, line-height 1.05 | `font-display` (Fraunces), `text-4xl leading-[1.05]` |
| Numeric | `tabular-nums` | то же |

### Плотность (`--row-h`)

Один токен правит все списочные строки:

```css
:root         { --row-h: 36px; }
[data-density="compact"] { --row-h: 32px; }
[data-density="cozy"]    { --row-h: 48px; }
```

Прокинуть в Tailwind через `@theme inline { --spacing-row: var(--row-h); }`
и переиспользовать как `h-row`. Atом плотности **обязателен** — даёт
оператору режим «зал кипит, нужна компакт».

---

## Behavior / Interactions

- **`⌘K` / `Ctrl+K`** — toggle command palette. **`/`** — открывает,
  если фокус не в input/textarea.
- **Hover на строке таблицы** — поднимает `--bg-raised`, показывает
  правую actions-колонку (по умолчанию `opacity: 0`).
- **Drag-reorder в `RailEditor`** — native HTML5 DnD, без сторонних
  библиотек. Подсветка drop-target — `opacity: 0.5` на drag source.
- **`ProportionBar`** — `pointerdown` на handle, `pointermove` на window,
  компенсация по соседним сегментам так, чтобы сумма = 100. Min 5%
  на сегмент.
- **`Toggle`** (наличие табака / активность рейла) — оптимистичный
  апдейт; rollback при ошибке API (в прототипе not implemented,
  в проде — обязательно).
- **`DailyCode countdown`** — обновляется каждую секунду; при `<= 0`
  показывает `Истёк` (терракотовый), при `<= 30 мин` — `Скоро истечёт`
  (warning).
- **CmdK keyboard** — `↑↓` навигация, `Enter` выбрать, `Esc` закрыть,
  `Tab` — переход между группами (опционально).

### Состояния и edge-cases

- **Empty state списка** — иллюстрация (placeholder), eyebrow `Пока пусто`,
  primary-кнопка `Добавить первый <сущность>`.
- **Loading** — skeleton (повтор row × 6, бесцветный shimmer).
- **Error** — баннер сверху страницы (`--danger-soft` фон, `--danger`
  иконка `triangle-alert`), кнопка `Попробовать ещё раз`.
- **Заблокированный микс** (нет в наличии одного из компонентов) —
  в карточке tag `tone="danger"` `блокирован`, в действиях вместо
  `Скрыть` — `Стоп-лист причин`.

---

## State management

Прототип хранит всё в `useState` внутри `App` (см. `master/app.jsx:184`):
`tobaccos, mixes, rails, route, tobaccoEdit, railEdit, mixBuilder, cmdOpen`.

В проде — реальный backend. Рекомендуемая раскладка:

```
hooks/use-mixes.ts
  ├─ useMixes(query)              → { mixes, meta, isLoading, refetch }
  ├─ useMixMutations()            → { create, update, delete, toggleVisible, duplicate }
  └─ внутри: fetch + normalize* из contracts.ts
```

Аналогично `use-tobaccos`, `use-rails`, `use-access`.

**Не вводите TanStack Query / SWR в этом PR** — оставайтесь на ручном
`useEffect + AbortController`, как в текущем `App.tsx`. Внедрение
data-кэша — отдельная история (см. `docs/nomad/`).

`tobaccoMap / mixesMap / railsMap` — `useMemo` от списков. Используются
всюду, где нужно резолвить `tobaccoId → tobacco` в `MixBuilder` и
`mixId → mix` в `RailEditor`. Не выносить в Context — это рендер-кэш,
не state.

---

## Order of work (рекомендуемые PR-срезы)

`1 PR = 1 bounded context` (см. `CLAUDE.md §5`). Предлагаемая
последовательность:

1. **`feature/master-shell-extract`** — вынести `TopBar`, `CommandPalette`,
   `workspaceTabs` в `components/shell/`. `App.tsx` ужать до layout.
   Smoke-тесты в `tests/nomad-smoke` проверить.
2. **`feature/master-cmd-k`** — добавить command palette + горячую клавишу.
   Изолированный PR.
3. **`feature/master-access-split`** — распилить экран `Доступ` на 4
   блока + 4 хука.
4. **`feature/master-rails-split`** — `RailsList` + `RailEditor` в
   отдельные файлы.
5. **`feature/master-mix-builder-fullpage`** — переключить `MixBuilder`
   с Sheet на full-page route (`/mixes/:id/edit`). Это **поведенческое
   изменение** — требует ревью.
6. **`feature/master-density-token`** — внедрить `--row-h` и
   `data-density`. По всем спискам.
7. **`feature/master-tobaccos-stats`** — добавить stats-полосу на
   `InventoryView`.

Каждый PR — зелёный gate:

```bash
cd apps/nomad-master-web && npm test && npm run build
cd tests/nomad-smoke && npm run smoke   # после фронта обязательно (CLAUDE.md §3)
```

---

## Что **не** в этом handoff

- Изменения схемы Prisma / backend / Telegram-бота — нет.
- Изменения публичных API контрактов (`apps/nomad-backend/...`) — нет.
- Изменения `nomad-aroma-web` — нет (для него отдельный handoff
  `design/design_handoff_aroma_atelier/`).
- Новая палитра / новые шрифты — нет, оставляем текущие
  `Geist + Fraunces` и `--primary` терракоту.
- Drag-and-drop библиотека — нет, нативный HTML5 DnD.
- TanStack Query / стейт-менеджер — нет, продолжаем на `useEffect`.

---

## Файлы прототипа

| Файл | Размер | Содержит |
|---|---|---|
| `mockups.html` | ~2 KB | Точка входа, script-тэги, root |
| `master/styles.css` | ~1600 строк | Все CSS-токены и стили |
| `master/app.jsx` | ~460 строк | App shell, routing, CRUD handlers, TopBar, dashboard placeholder |
| `master/screens.jsx` | ~815 строк | MixesList, TobaccosList, TobaccoEditor, RailsList, RailEditor |
| `master/mix-builder.jsx` | ~590 строк | MixBuilder + ProportionBar + LibraryItem + ComponentCard + co-occurrence |
| `master/access.jsx` | ~830 строк | AccessView + 6 блоков и редакторов |
| `master/cmdk.jsx` | ~150 строк | CommandPalette |
| `master/ui.jsx` | ~200 строк | Прим. UI-примитивы (в продакшен НЕ идут, см. shadcn) |
| `master/data.jsx` | ~390 строк | Sample data + helpers |
| `master/tweaks-panel.jsx` | ~530 строк | Runtime tweaks panel (НЕ нужна в проде) |

---

## Главное правило

Прототип — это **проект интерфейса**, не код для копипасты.
Используйте его как референс по плотности, иерархии, layout и
поведенческим деталям. Реальные компоненты пишите на shadcn-примитивах
из `apps/nomad-master-web/src/components/ui/` и токенах из
`apps/nomad-master-web/src/styles.css`. Если чего-то нет — добавляйте
в `styles.css` или `components/ui/` с обоснованием в PR-описании.

**Если есть сомнение — сначала задать вопрос или предложить вариант,
а не молча принимать решение.** (`CLAUDE.md`)
