# Handoff: Aroma Atelier — refactor

Mobile-web редизайн гостевого приложения **Nomad Aroma Atelier**
(`apps/nomad-aroma-web` в монорепо). Передаётся для интеграции через
Claude Code.

---

## О файлах в бандле

Файлы в `aroma/` и `mockups.html` — это **дизайн-референсы**,
интерактивные HTML-прототипы в React + Babel (loose JSX через
`<script type="text/babel">`). **Не нужно копировать этот HTML в
продакшен.** Задача — воссоздать выбранные экраны в существующей
кодовой базе (`apps/nomad-aroma-web`: React 18 + Vite + TS + Tailwind v4
с `@theme inline` + shadcn/new-york baseColor neutral + lucide), используя
её установленные паттерны, токены и shadcn-примитивы.

Что есть в бандле:

- `mockups.html` — собранный холст **только с выбранными вариантами**.
  Откройте в браузере (`open mockups.html` или статический сервер) —
  девять экранов в порядке гостевого пути, можно панорамировать,
  открывать любой во весь экран (двойной тап / иконка expand).
- `aroma/aroma-shared.jsx` — бренд-токены, sample data
  (миксы, профили, вкусы), shared-примитивы:
  `PhoneShell, Topbar, CodeChip, Chip, CapsLabel, CTA, GhostButton,
  SegmentNav, ProfileGlyph, SignatureBar, RatingPill, BottomDock,
  PhoneBody`.
- `aroma/*.jsx` — исходники каждой секции. Файлы содержат **все
  варианты A/B/C** для контекста; в продакшен идёт только выбранный
  компонент (отмечено в этом README).
- `aroma/design-canvas.jsx` — рендерер холста. **Не нужен в проде.**

## Фидельность

**High-fidelity.** Точные цвета (hex), типографика, межбуквенные
интервалы, отступы, радиусы, тени — те же, что уже зафиксированы в
бренде Nomad (см. §`Design tokens`). Используйте существующие
CSS-переменные из `apps/nomad-aroma-web/src/styles.css` — не плодите
новые токены.

Цветовые «олфакторные сигнатуры» профилей (`profileColor` в
`aroma-shared.jsx`) — **новые**, их нужно вынести в токены.

---

## Выбранные варианты

| Экран | Файл прототипа | Компонент | Куда смотреть в App.tsx |
|---|---|---|---|
| Авторизация (18+ + код) | `aroma/auth.jsx` | `AuthMinimal` | `view === 'access'` блок |
| Знакомство | `aroma/intro.jsx` | `IntroSwipe` | `view === 'intro'` |
| Онбординг | `aroma/onboarding.jsx` | `OnboardingSteps` | `view === 'onboarding'` |
| Подбор | `aroma/recommendations.jsx` | `RecommendationsHero` | `view === 'recommendations'` |
| Каталог | `aroma/catalog.jsx` | `CatalogInline` | `view === 'catalog'` |
| Витрина | `aroma/showcase.jsx` | `ShowcaseTabs` | `view === 'showcase'` |
| Карточка микса | `aroma/mix-card.jsx` | `MixCardHero` | `MixDetailModal` |
| Карточка для мастера | `aroma/extras.jsx` | `SmokeCardPremium` | пост-«Покурить» state |
| Раскрытый рельс | `aroma/extras.jsx` | `RailView` | `view === 'rail'` |

Остальные `*A / *C` варианты в файлах оставлены как контекст; **в
продакшен не идут**.

---

## Design tokens

Большинство уже зафиксировано в `apps/nomad-aroma-web/src/styles.css`
под `:root`. Новые токены отмечены `[new]` — их нужно добавить.

### Цвета

