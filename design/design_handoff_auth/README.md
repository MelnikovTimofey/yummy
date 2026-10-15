# Handoff: Nomad Yummy: Master — Auth screen refactor

## Overview

Полный редизайн страницы авторизации Master (внутренней операционной консоли для кальянных мастеров и администраторов). Старая версия имела сплит-лейаут на три колонки, маркетинговый блок «Что внутри», бейдж среды (`localhost:3021`), чипы навигации внизу и большое количество дополнительного текста. Новая версия — **одна центрированная карточка** с минимумом информации: бренд, заголовок, два поля, кнопка.

## About the Design Files

Файлы в этом бандле — **референсный HTML-прототип**, а не код для копирования as-is. Задача — **воспроизвести экран в существующем окружении проекта** (используемый фреймворк / UI-kit / систему стилей), повторив визуал, состояния и поведение. Если фреймворк ещё не выбран — выбрать тот, который уместен в проекте, и реализовать на нём.

CSS-токены (см. `reference/styles.css`) — это **источник правды по цветам, типографике, радиусам и теням** для всего Master. Их следует либо подключить как есть (если проект ещё не имеет дизайн-системы), либо смапить на существующие токены приложения. Не вводите новые «свои» оттенки для этого экрана — он должен жить в одной палитре с остальным Master.

## Fidelity

**Hi-fi.** Цвета, типографика, отступы, состояния и анимации — финальные. Воспроизводить пиксель-в-пиксель.

## Screens / Views

### Screen: Login

**Purpose:** аутентифицировать сотрудника (мастер / администратор) при входе в смену. Никаких регистрации, восстановления пароля и SSO — это внутренний инструмент, учётки заводит админ.

**Layout (desktop & mobile, single breakpoint at 460px):**

- `<body>` — `min-height: 100vh`, `display: grid; place-items: center;`, padding `32px 20px`.
- Фон: `var(--bg-base)` + сверху радиальный градиент `radial-gradient(ellipse 80% 60% at 50% 0%, oklch(0.22 0.018 38 / 0.9), transparent 70%)` (тёплое световое пятно сверху, очень мягкое).
- Поверх фона — `::before` с точечной текстурой: `radial-gradient(oklch(0.4 0.014 45 / 0.16) 1px, transparent 1px)`, `background-size: 24px 24px`, замаскированной радиальной маской по центру, `position: fixed; inset: 0; z-index: 0`.
- Контентный контейнер `.auth`: `max-width: 420px`, `display: flex; flex-direction: column; gap: 28px;`, `z-index: 1`.

В контейнере по вертикали:

1. **Brand row** — лого + название (центрировано).
2. **Card** — заголовок, подзаголовок, форма.
3. **Footer** — версия + ссылка на помощь.

#### Component: Brand row

- `display: flex; gap: 10px; align-items: center; justify-content: center;`
- **Mark (логотип)**:
  - `28×28px`, `border-radius: var(--r-sm)` = 6px
  - Фон: `linear-gradient(135deg, var(--accent), oklch(0.5 0.12 30))`
  - Box-shadow (трёхслойный): inset `0 1px 0 oklch(0 0 0 / 0.4)`, ring `0 0 0 1px oklch(0.66 0.13 38 / 0.3)`, drop `0 8px 24px -10px oklch(0.66 0.13 38 / 0.5)`
  - Содержимое: буква `N`, `font-family: var(--font-serif)`, `font-size: 18px`, `font-weight: 600`, цвет `var(--accent-fg)`
- **Brand name**:
  - Текст: `Nomad <em>Master</em>` (Master в `<em>` со стилем `font-style: normal; color: var(--text-muted); font-weight: 400`)
  - `font-family: var(--font-serif); font-size: 15px; letter-spacing: 0.02em; color: var(--text-primary)`

#### Component: Card

- `background: var(--bg-raised)` = `oklch(0.195 0.012 45)`
- `border: 1px solid var(--border-subtle)`
- `border-radius: var(--r-xl)` = 16px
- `padding: 32px 32px 28px` (мобильно `24px 22px 22px`)
- Тень: inset highlight `0 1px 0 oklch(1 0 0 / 0.03) inset` + `var(--shadow-lg)` (см. токены)

Внутри карточки сверху вниз:

##### Title
- Текст: **`Войти в смену`**
- `font-family: var(--font-serif); font-size: 28px; font-weight: 500; letter-spacing: -0.01em; color: var(--text-primary)`
- На мобильном — 24px