```css
--background:        #130807;  /* canvas */
--surface:           #1b0d0e;  /* card */
--surface-alt:       #271314;
--surface-elevated:  #351717;
--primary:           #d8ab68;  /* warm gold */
--accent-soft:       #f2d5a5;  /* hi-light text-on-warm */
--accent-deep:       #8c2d24;  /* burgundy */
--ember:             #ee9d45;  /* coal hot-spot */
--text-0:            #f8eee8;
--text-1:            #d0b5a3;
--text-2:            #8e7464;  /* [new] meta/caps */
--line:              rgba(193,141,106,0.22);
--line-soft:         rgba(193,141,106,0.12);  /* [new] */
--danger:            #df6f5b;
```

#### Brand emblem gradient
`linear-gradient(180deg, #7a1e1a 0%, #541311 100%)` (PRD §10 — primary).

#### Olfactory profile signatures `[new]`
Каждому `flavorProfile` присваивается оттенок. Используется в
`ProfileGlyph`, `SignatureBar`, чипах профилей.

```ts
const profileColor: Record<FlavorProfile, string> = {
  citrus:        '#e8b948',
  berry:         '#a23048',
  floral_herbal: '#7a9560',
  fresh:         '#7fb5a3',
  sweet:         '#d98c5a',
  spicy:         '#c0492c',
  dessert:       '#b07747',
  tobacco:       '#7a5236',
  minty:         '#6ba88a',
  fruity:        '#dd8a4a',
  perfume:       '#c787a8',
  sour:          '#bcb04a',
};
```

### Типографика

```css
--font-display: "Iowan Old Style","Palatino Linotype","Book Antiqua",Georgia,serif;
--font-body:    "Avenir Next","Helvetica Neue","Segoe UI",sans-serif;
```

Шкала и трекинг:

| Роль | Стиль |
|---|---|
| H1 hero (Auth, Mix card) | `font-display`, 30–34 px, line-height 1.0–1.05, `letter-spacing: 0.005em` |
| H2 секция | `font-display`, 22–26 px, line-height 1.05–1.1 |
| H3 карточка | `font-display`, 15–17 px, line-height 1.1 |
| Body | `font-body`, 13–14 px, line-height 1.5 |
| Meta / hint | `font-body`, 11–12 px, line-height 1.4, color `--text-1` |
| **Caps-метка** | `font-body`, 10.5–11 px, `letter-spacing: 0.16em–0.22em`, `text-transform: uppercase`, color `--text-2`, font-weight 500 |
| Numeric (proportion, rating) | `tabular-nums` |
| Code input slots | `font-display`, 24–40 px, `letter-spacing: 0.32em` |

### Радиусы, тени, фоны

```css
--radius:          0.95rem;     /* base */
--radius-card:     18px;
--radius-card-lg:  22px;
--radius-phone:    28px;
--radius-pill:     999px;
```

#### Карточка (mix-row, auth-card)
```css
background: linear-gradient(180deg, rgba(34,15,16,0.96) 0%, rgba(22,11,12,0.88) 100%);
border:     1px solid var(--line);
box-shadow:
  inset 0 1px 0 rgba(255,244,236,0.04),
  0 14px 28px rgba(0,0,0,0.18);
```

#### Phone-shell ambient
```css
background:
  radial-gradient(circle at 50% -10%, rgba(122,28,25,0.55), transparent 36%),
  radial-gradient(circle at 90% 12%, rgba(238,157,69,0.18), transparent 30%),
  radial-gradient(circle at 0% 95%, rgba(238,157,69,0.10), transparent 35%),
  linear-gradient(180deg, #1d0a0a 0%, #130807 60%, #0d0405 100%);
```

#### Topbar (sticky)
```css
padding: 18px 20px 12px;
border-bottom: 1px solid var(--line-soft);
background: linear-gradient(180deg, rgba(37,14,15,0.92) 0%, rgba(28,11,12,0.62) 100%);
backdrop-filter: blur(18px);
```

### Анимации

#### Ember-glow на CTA «Покурить» (PRD: «короткий ember-glow, без bounce»)
```css
@keyframes aroma-ember {
  0%   { box-shadow: 0 0 0 0  rgba(238,157,69,0.45), 0 14px 26px rgba(140,45,36,0.32); }
  60%  { box-shadow: 0 0 0 18px rgba(238,157,69,0),   0 14px 26px rgba(140,45,36,0.32); }
  100% { box-shadow: 0 0 0 0  rgba(238,157,69,0),     0 14px 26px rgba(140,45,36,0.32); }
}
.cta-pulse { animation: aroma-ember 1.6s ease-out infinite; }
```

### Tailwind v4 (@theme inline)

Не плодить новые `--color-*`. Добавить только новое:
- `--text-2` → `text-muted` (replace, если уже занято — добавить `text-meta`)
- `--line-soft` → `border-faint`
- `--profile-citrus`, `--profile-berry`, … → можно через CSS-переменные,
  не через @theme (не цвет UI, а данные).

---

## Reusable atoms (must extract)

Все экраны опираются на пять примитивов. Положить в
`apps/nomad-aroma-web/src/components/aroma/` (или эквивалент).

### `<PhoneShell>`
Контейнер 100dvh, max-width 430, radius 28, ambient halos.
Уже есть как `.phone-shell` в styles.css — переиспользовать,
не дублировать.

### `<Topbar right={…} navBelow={…}>`
- Высота с safe-top.
- Серфным дисплейным «nomad» (lowercase, 28 px, letter-spacing 0.02em).
- `right` — CodeChip «Новый код».
- `navBelow` — `<SegmentNav>` или прогресс/тулбар.

### `<SegmentNav items value onChange>`
Pill-tabs. Активный таб — `linear-gradient(180deg,#e0b878,#cb974c)`,
текст `#2b160f`. Неактивный — `rgba(56,24,22,0.54)` + `--text-1`.
Высота 40, гриды `repeat(N, 1fr) gap: 6`.

### `<Chip tier="lg|sm" color active onClick>`
**Три тира** (PRD §6): профили (lg, цветная точка слева), вкусы (sm),
мета — не интерактивные caps-метки.
- `tier=lg`: 13 px, padding 10×14, opt. coloured dot 8×8.
- `tier=sm`: 12 px, padding 7×12.
- active: border `--primary`, fill `linear-gradient(180deg, rgba(216,171,104,0.20), rgba(140,45,36,0.18))`, color `--accent-soft`.

### `<CTA pulse disabled>`
Primary 52 px, gradient `#e0b878 → #c08a4a`, color `#23120d`,
radius 14, caps 13 px, letter-spacing 0.18em.
`pulse` → `aroma-ember` animation (см. выше).

### `<ProfileGlyph profiles={Profile[]} size={56}>`
**Замена пустых color-block в текущих карточках.** Квадрат с
3 размытыми кругами цветов профилей (mix-blend-mode: screen, blur 2px).
Раскладка координат прописана в `aroma/aroma-shared.jsx` — скопировать
один-в-один.

### `<SignatureBar profiles height={3-6}>`
Горизонтальная полоса из сегментов профильных цветов, равные ширины,
border-radius 999. Линейный градиент внутри сегмента 90deg.

### `<RatingPill rating count?>`
Капсула с ★ + число. `rating.toFixed(1).replace('.', ',')`.

---

## Экраны

### 1. Авторизация — `AuthMinimal` (вариант C)

**Цель:** age-gate 18+ обязателен; ввод ежедневного кода.

**Лейаут:**
- PhoneShell, halo overlay сверху (`radial-gradient(circle at 50% 12%, rgba(140,45,36,0.6) 0%, transparent 38%)`).
- Topbar нет.
- Контент: `padding: 70px 28px 28px`, flex column, gap 36.
- Сверху — serif «nomad» 44 px + caps-метка «Арома Ателье · Лаундж».
- Snap to bottom: `margin-top: auto` блок с инпутом + чекбоксом + CTA.

**Поля:**
- **Код мастера**: text input, transparent fill,
  `border-bottom: 1px solid var(--line)`, padding `12px 0`,
  font-display 40 px, letter-spacing 0.32em, center-aligned, uppercase.
  Maxlength 6. Подпись 11.5 px `--text-2`: «Спросите у мастера зала — действует до 06:00».