##### Subtitle
- Текст: **`Операционная консоль для кальянных мастеров и администраторов.`**
- `margin: 6px 0 24px; font-size: 14px (var(--fs-md)); color: var(--text-muted); line-height: 1.5`

##### Form
- `display: flex; flex-direction: column; gap: 14px`
- Каждое поле = блок из:
  - **Label**: caps + моно, `font-family: var(--font-mono); font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--text-muted); margin-bottom: 8px`. Лейбл лежит в `display:flex; justify-content:space-between` (под будущие ссылки справа — например, «Забыли?», но сейчас правый слот пуст).
  - **Input wrapper** `.auth__input`: `display: flex; align-items: center; gap: 8px; height: 44px; padding: 0 12px; background: var(--bg-base); border: 1px solid var(--border-default); border-radius: var(--r-md)` (= 8px).
    - Внутри: ведущая иконка (Lucide, `14×14`, `currentColor`, цвет — наследует от обёртки, по умолчанию `var(--text-primary)`), затем `<input>`.
    - У поля пароля справа — кнопка `.auth__reveal` (см. ниже).
  - **Input element**: `background: transparent; border: 0; outline: 0; height: 100%; font-family: var(--font-mono); font-size: 15px; letter-spacing: 0.01em; color: var(--text-primary)`. Placeholder — `var(--text-faint)`.
- **Focus state** (`:focus-within` на wrapper): `border-color: var(--accent-border)`, `background: oklch(0.16 0.012 45)`, `box-shadow: 0 0 0 4px var(--accent-soft)`.
- Transition: `border-color 120ms ease, background 120ms ease, box-shadow 120ms ease`.

###### Field: Логин
- Label: `Логин`
- Иконка (Lucide `user`): человек с головой-кружком
- `<input type="text" name="username" autocomplete="username" spellcheck="false" autocapitalize="none" placeholder="admin" required autofocus>`

###### Field: Пароль
- Label: `Пароль`
- Иконка (Lucide `lock`): висячий замок
- `<input type="password" name="password" autocomplete="current-password" placeholder="••••••••" required>`
- **Reveal button** `.auth__reveal`:
  - `32×32`, `border-radius: var(--r-sm)`, color `var(--text-muted)`, прозрачный фон
  - Hover: `background: var(--bg-elevated)`, `color: var(--text-primary)`
  - Focus-visible: `outline: 2px solid var(--accent-border); outline-offset: 1px`
  - Содержит две SVG-иконки Lucide (`eye` и `eye-off`, 16×16); переключаются по `pwd.type`.
  - `aria-label`/`title` синхронно меняются: «Показать пароль» ↔ «Скрыть пароль». `aria-pressed` — `true`/`false`.
  - При клике фокус возвращается в `<input>` (`preventScroll: true`).
- **Caps Lock hint** `.auth__caps`:
  - Скрыт по умолчанию (`display: none`). Виден при `data-on="true"` (`display: inline-flex`).
  - Содержимое: маленькая жёлтая точка `6×6` (`background: var(--warning)`, `box-shadow: 0 0 0 3px var(--warning-soft)`) + текст `Включён Caps Lock`.
  - Стиль: `margin-top: 8px; font-family: var(--font-mono); font-size: 11px; color: var(--warning)`.
  - Логика: на `keydown`/`keyup` в поле пароля читаем `e.getModifierState('CapsLock')`. На `blur` — сбрасываем.

##### Error block (`.auth__error`)
- По умолчанию `display: none`. При ошибке `data-on="true"` → `display: flex`.
- `margin-top: 14px; padding: 10px 12px; gap: 8px; align-items: flex-start`
- `background: var(--danger-soft)`, `border: 1px solid oklch(0.66 0.18 25 / 0.45)`, `border-radius: var(--r-md)`
- Текст: `font-size: var(--fs-md); color: oklch(0.85 0.12 25)`. Слева — Lucide `alert-circle` 14×14.
- Сообщения:
  - `Введите логин и пароль` — если поле пустое
  - `Неверный логин или пароль` — если бэкенд вернул `401`
- Прячется автоматически при `input` в любом из полей.