- **18+ checkbox**: круг 20×20, border `--primary`, fill `--primary`,
  чек белый/тёмный (color `#23120d`, font-weight 700).
- **CTA «Войти в Ателье»**: disabled пока `!age || code.length < 4`.

**Футер:** caps-метка по центру «18+ · Курение вредит здоровью».

**State:** `age: boolean`, `code: string`.

**Поведение:**
- Submit → `POST /guest/access-code/verify` (уже реализован в App.tsx — `fetchGuestAccess`).
- При ошибке — `screen-status.error` инлайном под CTA, цвет `--danger`.

### 2. Знакомство — `IntroSwipe` (вариант A)

**Цель:** объяснить за 4 шага. PRD: «горизонтальные карточки-шаги, без скролла страницы».

**Лейаут:**
- Topbar с CodeChip + SegmentNav («Знакомство» / «Предпочтения»).
- Контент 100% высоты, без скролла. Каждый шаг — отдельный экран.
- **Водяной знак номера шага** в правом верхнем: serif 96 px, color `rgba(216,171,104,0.06)`.
- Caps-метка «Шаг 01 · из 04» сверху-слева.
- H1 serif 34 px, body 15 px, ширина 30ch.

**Шаги (контент):**
```
01 — Расскажите, что хочется
     «Несколько касаний по профилям и нотам. Подбор соберём под ваше настроение.»
02 — Покажите карточку мастеру
     «Тапните «Покурить» — мастер увидит состав и пропорции на экране.»
03 — Оцените, если зашло
     «Оценка помогает другим гостям. Никакой регистрации не нужно.»
04 — Только то, что в наличии
     «Рекомендации учитывают табаки на кухне сегодня — пустых попыток не будет.»
```

**Футер (BottomDock):**
- Прогресс-пипы: 4 точки 6×6, активная вытянута до 22×6, color `--primary`.
- CTA «Дальше» (на последнем — «Перейти к подбору», pulse=true).
- Текстовая кнопка «Пропустить знакомство» (caps, `--text-2`).

**State:** `step: 0..3`.

**Жесты:** свайп влево/вправо опционально. Минимум — тап по CTA.

**Сохранение:** на завершении → `intro_completed` event + `introSeen = true` в localStorage (`storageKeys.introSeen`).

### 3. Онбординг — `OnboardingSteps` (вариант B)

**Цель:** короткий выбор `flavorProfiles` + `flavors`. Sticky CTA, без скролла к кнопке.

**Лейаут:**
- Topbar:
  - `right`: CodeChip.
  - `navBelow`: ряд из «back-arrow», progress-bar (4 px высотой,
    fill `linear-gradient(90deg, #8c2d24 0%, #d8ab68 100%)`), caps `1/2`.

**Шаг 1 — Профили:**
- Caps «Шаг 1 · Профили».
- H2 serif 28 px «С чего начнём?».
- Body 13 px подсказка (ширина 32ch).
- 2-column grid: `grid-template-columns: repeat(2, 1fr); gap: 8`.
- Каждый профиль — кнопка-карточка 52 px высотой:
  - icon-dot 10×10 цвета профиля + box-shadow 0 0 0 4px rgba(c, 0.13) при active,
  - подпись 13 px,
  - active border `--primary`, fill warm-gradient (см. tokens).

**Шаг 2 — Вкусы:**
- Caps «Шаг 2 · Вкусы».
- H2 serif 28 px «Любимые ноты».
- Body «Опционально — но так подбор станет точнее.».
- Flow-wrap пилюль (`<Chip>` sm-tier), gap 7.
- Под пилюлями — секция «Сейчас выбрано»: chips от выбранных профилей
  (read-only, dot + label, 11 px).

**Footer (BottomDock):**
- pip-прогресс 2 точки.
- CTA на step 1 — «Далее»; на step 2 — «Показать подбор · N» (pulse).
- На step 2 — текстовая кнопка «Открыть каталог сразу».

**State:**
```ts
const [step, setStep] = useState<1|2>(1);
const [profiles, setProfiles] = useState<string[]>([]);
const [flavors, setFlavors]   = useState<string[]>([]);
```

**API:**
- `GET /guest/onboarding/options` (уже есть `fetchOnboardingOptions`).
- На «Показать подбор» — `POST /guest/onboarding/recommendations` с `{ likedProfiles, likedFlavors }`.

### 4. Подбор — `RecommendationsHero` (вариант B)

**Цель:** одна сильная hero-карточка + компактный список «тоже подходят».

**Лейаут:**
- Topbar + 3-tab SegmentNav (Подбор / Витрина / Каталог), активен «Подбор».
- Caps «Лучшее совпадение».
- **Hero card:**
  - radius 22, padding 18.
  - Background: `radial-gradient(circle at 80% 0%, ${profileColor[hero.profiles[0]]}55 0%, transparent 55%)` поверх card-gradient.
  - 14-px gap внутри.
  - Row1: ProfileGlyph 64×64 + (H2 serif 22 + body 12.5 описание).
  - SignatureBar 6 px.
  - Composition list: `grid-template-columns: 1fr auto`,
    каждая строка — `[caps maker]  [name]` и `[share]%`.
  - Row meta: RatingPill, caps «N выборов».
  - CTA «Покурить» pulse.
- Caps «Тоже подходят».
- Компактные строки (4 шт):
  - `grid-template-columns: 1fr auto`, gap 10, padding 10×12, radius 14.
  - Name (serif 14.5) → SignatureBar 3 px → flavors ellipsis (font 11).
  - Справа — RatingPill.

**API:** `POST /guest/onboarding/recommendations` (см. `fetchRecommendations`).

### 5. Каталог — `CatalogInline` (вариант B)

**Цель:** убрать стек фильтров с экрана результатов.

**Лейаут:**
- Topbar + SegmentNav (Каталог активен).
- **Control rail** (отдельный sticky-блок ниже topbar):
  - row 1: input search (height 38, radius 999, padding 0 14) + icon-button с иконкой sliders (38×38 круг). На кнопке — точка-индикатор `--primary` если есть скрытые фильтры.
  - row 2: horizontal-scroll профильных чипов (`overflow-x: auto`, gap 6). Каждый чип — `<Chip color={profileColor[p.id]}>`. Multi-select.
- Results grid:
  - caps «Найдено · N» / кнопка «Сбросить» когда есть фильтр.
  - vertical list, каждая строка — `52 + 1fr + auto`: ProfileGlyph 44 + (name serif 14.5 + flavors ellipsis 11) + RatingPill.

**Popover (фильтры за иконкой):**
- absolute-positioned в content area, top: 8, right/left: 20, radius 16, padding 14.
- 2 секции: «Сортировка» (3-button toggle) + «Вкусы» (chip wrap, max-height 132 с scroll).
- Submit «Готово» — primary CTA.

**State:**
```ts
const [query, setQuery]       = useState('');
const [profiles, setProfiles] = useState<string[]>([]);
const [flavors,  setFlavors]  = useState<string[]>([]);
const [sort,     setSort]     = useState<CatalogSort>('popularity');
const [popoverOpen, setPopover] = useState(false);
```

**Фильтрация:** инкрементальная — переключение чипа сразу триггерит
`loadCatalog({ profiles, flavors })`.

### 6. Витрина — `ShowcaseTabs` (вариант B)

**Цель:** разгрузить плотную страницу с двумя описаниями + сетками.

**Лейаут:**
- Topbar + SegmentNav (Витрина активен).
- **Category switcher** — горизонтальный ряд под topbar:
  - `display: flex; gap: 14; overflow-x: auto; padding: 12 20 4;`
  - Каждый таб = column [caps-метка типа рейла, serif title 19].
  - Активный имеет `border-bottom: 2px solid var(--primary)`.