##### Submit button (`.auth__submit`)
- `margin-top: 10px; width: 100%; height: 46px; border-radius: var(--r-md)`
- `background: var(--accent)`; `color: var(--accent-fg)`; `border: 1px solid var(--accent)`
- `font-family: var(--font-sans); font-size: 16px (var(--fs-lg)); font-weight: 500`
- Содержимое: текст `Войти` + стрелка-вправо (Lucide `arrow-right`, `currentColor`)
- States:
  - Hover: `background/border: var(--accent-hover)`
  - Active: `transform: translateY(1px)`
  - Disabled: `opacity: 0.55; cursor: not-allowed`
  - Loading: текст меняется на `Проверяем…`, кнопка `disabled`
  - Success (опционально, до навигации): текст `Готово`
- Transition: `background 120ms ease, border-color 120ms ease, transform 100ms ease`

#### Component: Footer

- `text-align: center; font-family: var(--font-mono); font-size: var(--fs-sm); letter-spacing: 0.04em; color: var(--text-faint)`
- Содержимое: `v2.4.0 · <a href="#">помощь</a>`
- Версию подставлять из билда (env var или package.json). Ссылка `помощь` — на внутреннюю страницу/Телеграм администратора (URL уточнить у бэкенд-команды).

## Interactions & Behavior

- **Submit:**
  - `<form onsubmit>` — `preventDefault`, валидация (оба поля непустые), затем POST на эндпоинт авторизации проекта.
  - Во время запроса: `submitBtn.disabled = true`, текст → `Проверяем…`.
  - При успехе: навигация на главный экран (`/` или `/dashboard` — по архитектуре проекта).
  - При ошибке: показать `auth__error`, выделить пароль (`pwd.select()`), снять disabled, вернуть текст `Войти`.
- **Reveal password:** клик по кнопке-глазу переключает `type="password" ↔ "text"`. Иконка и `aria-label` синхронизируются. Фокус остаётся в поле.
- **Caps Lock:** индикатор появляется только когда поле пароля сфокусировано и Caps включён.
- **Reset error:** при любом `input` в `login` или `password` блок ошибки скрывается.
- **Autofocus:** курсор в поле `Логин` при монтировании.
- **Браузерный autofill:** работает (используем `autocomplete="username" / current-password`). Стилизация автозаполнения может потребовать `-webkit-autofill` override на тёмной теме — учесть при имплементации.
- **Enter:** в любом поле триггерит submit (стандартное поведение формы — не ломать).

## State Management

Локальный стейт компонента:

| Поле | Тип | Что хранит |
|---|---|---|
| `username` | string | значение логина |
| `password` | string | значение пароля |
| `showPassword` | boolean | видимость пароля |
| `capsOn` | boolean | состояние Caps Lock (для пароля в фокусе) |
| `loading` | boolean | идёт ли запрос |
| `error` | string \| null | текст ошибки |

Сетевой запрос — один: POST `/api/auth/login` (или эквивалент в проекте) с `{ username, password }`. Успех → сохранить токен / куку / сессию по принятому в проекте механизму и сделать редирект.

## Design Tokens

Источник: `reference/styles.css` (полный файл). Ниже — то, что использует именно этот экран.

### Colors

| Token | Value (oklch) | Где используется |
|---|---|---|
| `--bg-base` | `oklch(0.155 0.012 45)` | фон body, фон input |
| `--bg-raised` | `oklch(0.195 0.012 45)` | фон карточки |
| `--bg-elevated` | `oklch(0.235 0.013 45)` | hover у reveal-кнопки |
| `--border-subtle` | `oklch(0.27 0.012 45 / 0.6)` | border карточки |
| `--border-default` | `oklch(0.32 0.013 45)` | border input |
| `--text-primary` | `oklch(0.97 0.005 45)` | заголовок, текст input |
| `--text-secondary` | `oklch(0.78 0.012 45)` | бренд-ряд |
| `--text-muted` | `oklch(0.62 0.014 45)` | subtitle, label, иконки |
| `--text-faint` | `oklch(0.48 0.014 45)` | placeholder, footer |
| `--accent` | `oklch(0.66 0.13 38)` | кнопка submit, лого, border при focus |
| `--accent-hover` | `oklch(0.72 0.14 38)` | hover submit |
| `--accent-soft` | `oklch(0.66 0.13 38 / 0.14)` | focus ring |
| `--accent-border` | `oklch(0.66 0.13 38 / 0.4)` | border при focus, focus-visible outline |
| `--accent-fg` | `oklch(0.12 0.02 38)` | текст на акценте |
| `--warning` | `oklch(0.82 0.13 75)` | caps lock индикатор |
| `--warning-soft` | `oklch(0.82 0.13 75 / 0.14)` | свечение caps lock |
| `--danger-soft` | `oklch(0.66 0.18 25 / 0.14)` | фон ошибки |

### Typography

| Token | Value |
|---|---|
| `--font-serif` | `"Source Serif 4", "Source Serif Pro", Georgia, serif` |
| `--font-sans` | `"IBM Plex Sans", -apple-system, "Segoe UI", system-ui, sans-serif` |
| `--font-mono` | `"IBM Plex Mono", "SF Mono", Menlo, monospace` |

Шрифты — Google Fonts, нужны веса: Source Serif 4 400/500/600 (opsz 8..60), IBM Plex Sans 400/500/600, IBM Plex Mono 400/500.

| Use | Family / size / weight |
|---|---|
| Title `Войти в смену` | serif / 28px (mob: 24) / 500 / letter-spacing -0.01em |
| Subtitle | sans / 14px / 400 / line-height 1.5 |
| Brand name | serif / 15px / 400 / letter-spacing 0.02em |
| Field label | mono / 10.5px / 400 / uppercase / letter-spacing 0.12em |
| Input | mono / 15px / 400 / letter-spacing 0.01em |
| Submit button | sans / 16px / 500 |
| Caps hint | mono / 11px / 400 |
| Footer | mono / 12px / 400 / letter-spacing 0.04em |

### Spacing

Из `--space-*` шкалы (4/8/12/16/20/24/32/40). Конкретно используется:

- Вертикальный gap между бренд-рядом, карточкой и футером — **28px**
- Padding карточки — **32px 32px 28px** (mobile: `24px 22px 22px`)
- Gap между полями — **14px**
- Subtitle margin-bottom до формы — **24px**
- Label → input — **8px**
- Submit margin-top — **10px**
- Body padding — **32px 20px**

### Radius

| Token | Value | Где |
|---|---|---|
| `--r-sm` | 6px | лого, reveal-кнопка |
| `--r-md` | 8px | input, кнопки, error-блок |
| `--r-xl` | 16px | карточка |

### Shadows

- Карточка: `inset 0 1px 0 oklch(1 0 0 / 0.03), 0 24px 60px -20px oklch(0 0 0 / 0.7), 0 2px 0 0 oklch(0 0 0 / 0.45)` (= `--shadow-lg`)
- Лого: `inset 0 1px 0 oklch(0 0 0 / 0.4), 0 0 0 1px oklch(0.66 0.13 38 / 0.3), 0 8px 24px -10px oklch(0.66 0.13 38 / 0.5)`
- Focus ring: `0 0 0 4px var(--accent-soft)`
- Caps dot: `0 0 0 3px var(--warning-soft)`

### Motion

- Inputs/кнопки: `120ms ease` для `border-color`, `background`, `box-shadow`, `color`
- Кнопка active press: `100ms ease` для `transform`

## Assets

- **Иконки** — [Lucide](https://lucide.dev). Конкретно: `user`, `lock`, `eye`, `eye-off`, `alert-circle`, `arrow-right`. Можно использовать `lucide-react` / `lucide-vue-next` и т.п. в зависимости от стека. В HTML-референсе они инлайнены как SVG для самодостаточности.
- **Шрифты** — Google Fonts (см. выше). В продакшене лучше захостить локально или через свой CDN.
- **Изображений нет.** Лого — CSS-градиент с буквой `N`. Если в проекте есть реальный SVG-логотип Nomad — заменить на него.

## Files

В этом бандле:

- `Auth.html` — рабочий HTML/CSS/JS прототип финального экрана. Открыть в браузере, чтобы увидеть все состояния (рабочие учётки для демо: `admin/admin` и `nomad/nomad` — оба показывают success; любое другое сочетание — ветку ошибки).
- `reference/styles.css` — полный файл дизайн-токенов Master. Из него экран берёт CSS-переменные. Желательно подключить целиком (или смапить токены на существующие переменные приложения).

## Что было убрано относительно старой версии (на всякий случай)

Чтобы избежать соблазна «вернуть как было», список того, что в новой версии **сознательно отсутствует** — это решение продукта, не упущение:

- Сплит-лейаут с тремя колонками
- Маркетинговый блок «Что внутри / маршрут работы»
- Бейдж среды `Локальная среда / localhost:3021`
- Подсказка с дефолтными логинами на самом экране (`admin / nomad`)
- Чипы навигации внизу (`Сводка смены`, `Инвентарь`, `Telegram`)
- Декоративные иконки, не несущие функции

Если что-то из этого понадобится вернуть — обсудить с дизайнером отдельно, **не возвращать «по памяти»**.