- Список миксов выбранной категории:
  - Первая строка — hero-style (`60 + 1fr + auto`), фон с profile halo.
  - Остальные — `rgba(28,13,13,0.84)` плоский фон.

**Данные:** `GET /guest/home/rails`. Маппинг `rail.type → caps`:
- `statistical` → «Выбор гостей»
- `prepared`    → «Редакция»
- `curated`     → «Мастера»

**State:** `const [active, setActive] = useState<railId>(rails[0].id)`.

### 7. Карточка микса — `MixCardHero` (вариант A)

**Цель:** иерархия — имя → ольфакторный портрет → состав → CTA.

**Открывается как bottom-sheet** поверх предыдущего экрана.

**Лейаут (sheet):**
- Snap к bottom, max-height 92%, top-radius 26, ambient
  `radial-gradient(circle at 88% 0%, profileColor[profiles[0]]50 0%, transparent 50%)`.
- Drag-handle 40×4, по центру.
- **Row 1:** ProfileGlyph 72×72 + [caps «Подбор для вас», H1 serif 24, SignatureBar 4].
- Body 13.5 описание.
- **Tags row:** profile-chips (lg, active, цветная точка) + flavor-chips (sm).
- **Composition section:**
  - caps «Состав микса».
  - `<ProportionStack>` — 10-px высотой сегментированный bar, на сегмент цвет из палитры `['#d8ab68', '#c08a4a', '#a23048', '#7a9560', '#7fb5a3']`.
  - Список строк: `[colour-dot 10] [caps maker]  [name]  [share]%`.
- **Rating section:**
  - caps «Ваша оценка» + 5 кнопок-звёзд 28 px (border, fill при `rating >= v`).
- **Actions row:** Ghost «Закрыть» + CTA «Покурить» pulse.

**State:**
```ts
const [rating, setRating] = useState(0);
```

**API:**
- `POST /guest/events/smoke-cta` `{ mixId }` (уже есть `sendSmokeCta`).
- `POST /guest/mixes/:mixId/rating` `{ value }` (`sendMixRating`).

**Переход:** после `smoke-cta` → `SmokeCardPremium` overlay.

### 8. Карточка для мастера — `SmokeCardPremium` (вариант A)

**Цель:** PRD §8.7 — «чистая карточка-подтверждение для показа мастеру».

**Лейаут:**
- Без topbar nav, только мини-кнопка «Готово» справа.
- Halo сверху от первого профиля + снизу ember.
- **Centered stack:**
  - caps «Покажите мастеру», цвет `--primary`.
  - ProfileGlyph 96×96 (большой).
  - H1 serif 34 (по центру).
  - Профили — caps-метки через `·`.
  - SignatureBar 3 px.
- **Composition card:**
  - radius 18, padding 18, фон card-gradient.
  - Caps «Состав».
  - Каждая строка: name 15 + caps maker 10.5 → share 22 px serif, tabular.
- **Footer:**
  - meta-pill «Стол 7 · 21:42 · Код NMD7» (caps, центр).
  - GhostButton «Оценить, когда соберут».

**Опциональные данные:**
- Стол / время / код — **уточнить с продуктом**, нет в PRD как
  guest-данные. В прототипе — заглушки. Возможно, мастер сам видит
  это в своём интерфейсе; в `SmokeCard` оставить только имя + состав.

### 9. Раскрытый рельс — `RailView`

**Лейаут:**
- Кастомный topbar (не SegmentNav):
  - back-button 36 круг.
  - caps «Витрина · Мастера» + meta «N миксов».
  - CodeChip справа.
  - H2 serif 26 «От наших мастеров» + body описание.
- Quick-filter chip row (`Все`, профили) — horizontal-scroll.
- Vertical list (как Catalog rows, но 60×60 glyph).

---

## Маршрутизация

Текущий `App.tsx` использует `view` state. После рефактора — оставить
схему, но переименовать states:

```ts
type GuestView =
  | 'access' | 'intro' | 'onboarding'
  | 'recommendations' | 'showcase' | 'catalog' | 'rail'
  | 'mix-card' | 'smoke-confirmation';
```

`smoke-confirmation` — новый, после успешного `smoke-cta`.

LocalStorage keys без изменений: `nomad-aroma-age-confirmed`,
`nomad-aroma-access-granted`, `nomad-aroma-intro-seen`.

---

## Что НЕ менять (PRD-инварианты)

1. Никакого логина / профиля / избранного / истории — даже визуально.
2. «Покурить» = аналитическое событие + переход на карточку мастеру, не «заказ».
3. В рекомендациях и каталоге — только `available === true`.
4. Три раздельных таксономии (`flavorProfiles` / `flavors` / `flavorTags`).
5. Русский UI без англицизмов.
6. Mobile-only, phone-shell даже на десктопе.
7. Только тёмная тема.

---

## Реализация — последовательность

1. **Tokens** — добавить `--text-2`, `--line-soft`, и map `profileColor`
   в TS (`src/lib/profile-color.ts`).
2. **Atoms** — вынести `<Chip>`, `<CTA>`, `<SegmentNav>`,
   `<ProfileGlyph>`, `<SignatureBar>`, `<RatingPill>` в
   `src/components/aroma/`.
3. **Ember animation** — `cta-pulse` в `styles.css`.
4. **AuthMinimal** → заменить блок `view === 'access'`.
5. **IntroSwipe** → `view === 'intro'`. Удалить старый вертикальный
   scroll, оставить state `introIndex`.
6. **OnboardingSteps** → `view === 'onboarding'`. Состояние
   `step: 1|2`, plus прогресс-бар.
7. **RecommendationsHero** → `view === 'recommendations'`. Hero-rendering
   логика для первого элемента, компактный для остальных.
8. **CatalogInline** → `view === 'catalog'`. Сильно упростить
   `catalog-controls` блок, оставить только control-rail и popover.
9. **ShowcaseTabs** → `view === 'showcase'`. Из существующих `home-rail`
   данных сделать category switcher.
10. **MixCardHero** → переделать `MixDetailModal` в bottom-sheet.
    Использовать shadcn `Dialog` с кастомным content layout.
11. **SmokeCardPremium** → новый `view === 'smoke-confirmation'`.
12. **RailView** → `view === 'rail'` (existing screen) — обновить только
    layout и chip-row.

---

## Файлы для референса

Чтобы не «копировать HTML», но не терять детали — открыть рядом и
сверять стили / структуру:

```
mockups.html                       ← интерактивный preview
aroma/aroma-shared.jsx             ← все atoms, tokens, sample data
aroma/auth.jsx                     ← AuthMinimal (вариант C ниже в файле)
aroma/intro.jsx                    ← IntroSwipe (вариант A)
aroma/onboarding.jsx               ← OnboardingSteps (вариант B)
aroma/recommendations.jsx          ← RecommendationsHero (вариант B)
aroma/catalog.jsx                  ← CatalogInline (вариант B)
aroma/showcase.jsx                 ← ShowcaseTabs (вариант B)
aroma/mix-card.jsx                 ← MixCardHero (вариант A)
aroma/extras.jsx                   ← SmokeCardPremium + RailView
```

В каждом файле выбранный вариант — это **первый или соответствующий
named export** (см. таблицу «Выбранные варианты»).

---

## Открытые вопросы для продуктовой команды

1. **SmokeCard meta** — нужны ли «Стол / Время / Код» в гостевой
   карточке? Если нет — убрать строку, оставить только имя + состав.
2. **Onboarding skip** — должна ли «Открыть каталог сразу» быть
   доступна и на step 1?
3. **Catalog manufacturer filter** — в текущем App.tsx есть
   `selectedManufacturerIds`, в новом дизайне он скрыт. Сохранить или
   удалить?
4. **Rail view фильтр-чипы** — должны ли они фильтровать миксы
   внутри рейла или быть навигацией обратно в витрину?
