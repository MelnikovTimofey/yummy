# HANDOFF — Yummy

## 1.29) Move tag/flavor filters above manufacturer/tobacco in `Каталог` (9 марта 2026)

- Запрос:
  - в `Каталоге` на desktop и mobile блоки поиска по тегам и вкусовым фильтрам должны быть выше блоков по производителям и табакам.

- Реализация:
  - `YummyWeb/src/ui/CatalogScreen.tsx`:
    - в секции `catalog-advanced-filters` после строки `Сортировка` / `Мин. оценка` порядок изменён на:
      - `Теги`
      - `Профили вкуса`
      - `Вкусы`
      - `Производитель`
      - `Табак`
    - так как desktop и mobile используют один и тот же advanced-блок, перестановка сразу применяется в обеих версиях.

- Проверка:
  - `cd YummyWeb && npm run build` — `OK`.

## 1.28) Bring `Мои миксы` to the same mobile filter pattern (9 марта 2026)

- Запрос:
  - экран `Мои миксы` должен получить ту же mobile-механику фильтров, что уже сделана в `Каталоге` и `Избранном`.

- Реализация:
  - `YummyWeb/src/ui/MixesScreen.tsx`:
    - подключён `useMediaQuery('(max-width: 768px)')`;
    - добавлены applied-state для `profiles`, `flavors`, `tags`, `sortBy`;
    - mobile-screen переведён в `draft -> applied` flow;
    - добавлены:
      - `mixes-filters-toggle`
      - `mixes-advanced-filters`
      - sticky CTA `mixes-submit-sticky`
    - inline `Найти` на compact-width скрыта;
    - desktop сохранил старую модель через авто-синхронизацию applied-state.

- Проверка:
  - `cd YummyWeb && npm run build` — `OK`;
  - проверка через skill `playwright` на viewport `393x852`:
    - авторизация через `?token=...`;
    - переход `profile menu -> Мои миксы`;
    - mobile-layout фильтров и sticky CTA отображаются корректно.
  - артефакт:
    - `output/playwright/mobile-wave1/after/mixes-mobile-compact-filters.png`

## 1.27) Remove programmatic scroll after mobile submit (9 марта 2026)

- Проблема:
  - на iPhone после нажатия mobile `Найти` экран мог смещаться так, что верхний хедер уходил за пределы viewport.

- Причина:
  - после mobile-submit вызывался `scrollIntoView` к `catalog-results`;
  - на Safari это могло прокрутить весь shell/page вместо ожидаемого локального контента.

- Реализация:
  - `YummyWeb/src/ui/CatalogScreen.tsx`:
    - удалён `resultsRef`;
    - убран `scrollIntoView` после apply/reset.
  - `YummyWeb/src/ui/FavoritesScreen.tsx`:
    - выполнен тот же откат программной прокрутки.
  - Теперь mobile-submit делает только:
    - применение черновиков,
    - сворачивание фильтров.
  - Результаты показываются естественно за счёт уменьшения высоты filter-панели, без принудительного scroll.

- Проверка:
  - `cd YummyWeb && npm run build` — `OK`.

## 1.26) Sticky mobile `Найти` + deferred apply for `Каталог`/`Избранное` (9 марта 2026)

- Проблема:
  - mobile-пользователь выбирал фильтры глубоко в форме, после чего должен был возвращаться вверх к кнопке `Найти`;
  - логика применения была смешанной: поиск работал по submit, а часть фильтров перестраивала выдачу сразу.

- Реализация:
  - `YummyWeb/src/ui/CatalogScreen.tsx`:
    - введены applied-state поля для mobile-фильтров (`manufacturerIds`, `tobaccoIds`, `profiles`, `flavors`, `tags`, `minRating`, `sortBy`);
    - текущие контролы остаются draft-state;
    - submit на mobile:
      - переносит draft -> applied,
      - закрывает расширенный блок фильтров,
      - прокручивает экран к `catalog-results`;
    - на desktop applied-state синхронизируется автоматически, чтобы старый сценарий не изменился.
  - `YummyWeb/src/ui/FavoritesScreen.tsx`:
    - такой же draft/applied flow для `profiles`, `flavors`, `tags`, `sortBy`;
    - после mobile-submit панель фильтров сворачивается и экран уходит к результатам.
  - `YummyWeb/src/ui/styles.css`:
    - добавлен `catalog-mobile-submit-bar` со sticky-позицией;
    - `catalog-mobile-submit-btn` всегда доступна внизу mobile-панели;
    - inline-кнопка `Найти` на compact-width скрыта, чтобы не дублировать CTA.

- Проверка:
  - `cd YummyWeb && npm run build` — `OK`;
  - проверка через skill `playwright` на viewport `393x852`:
    - sticky CTA видна и в закрытом, и в открытом состоянии mobile-фильтров.
  - артефакты:
    - `output/playwright/mobile-wave1/after/catalog-mobile-sticky-find-collapsed.png`
    - `output/playwright/mobile-wave1/after/catalog-mobile-sticky-find-open.png`

## 1.25) Move mobile search CTA below input in `Каталог` и `Избранное` (9 марта 2026)

- Проблема:
  - на mobile кнопка `Найти` стояла в верхней строке рядом с поисковым полем и делала первую строку визуально тяжёлой.

- Реализация:
  - `YummyWeb/src/ui/styles.css`:
    - на `@media (max-width: 768px)` `search-row` переведён в одну колонку;
    - `catalog-find-btn` получает `width: 100%`, `min-height: 44px`, `margin-top: 0`;
    - desktop-layout не затронут.

- Проверка:
  - `cd YummyWeb && npm run build` — `OK`;
  - проверка через skill `playwright` на viewport `393x852` показала ожидаемую mobile-компоновку: поле сверху, кнопка поиска ниже.

## 1.24) Compact mobile filters for `Каталог` и `Избранное` (9 марта 2026)

- Проблема:
  - на мобильном блок фильтров занимал почти весь экран и скрывал результаты под первым viewport;
  - особенно это ломало восприятие `Избранного`: вместо списка пользователь видел длинную форму фильтрации.

- Реализация:
  - `YummyWeb/src/ui/hooks/useMediaQuery.ts`:
    - добавлен общий hook для `matchMedia`.
  - `YummyWeb/src/ui/CatalogScreen.tsx`:
    - введён `isCompactFilters` для ширины до `768px`;
    - расширенные фильтры вынесены в collapsible-блок `catalog-advanced-filters`;
    - добавлен toggle `catalog-filters-toggle`.
  - `YummyWeb/src/ui/FavoritesScreen.tsx`:
    - применена та же mobile-схема: поиск и summary остаются наверху, тяжёлые фильтры спрятаны за toggle;
    - добавлены `favorites-filters-toggle` и `favorites-advanced-filters`.
  - `YummyWeb/src/ui/styles.css`:
    - добавлены стили для `catalog-mobile-tools`, `catalog-mobile-filters-toggle`, `catalog-advanced-filters`;
    - убрано ошибочное CSS-ограничение по `480px`, из-за которого toggle мог исчезнуть на ширине `481-768px`.

- Проверка:
  - `cd YummyWeb && npm run build` — `OK`;
  - проверка через skill `playwright` на viewport `393x852`:
    - `Каталог`: сразу виден список результатов;
    - `Избранное`: сразу виден summary и карточки избранного, расширенные фильтры доступны по кнопке.
  - артефакты:
    - `output/playwright/mobile-wave1/after/catalog-mobile-compact-filters.png`
    - `output/playwright/mobile-wave1/after/favorites-mobile-compact-filters.png`

## 1.23) Fix rail headers: desktop top-align, mobile wrap, hide `Смотреть все` (9 марта 2026)

- Запрос:
  - на desktop CTA `Смотреть все` не должна быть ниже заголовка;
  - на mobile длинные заголовки должны влезать;
  - на mobile CTA `Смотреть все` должна быть скрыта.

- Реализация:
  - `YummyWeb/src/ui/HomeScreen.tsx`:
    - заголовочная кнопка рейла переведена на explicit utility-override:
      - `!flex !h-auto !w-full !items-start !justify-start !whitespace-normal !px-0 !py-0 text-left`
    - это гарантированно снимает влияние базового `AppButton` (`h-10`, `justify-center`, `whitespace-nowrap`).
  - `YummyWeb/src/ui/styles.css`:
    - `home-rail-head` теперь использует `align-items: flex-start`;
    - на `@media (max-width: 480px)`:
      - `home-rail-title` уменьшен до `24px`,
      - сохранён перенос длинных заголовков,
      - `home-link-btn` скрыт.

- Проверка:
  - `cd YummyWeb && npm run build` — `OK`;
  - проверка через skill `playwright`:
    - viewport `393x852`: mobile-заголовки не обрезаются и CTA скрыта;
    - viewport `1440x900`: CTA стоит на верхнем крае строки, а не ниже.

## 1.22) Fix mobile rail titles: keep wrapping, remove centering (9 марта 2026)

- Проблема:
  - после переноса шапки рейла в колонку заголовки перестали обрезаться, но стали визуально центрироваться из-за базового `AppButton/Button` (`justify-center`).

- Реализация:
  - `YummyWeb/src/ui/HomeScreen.tsx`:
    - в `className` кнопки заголовка добавлены:
      - `w-full`
      - `!justify-start`
      - `text-left`
    - это принудительно сохраняет левое выравнивание даже при `inline-flex` у базовой кнопки.
  - `YummyWeb/src/ui/styles.css`:
    - оставлена mobile-компоновка рейла в колонку для длинных заголовков.

- Проверка:
  - `cd YummyWeb && npm run build` — `OK`;
  - проверка через skill `playwright` на viewport `393x852` показала корректное левое выравнивание и отсутствие обрезания.

## 1.21) Fix long mobile rail titles on narrow iPhone viewport (9 марта 2026)

- Проблема:
  - длинные заголовки рейлов срезались на узких mobile viewport, потому что делили одну строку с CTA `Смотреть все`.

- Реализация:
  - `YummyWeb/src/ui/styles.css`:
    - `home-rail-head` дополнен `min-width: 0`;
    - `home-rail-title-btn` переведён в гибкий блок (`flex: 1 1 auto`, `min-width: 0`, `max-width: 100%`);
    - `home-rail-title` получил `overflow-wrap: anywhere`;
    - на `@media (max-width: 480px)` шапка рейла переводится в колонку, а `home-link-btn` выравнивается под заголовком.

- Проверка:
  - `cd YummyWeb && npm run build` — `OK`.

## 1.20) Fix mobile shell width on real Safari / iPhone 16 (9 марта 2026)

- Проблема:
  - на реальном iPhone 16 приложение рендерилось шире экрана и визуально срезалось справа.

- Реализация:
  - `YummyWeb/src/ui/styles.css`:
    - `html`, `body`, `#root` дополнены `width: 100%`;
    - `body` переведён на `overflow-x: hidden`;
    - `.app-bg` ограничен `width: 100%` и `max-width: 100vw`;
    - `.phone-shell` переведён с `width: min(100%, 430px)` на `width: min(calc(100vw - 32px), 430px)` плюс `max-width: 100%`.

- Проверка:
  - `cd YummyWeb && npm run build` — `OK`.

## 1.19) Fix Docker build: `catalog-updater` + Prisma generate (9 марта 2026)

- Проблема:
  - `docker compose up -d --build` падал в `catalog-updater` на этапе `npm run prisma:generate`;
  - Prisma брал root как `/app`, потому что schema лежит в `/app/backend/prisma/schema.prisma`, и пытался auto-install `@prisma/client` в пустом корне.

- Реализация:
  - `services/catalog-updater/Dockerfile`:
    - до установки зависимостей updater в `/app` копируются:
      - `backend/package.json`
      - `backend/package-lock.json`
    - затем выполняется `npm ci --omit=dev` в `/app`;
    - после этого `prisma generate` в `services/catalog-updater` работает без auto-install fallback;
    - полное `COPY services/catalog-updater ./services/catalog-updater` заменено на выборочное копирование `src`, `scripts`, `tsconfig.json`, чтобы не копировать локальный `node_modules` и не упираться в disk exhaustion.

- Проверка:
  - `docker compose build catalog-updater` — `OK`.

## 1.18) Docker mobile proxy: один origin для телефона и backend во внутренней сети (9 марта 2026)

- Задача:
  - запускать весь стек через Docker и открывать приложение с телефона в локальной сети без ручного указания LAN IP для frontend API.

- Реализация:
  - `YummyWeb/src/shared/api.ts`:
    - default API base URL изменён на `/api`.
  - `YummyWeb/vite.config.ts`:
    - добавлен proxy `/api -> API_PROXY_TARGET`;
    - fallback target для локального запуска без Docker: `http://localhost:3001`.
    - добавлен `rewrite`, который преобразует `/api/<route>` в `/<route>` для backend.
  - `docker-compose.yml`:
    - для `yummy-web` добавлены env:
      - `VITE_API_BASE_URL=/api`
      - `API_PROXY_TARGET=http://backend:3001`
    - это позволяет браузеру телефона ходить только на `http://<host-ip>:5173`, а контейнер `yummy-web` сам проксирует API в Docker-сеть.
  - `YummyWeb/README.md`:
    - добавлена инструкция для сценария `телефон + локальная сеть + docker compose`.

- Проверка:
  - `cd YummyWeb && npm run build` — `OK`;
  - `docker compose config` — `OK`.

## 1.17) Mobile wave1.4: фикс пустого nav-пункта после `Смотреть все` (3 марта 2026)

- Проблема:
  - после перехода из `Главной` в `Смотреть все` (`rail-list`) в mobile dropdown шапки пропадал текст активного раздела.

- Причина:
  - `AppSelect` получал `value='rail-list'`, но такого значения нет в `mainTabItems` (`home/catalog/favorites/sessions`), поэтому trigger рендерился пустым.

- Изменение:
  - `YummyWeb/src/ui/App.tsx`:
    - введён тип `MainTabKey` и вычисление `activeMainTabForListNav`:
      - если активен основной таб (`home/catalog/favorites/sessions`) — показываем его;
      - если активен внутренний экран (`rail-list`, `mixes`) — fallback на `home`;
    - mobile `AppSelect` переведён на `value={activeMainTabForListNav}` с базовыми `mainTabItems`.
  - `YummyWeb/e2e/mobile.smoke.spec.ts`:
    - в auth smoke добавлен переход `Смотреть все` перед шагом `Избранное` для фиксации регрессии.

- Проверка:
  - `cd YummyWeb && npm run build` — `OK`;
  - `cd YummyWeb && npm run e2e:smoke` — `OK` (6/6);
  - контрольный screenshot:
    - `output/playwright/mobile-wave1/after/check-430x932-see-all-nav-v3.png`.

## 1.16) Mobile wave1.3: перенос тега `Мой микс` в action-зону карточки (3 марта 2026)

- Проблема:
  - на `430x932` icon-only тег пользовательского микса визуально «съезжал», так как рендерился под заголовком.

- Изменение:
  - `YummyWeb/src/ui/components/MixPreviewCard.tsx`:
    - `mix-user-tag` перемещён из `mix-unified-title-wrap` в `mix-unified-actions` (рядом с `info`/`favorite`), чтобы позиция была стабильной.
  - `YummyWeb/src/ui/styles.css`:
    - `mix-user-tag` дополнен фиксирующими стилями:
      - `justify-content: center`,
      - `min-height: 24px`,
      - `flex: 0 0 auto`.

- Проверка:
  - `cd YummyWeb && npm run build` — `OK`;
  - `cd YummyWeb && npm run e2e:smoke` — `OK` (6/6);
  - контрольный screenshot `430x932`:
    - `output/playwright/mobile-wave1/after/check-430x932-user-tag-focus.png`.

## 1.15) Mobile wave1.2: фикс тега `Мой микс` на узком mobile (3 марта 2026)

- Запрос:
  - на `430x932` тег `Мой микс` на карточке съезжает и может перекрывать текст.

- Изменение:
  - `YummyWeb/src/ui/components/MixPreviewCard.tsx`:
    - пользовательский тег рендерится как компактный бейдж с иконкой `UserRound` и короткой подписью (`Мой`/`Автор`);
    - добавлены `title` и `aria-label` для доступности.
  - `YummyWeb/src/ui/styles.css`:
    - добавлены стили для `mix-user-tag-icon` / `mix-user-tag-text`;
    - на `@media (max-width: 480px)` включён icon-only режим (`24x24`) без текста, чтобы исключить переполнение.

- Проверка:
  - `cd YummyWeb && npm run build` — `OK`;
  - `cd YummyWeb && npm run e2e:smoke` — `OK` (6/6);
  - контрольный screenshot `430x932`:
    - `output/playwright/mobile-wave1/after/check-430x932-home.png`.

## 1.14) Mobile wave1.1: убрать перегруз стрелками и перевести nav в список (3 марта 2026)

- Запрос:
  - на mobile стрелки рейлов избыточны;
  - header-навигация срезается, меню должно быть списком.

- Изменение:
  - `YummyWeb/src/ui/App.tsx`:
    - добавлен responsive-режим навигации:
      - `<=900px`: list-nav (dropdown/select),
      - `>900px`: существующий tab-nav;
    - list-nav вынесен в отдельную строку header (`brand/profile` в верхней строке, список разделов — во второй);
    - добавлен test hook `data-testid=\"topbar-nav-select\"`.
  - `YummyWeb/src/ui-kit/AppSelect.tsx`:
    - добавлен проп `triggerTestId` для назначения `data-testid` у trigger.
  - `YummyWeb/src/ui/styles.css`:
    - добавлены стили компактного header (`topbar-main-row-compact`, `topbar-nav-list`, `topbar-nav-select-*`);
    - убраны mobile-стрелки рейлов:
      - по умолчанию `rail-nav-btn` скрыт,
      - стрелки включаются только на desktop (`@media min-width: 1024px`).
  - `YummyWeb/e2e/mobile.smoke.spec.ts`:
    - smoke-навигация переведена на helper для mobile list-nav;
    - проверка прокрутки рейла в guest-flow теперь через scroll контейнера, а не через arrow click.

- Проверка:
  - `cd YummyWeb && npm run build` — `OK`;
  - `cd YummyWeb && npm run api:smoke:mobile` — `OK`;
  - `cd YummyWeb && npm run e2e:smoke` — `OK` (6/6).

## 1.13) Mobile wave1: проверка и доработка мобильной версии (3 марта 2026)

- Контекст и baseline (этап A):
  - baseline-артефакты сняты через `playwright` skill:
    - `output/playwright/mobile-wave1/before/guest-home-390x844.png`
    - `output/playwright/mobile-wave1/before/guest-catalog-390x844.png`
    - `output/playwright/mobile-wave1/before/guest-catalog-info-390x844.png`
    - `output/playwright/mobile-wave1/before/auth-home-390x844.png`
    - `output/playwright/mobile-wave1/before/auth-favorites-390x844.png`
    - `output/playwright/mobile-wave1/before/auth-sessions-390x844.png`
    - и пары для `360x800`.
  - зафиксирован P0:
    - отсутствовал `DELETE /sessions/:id` (backend отвечал `404 Not Found`);
  - зафиксирован P1:
    - часть mobile touch-таргетов была ниже целевого размера.

- Реализация (этап B/C):
  - `backend/src/sessions/routes.ts`:
    - добавлен endpoint `DELETE /sessions/:id`;
    - возвращает:
      - `400` при невалидном `id`,
      - `404` при отсутствии сессии пользователя,
      - `200 { ok: true }` при успешном удалении.
  - `YummyWeb/src/ui/SessionsScreen.tsx`:
    - удаление сессий переведено на optimistic delete с rollback при ошибке;
    - добавлены `data-testid` для кнопок удаления и модалки.
  - `YummyWeb` mobile UX:
    - увеличены tap-target у критичных элементов (`tabs`, action-кнопки карточек, header/profile кнопки);
    - добавлены стабильные `data-testid` в:
      - `App.tsx`,
      - `HomeScreen.tsx`,
      - `MixPreviewCard.tsx`,
      - `SessionsScreen.tsx`,
      - `MixInfoModal.tsx`,
      - `AddToSessionModal.tsx`,
      - `AppTabs.tsx`/`TabsTrigger`.

- Репозитарный smoke-контур (этап D):
  - добавлены e2e smoke-файлы:
    - `YummyWeb/playwright.config.ts`
    - `YummyWeb/e2e/mobile.smoke.spec.ts`
    - `YummyWeb/e2e/helpers/authState.ts`
  - добавлен API smoke:
    - `YummyWeb/scripts/mobileApiSmoke.mjs`
  - `YummyWeb/package.json`:
    - новые команды:
      - `api:smoke:mobile`
      - `e2e:install`
      - `e2e:smoke`
      - `e2e:smoke:chromium`
      - `e2e:smoke:webkit`
    - добавлен `@playwright/test`.

- Валидация (этап E):
  - `cd backend && npm run build` — `OK`;
  - `cd YummyWeb && npm run build` — `OK`;
  - `cd YummyWeb && npm run api:smoke:mobile` — `OK`;
  - `cd YummyWeb && npm run e2e:smoke` — `OK` (6/6 на `android-chrome` и `ios-safari`).
  - after-артефакты:
    - `output/playwright/mobile-wave1/after/android-chrome-guest-home.png`
    - `output/playwright/mobile-wave1/after/android-chrome-guest-catalog.png`
    - `output/playwright/mobile-wave1/after/android-chrome-guest-catalog-info.png`
    - `output/playwright/mobile-wave1/after/android-chrome-auth-favorites.png`
    - `output/playwright/mobile-wave1/after/android-chrome-auth-sessions.png`
    - `output/playwright/mobile-wave1/after/ios-safari-guest-home.png`
    - `output/playwright/mobile-wave1/after/ios-safari-guest-catalog.png`
    - `output/playwright/mobile-wave1/after/ios-safari-guest-catalog-info.png`
    - `output/playwright/mobile-wave1/after/ios-safari-auth-favorites.png`
    - `output/playwright/mobile-wave1/after/ios-safari-auth-sessions.png`

## 1.12) Точечные правки карточки и таблицы сессий (3 марта 2026)

- Запрос:
  - разместить тег `Мой микс` под названием;
  - растянуть таблицу сессий на всю ширину.
- Изменение:
  - `YummyWeb/src/ui/components/MixPreviewCard.tsx`:
    - в блоке заголовка карточки порядок элементов изменён на:
      - `название`,
      - затем тег `Мой микс`/`Пользовательский`.
  - `YummyWeb/src/ui/styles.css`:
    - `session-table-card` возвращён в full-width режим:
      - `width: 100%`,
      - `justify-self: stretch`;
    - `session-table`:
      - `width: 100%`,
      - `min-width: 620px`.
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`.

## 1.11) UI-фиксы адаптива, скроллов, сессий и меню (2 марта 2026)

- Что сделано:
  - `YummyWeb/src/ui/styles.css`:
    - устранено ограничение ширины приложения на desktop:
      - `phone-shell` переведён на `width: 100%; max-width: none` (в `@media min-width: 1024px`);
      - добавлен `grid-template-columns: minmax(0, 1fr)` для стабилизации ширины grid-контейнера.
    - устранён mobile overflow:
      - `.content` переведён на `overflow-x: hidden; overflow-y: auto`;
      - на `@media max-width: 480px` снижены отступы/гапы topbar и уменьшен размер бренда.
    - добавлена единая темизация скроллбаров:
      - для `.content`, `.catalog-controls`, `.filter-scrollbox`, `.session-table-wrap`, `.preferences-popup`, `.mix-info-modal-shell`;
      - Firefox: `scrollbar-width: thin`, Chromium/Safari: `::-webkit-scrollbar*`.
    - сессии:
      - `session-table-card` переведён в `fit-content` с `max-width: 100%` и `justify-self: start`;
      - `session-table` — `width: max-content; min-width: 620px` (`560px` на mobile);
      - горизонтальный скролл оставлен только внутри `session-table-wrap`.
  - `YummyWeb/src/ui/components/MixPreviewCard.tsx`:
    - добавлен prop `currentUserId?: string`;
    - добавлен чип `mix-user-tag`:
      - `Мой микс` при `isUserMix=true && mix.author.id === currentUserId`,
      - `Пользовательский` для остальных пользовательских миксов.
  - прокинут `currentUserId` в `MixPreviewCard` из:
    - `HomeScreen`, `CatalogScreen`, `FavoritesScreen`, `SessionsScreen`, `RecommendationsScreen`, `MixesScreen`.
  - `YummyWeb/src/ui/App.tsx`:
    - пункт `Изменить имя` поднят на первое место в dropdown профиля.

- Проверки:
  - `cd YummyWeb && npm run build` — `OK`.
  - Проверка через skill `playwright`:
    - desktop `1920x1080`: `shellWidth=1896`, `shellMaxWidth=none`, `content overflow-x=hidden`;
    - mobile `390x844`: `shell/header/main scrollWidth == clientWidth`;
    - порядок profile-menu: `Изменить имя` — первый пункт;
    - `scrollbarWidth=thin` в каталоге и фильтрах;
    - на карточках отображаются `Мой микс` и `Пользовательский`;
    - на экране сессий таблица занимает контентную ширину, а не пустой широкий блок.

## 1.10) Фикс переполнения попапа состава по высоте (1 марта 2026)

- Проблема:
  - при большом объёме секций попап выходил за пределы viewport.
- Изменение:
  - `YummyWeb/src/ui/styles.css`:
    - `mix-info-modal-shell` ограничен по высоте (`max-height: min(92dvh, 900px)`);
    - включён внутренний вертикальный скролл (`overflow-y: auto`);
    - добавлен `overscroll-behavior: contain` и стилизация скроллбара.
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`.

## 1.9) Попап состава: убрать дубли тегов и добавить рейтинг (1 марта 2026)

- Требование:
  - убрать нижние теги профилей (профили уже есть списком);
  - добавить рейтинг на экран попапа состава.
- Изменение:
  - `YummyWeb/src/ui/HomeScreen.tsx`:
    - из секции `Вкусовые профили` удалены дублирующие чипы;
    - добавлена секция `Оценка` (`Средняя`, `Количество оценок`) на основе `mixSummaries[mixId]`.
  - `YummyWeb/src/ui/styles.css`:
    - удалены неиспользуемые стили `mix-info-profile-tags`.
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`.

## 1.8) Фикс карточки: длинный текст + рейтинг как тег (1 марта 2026)

- Проблема:
  - при длинном тексте карточки визуально «съезжали»;
  - рейтинг был вынесен в нижнюю строку, а не в компактный тег.
- Изменение:
  - `YummyWeb/src/ui/components/MixPreviewCard.tsx`:
    - добавлен проп `ratingTagText` для отображения рейтинга в блоке тегов;
    - при наличии рейтинга ограничен объём одновременно видимых профильных тегов.
  - `YummyWeb/src/ui/HomeScreen.tsx`:
    - рейтинг на главной передаётся в виде `★ X,X`/`★ —` как тег карточки.
  - `YummyWeb/src/ui/styles.css`:
    - стабилизирована геометрия текста карточки (фиксированная высота заголовка, однострочная мета);
    - добавлен стиль `mix-rating-tag`.
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`.

## 1.7) Редизайн попапа карточки на главной (1 марта 2026)

- Требование:
  - привести попап к стилю продукта и показать:
    - табаки с пропорциями,
    - вкусы с пропорциями,
    - вкусовые профили,
    - описание (если есть).
- Изменение:
  - `YummyWeb/src/ui/HomeScreen.tsx`:
    - попап переведён на секционный формат с нужными блоками;
    - добавлена агрегация `вкусов/профилей` по пропорциям компонентов (вклад компонента делится на количество его вкусов/профилей);
    - добавлены fallback-и при отсутствии компонентных данных.
  - `YummyWeb/src/ui/styles.css`:
    - добавлены стили `mix-info-modal-*` для продуктового визуала модалки (фон, рамки секций, ритм, типографика, mobile-адаптация).
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`.

## 1.6) Оценка на карточках главной (1 марта 2026)

- Требование:
  - добавить отображение оценки на карточках главной.
- Изменение:
  - `YummyWeb/src/ui/HomeScreen.tsx`:
    - подключен `getMixRatingSummaries(...)`;
    - summary сохраняется в локальный map по `mixId`;
    - в карточку (`MixPreviewCard`) передаётся footer: `Средняя: {avgRating}`.
- Ограничение:
  - `/mix-ratings/summary` защищён `requireAuth`, поэтому в guest-режиме footer с оценкой не показывается.
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`.

## 1.5) Унификация карточек миксов между экранами (1 марта 2026)

- Требование:
  - сделать одинаковый внешний вид карточек в каталоге, избранном, на странице рейла и остальных списках.
- Изменение:
  - добавлен единый компонент карточки:
    - `YummyWeb/src/ui/components/MixPreviewCard.tsx`;
    - общая разметка для заголовка, actions, мета-текста, тегов профилей и footer-строки;
    - встроена единая логика профилей по пропорциям компонентов.
  - на компонент переведены:
    - `YummyWeb/src/ui/HomeScreen.tsx`,
    - `YummyWeb/src/ui/CatalogScreen.tsx`,
    - `YummyWeb/src/ui/FavoritesScreen.tsx`,
    - `YummyWeb/src/ui/RailScreen.tsx`,
    - `YummyWeb/src/ui/MixesScreen.tsx`,
    - `YummyWeb/src/ui/SessionsScreen.tsx` (экран выбора микса),
    - `YummyWeb/src/ui/RecommendationsScreen.tsx` (preview внутри карточки рекомендации).
  - обновлены стили:
    - `YummyWeb/src/ui/styles.css` — введены универсальные классы `mix-unified-*`, size-варианты `rail/grid/fluid` и совместимость с текущими action-классами.
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`.

## 1.4) Рефакторинг кнопок `info` и `избранное` на карточке (1 марта 2026)

- Проблема:
  - action-кнопки карточки главной выглядели визуально «криво» и не соответствовали общему стилю.
- Изменение:
  - `YummyWeb/src/ui/HomeScreen.tsx`:
    - заменены текстовые символы кнопок на `Info`/`Heart` из `lucide-react` (используется в экосистеме `shadcn/ui`);
    - кнопки переведены на отдельные классы `home-action-btn` и `home-fav-btn` для локальной настройки только на главной.
  - `YummyWeb/src/ui/styles.css`:
    - добавлены выровненные стили action-кнопок:
      - одинаковая геометрия,
      - единый hover,
      - активное состояние избранного с заполнением иконки,
      - dashed-бордер в guest-режиме.
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`.

## 1.3) Порядок профилей на карточке по пропорциям микса (1 марта 2026)

- Требование:
  - теги профилей вкуса в карточке должны идти по доминированию в миксе.
- Изменение:
  - `YummyWeb/src/ui/HomeScreen.tsx`:
    - `getProfileTags` переведён на взвешенную сортировку:
      - профиль получает суммарный вес из `component.proportion`;
      - вклад компонента делится на количество его профилей, чтобы многопрофильные табаки не давали несоразмерный приоритет;
      - профили сортируются по убыванию суммарного веса.
    - дополнительные профили из `mix.flavorProfiles`, отсутствующие в компонентном расчёте, добавляются в конец.
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`.

## 1.2) Фикс левой стрелки рейла (1 марта 2026)

- Проблема:
  - при клике на левую стрелку карусель местами не прокручивалась, в отличие от правой.
- Причина:
  - в алгоритме вычисления целевого скролла для `direction=-1` могла повторно выбираться текущая карточка, поэтому `scrollLeft` не менялся.
- Изменение:
  - `YummyWeb/src/ui/HomeScreen.tsx`:
    - скорректирован `getNextRailScrollLeft(...)` для движения влево:
      - выбирается карточка строго левее текущей позиции (`currentScrollLeft - tolerance`).
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`.

## 1.1) Фикс переполнения тегов профилей в карточках (1 марта 2026)

- Проблема:
  - теги профилей вкуса в карточках главной могли переноситься на 2 строки и визуально обрезаться по нижней границе карточки.
- Изменение:
  - `YummyWeb/src/ui/HomeScreen.tsx`:
    - изменена стратегия рендера тегов:
      - до 2 тегов при малом количестве,
      - при `>2` отображается `первый тег + +N`.
  - `YummyWeb/src/ui/styles.css`:
    - `home-item-tags` переведён в однострочный режим (`nowrap`, `overflow: hidden`);
    - для тегов в карточке добавлены компактные размеры и `text-overflow: ellipsis`.
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`.

## 1.0) UI-рефакторинг карточек главной (1 марта 2026)

- Проблема:
  - в рейлах главной заголовки карточек находились на разной высоте;
  - визуально карточки выглядели неконсистентно из-за зависимости вертикального положения заголовка от количества тегов/строк меты.
- Изменение:
  - `YummyWeb/src/ui/HomeScreen.tsx`:
    - разметка карточки разделена на две зоны:
      - `home-item-head` (заголовок + action-кнопки),
      - `home-item-body` (meta + теги).
  - `YummyWeb/src/ui/styles.css`:
    - `home-item-overlay` теперь выравнивает верхнюю зону карточки стабильно;
    - `home-item-body` закреплён у нижней границы через `margin-top: auto`;
    - добавлены согласованные параметры для `home-item-meta` и `home-item-tags` (минимальная высота, gap, wrap), чтобы внутренний ритм карточек был предсказуемым.
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`.

## 0.9) Миграция `YummyWeb` на `shadcn/ui` (1 марта 2026)

- Объём:
  - мигрирован весь UI-слой `YummyWeb` (включая неактивные экраны) на архитектуру `shadcn/ui` + `ui-kit`.
- Инфраструктура:
  - добавлены `Tailwind CSS`, `components.json`, `tailwind.config.ts`, `postcss.config.js`;
  - добавлен алиас `@` в `YummyWeb/tsconfig.json` и `YummyWeb/vite.config.ts`;
  - добавлен utility `YummyWeb/src/lib/utils.ts` (`cn`).
- Компонентный слой:
  - `YummyWeb/src/components/ui/*` — shadcn-примитивы;
  - `YummyWeb/src/ui-kit/*` — продуктовые обёртки (`AppButton`, `AppInput`, `AppSelect`, `AppModal`, `AppBadge`, `AppTabs`, `AppTextarea`, `AppCard`).
- Миграция экранов:
  - `App`, `AuthScreen`, `CatalogScreen`, `FavoritesScreen`, `HomeScreen`, `MixesScreen`,
  - `SessionsScreen`, `PreferencesPanel`, `ProfileScreen`, `RailScreen`, `RecommendationsScreen`.
- CSS:
  - migration-mode: гибрид (`Tailwind + shadcn` поверх legacy-стилей);
  - удалены неиспользуемые блоки `popup-*` и `desktop-tab*` из `styles.css`.
- Документация:
  - обновлён `YummyWeb/README.md` (UI-стек, структура, правила использования `ui-kit`).
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`.
- Коммиты:
  - `5bf6de5`, `b3479fd`, `a366e8e`, `87eeda1`, `634966a`, `60c58e8`, `7f82647`, `00f2af7`.

## 0.8) Sprint 2 — P2.2 (fix по пользовательскому баг-репорту, 1 марта 2026)

- Проблема:
  - в desktop-рейлах правая стрелка могла исчезать из видимой области, а прокрутка ощущалась как «общий свайп»;
  - fallback имени профиля без пользовательского имени показывал `Seed` вместо email.
- Гипотеза:
  - зафиксировать геометрию рейла в viewport-ширине и прокручивать к первой скрытой карточке;
  - для fallback имени использовать `email`, без генерации псевдонима.
- Изменение:
  - `HomeScreen.tsx`:
    - заменён `scrollBy` на целевую прокрутку к следующей/предыдущей скрытой карточке;
    - для рефов рейлов используется ключ `id:index`, скролл влияет только на выбранный рейл.
  - `styles.css`:
    - исправлена сетка рейлов (`minmax(0,1fr)`, `min-width:0`, `max-width:100%`) для предотвращения растяжения карусели на `scrollWidth`;
    - overlay-стрелки остаются поверх крайних карточек, но теперь обе в видимой зоне.
  - `profileName.ts`:
    - fallback имени: `custom` -> `user.name` -> `email` -> `Мой профиль`.
- Проверки:
  - `npm run build` (`YummyWeb`) — `OK`;
  - Playwright:
    - геометрия: `carousel.width=1462`, `rightBtn.x=1439` (стрелка видима);
    - клик правой стрелки первого рейла: `scrollLeft 0 -> 1248`;
    - контроль по нескольким рейлам: `[1248,0,0] -> [2394,0,0]` (скроллится только первый);
    - fallback имени в auth-mock: `seed@yummy.local`.
- Артефакты:
  - before: `output/playwright/sprint2-auth-fix-before/rail-hover.png`
  - after: `output/playwright/sprint2-railfix-after/rail-hover.png`
  - e2e before click: `output/playwright/sprint2-railfix-e2e/rail-before-click.png`
  - e2e after click: `output/playwright/sprint2-railfix-e2e/rail-after-click.png`
  - e2e fallback email: `output/playwright/sprint2-railfix-e2e/profile-fallback-email.png`
- Коммит:
  - `927f7f5` — `fix(web): починить листание рейлов стрелками и fallback имени`

## 0.7) Sprint 2 — P2.1 (доработка по фидбэку, 1 марта 2026)

- Проблема:
  - desktop-стрелки рейлов визуально стояли рядом с лентой, а не поверх крайних карточек;
  - отображаемое имя профиля было `SEED`, без возможности изменить display name.
- Гипотеза:
  - overlay-стрелки повысят ожидаемость поведения карусели;
  - editable profile name в хедере улучшит персонализацию и читаемость.
- Изменение:
  - `styles.css`:
    - стрелки рейла на desktop переведены в абсолютный overlay поверх карточек;
    - у profile button убран forced uppercase.
  - `profileName.ts` (новый shared-модуль):
    - localStorage-хранилище имени профиля по `userId`;
    - нормализация имени;
    - fallback-resolver (`custom` -> `user.name` -> humanized email -> `Мой профиль`).
  - `App.tsx`:
    - в dropdown добавлен пункт `Изменить имя`;
    - добавлен popup редактирования имени с сохранением;
    - имя профиля рендерится через новый resolver.
  - `types.ts`:
    - `ApiUser` расширен опциональным полем `name`.
- Проверки:
  - `npm run build` (`YummyWeb`) — `OK`;
  - Playwright:
    - before/after по hover-рейлу;
    - before/after по profile menu;
    - e2e изменения имени (`Seed` -> `Алексей`).
- Артефакты:
  - `output/playwright/sprint2-auth-fix-before/rail-hover.png`
  - `output/playwright/sprint2-auth-fix-after/rail-hover.png`
  - `output/playwright/sprint2-auth-fix-before/profile-menu.png`
  - `output/playwright/sprint2-auth-fix-after/profile-menu.png`
  - `output/playwright/sprint2-auth-fix-after/profile-name-modal.png`
  - `output/playwright/sprint2-auth-fix-e2e/profile-name-updated.png`
- Коммит:
  - `bff4425` — `feat(web): overlay-стрелки рейлов и редактируемое имя профиля`

## 0.6) Sprint 2 — P2 (auth UX desktop, 1 марта 2026)

- Проблема:
  - авторизация в гостевом сценарии была размещена в контенте и неочевидна;
  - точка входа в профиль/выход не соответствовала стандартному desktop-паттерну;
  - отдельный экран профиля дублировал навигационные действия.
- Гипотеза:
  - вынести `Войти` в правую часть хедера с popup-авторизацией;
  - заменить email-лейбл в хедере на dropdown профиля с ключевыми действиями;
  - убрать отдельный экран профиля из primary навигации.
- Изменение:
  - `App.tsx`:
    - добавлены guest auth popup и profile dropdown в хедере;
    - убран tab `Профиль`;
    - `Предпочтения` открываются popup-панелью;
    - добавлено закрытие profile-menu по outside click и `Escape`.
  - `AuthScreen.tsx`:
    - добавлен проп `asCard` для popup-варианта формы.
  - `PreferencesPanel.tsx`:
    - добавлен новый UI-компонент настроек предпочтений для popup.
  - `styles.css`:
    - стили для header auth/profile controls, dropdown и popup-заголовков.
- Проверки:
  - `npm run build` (`YummyWeb`) — `OK`;
  - Playwright smoke:
    - guest before/after;
    - открытие/закрытие auth popup;
    - mock-auth (`/auth/verify`) + открытие profile menu;
    - открытие popup `Предпочтения`;
    - выход через dropdown.
- Артефакты:
  - before: `output/playwright/sprint2-auth-before/guest-home.png`
  - after: `output/playwright/sprint2-auth-after/guest-home.png`
  - after (auth popup): `output/playwright/sprint2-auth-after/guest-auth-modal.png`
  - after (profile menu): `output/playwright/sprint2-auth-after/profile-menu-open.png`
  - after (preferences popup): `output/playwright/sprint2-auth-after/preferences-modal.png`
  - e2e: `output/playwright/sprint2-auth-e2e/`
- Коммит:
  - `8cb4958` — `feat(web): перейти на header-auth popup и dropdown профиля`

## 0.4) Sprint 2 — P1 (catalog desktop UX, 1 марта 2026)

- Реализовано:
  - каталог на desktop переведён в двухколоночный режим:
    - левая колонка — результаты;
    - правая колонка — фильтры (sticky);
  - фильтры `Производитель` и `Табак` стали мультиселект;
  - добавлен фильтр по `Вкусам` (множественный выбор);
  - добавлено автодополнение тегов:
    - ввод + добавление по `Enter`/`,`,
    - выбор из подсказок,
    - удаление выбранных тегов chip-кнопкой;
  - summary активных фильтров расширен (`бренды/табаки/вкусы/теги`);
  - в API-клиенте добавлены параметры `flavor/flavors` для `getMixes/getFavorites`.
- Проверки:
  - `npm run build` — `OK`;
  - Playwright smoke (`output/playwright/sprint2-p1-after/`):
    - baseline каталога,
    - мультивыбор фильтров,
    - фильтр по вкусу,
    - автодополнение тегов,
    - сброс фильтров.
- Артефакты:
  - `output/playwright/sprint2-p1-before/`
  - `output/playwright/sprint2-p1-after/`

## 0.5) Post-P1 корректировка (1 марта 2026)

- По дополнительному фидбэку внесены правки:
  - фильтры каталога на desktop перенесены в левую колонку;
  - для карточек рейлов усилен fallback вкуса (`flavors` -> профиль -> `вкус не указан`);
  - уменьшено ощущение «пустоты» на desktop за счёт расширения рабочей ширины и снижения внешних отступов.
- Артефакты проверки:
  - `output/playwright/sprint2-fix-before/`
  - `output/playwright/sprint2-fix-after/`

## 0.3) Sprint 2 — P0 (desktop UX по пользовательскому фидбэку, 1 марта 2026)

- Реализовано в `YummyWeb`:
  - карточки рейлов: вместо названий табаков показаны вкусы (`mix.flavors` / fallback от компонент), до 3 значений;
  - desktop-рейлы: стрелки скрыты по умолчанию, появляются по `hover` и `focus-within`;
  - гостевой сценарий: auth-блок перенесён вверх контента (до списков);
  - top-nav для авторизованного: `Главная`, `Каталог`, `Избранное`, `Сессии`, `Профиль`;
  - `ProfileScreen`: убраны дублирующие пункты меню `Избранное` и `Сессии` (теперь в top-nav);
  - удалены «технические» подсказки о появлении рейлов (`Избранное`, `Мои миксы`);
  - уплотнены desktop-отступы и ширина карточек (меньше пустого пространства).
- Проверки:
  - `npm run build` — `OK`;
  - Playwright smoke — `OK`:
    - guest home/catalog, новое положение auth-блока;
    - поведение стрелок на рейлах (через computed style + hover);
    - mocked-auth screenshot с новой top-nav.
- Артефакты:
  - `output/playwright/sprint2-p0-before/`
  - `output/playwright/sprint2-p0-after/`

## 0.2) UX quick wins (desktop, 1 марта 2026)

- Область: `YummyWeb` (гостевые сценарии `Главная` и `Каталог`).
- Что изменено:
  - улучшена desktop-читаемость (типографика/размеры контролов/сеточные отступы);
  - добавлены `focus-visible`-стили;
  - добавлен inline favicon в `YummyWeb/index.html` для устранения `404 /favicon.ico`;
  - `CatalogScreen`:
    - добавлен summary активных фильтров;
    - добавлена кнопка `Сбросить фильтры`;
    - добавлена чистая функция `buildActiveFilterLabels` (логика формирования summary вынесена в тестируемый блок);
  - `HomeScreen`:
    - в гостевом режиме добавлена явная подсказка ограничений;
    - кнопка избранного работает как триггер обратной связи, а не `disabled`-контрол;
    - снят `aria-disabled` с контейнера карточки в гостевом режиме (иначе блокировались вложенные `info/избранное`);
    - popup `Описание` закрывается по `Escape`.
- Проверки:
  - `npm run build` — `OK`;
  - e2e smoke (`playwright-cli`) — `OK`:
    - каталог: поиск и сброс фильтров,
    - открытие карточки микса + back,
    - гостевой клик по избранному,
    - popup описания + `Escape`.
- Артефакты скриншотов:
  - `output/playwright/audit-before/`
  - `output/playwright/audit-after/`
  - `output/playwright/e2e/`
- Ограничение среды:
  - `screenshot`-skill требует macOS Screen Recording permission; в текущем запуске OS-capture не выполнен из-за отсутствующего разрешения.

## 0.1) Обновление клиента (1 марта 2026)

- На `YummyWeb` устранён дефект пустых тегов на карточках (главная):
  - профили перед рендером теперь нормализуются и фильтруются.
- `MixesScreen` синхронизирован с новой моделью профилей:
  - добавлены `minty`, `fruity`, `floral_herbal`, `citrus`, `berry`, `perfume`.
- Для диаграммы профилей микса добавлена защита от невалидных значений профилей.

## 0) Последнее обновление (28 февраля 2026, финальная миграция каталога)

- Схема табака приведена к целевому виду:
  - `flavorProfiles` (+ `perfume`),
  - `flavors` (отдельный массив вкусов),
  - `flavorTags` только для мета-тегов (`редкие`, `напитки`, `охлаждающий`),
  - `line` удалён.
- Применены миграции:
  - `20260228213000_tobacco_flavor_perfume_cleanup`
  - `20260228222000_sanitize_tobacco_flavor_fields`
- Выполнен полный uncached refresh из единственного источника `hookahportal.ru`:
  - job: `11944911-aebf-4bd0-affd-e26e5421bf51`
  - `input.tobaccos=2585`, `input.mixes=602`
  - `tobaccosCreated=33`, `tobaccosUpdated=2552`
  - `mixesCreated=54`, `mixesUpdated=510`, `mixesSkipped=38`
- Итоговая контрольная выборка для `RED`:
  - `flavorProfiles={floral_herbal,perfume}`
  - `flavorTags={редкие}`
  - `flavors={травы}`
- Контроль чистоты таксономии:
  - `tobaccos_with_non_meta_tags = 0`
  - в таблице `Tobacco` нет колонок `line` и `flavor` (используется `flavors`).

## 1) Статус на 23 февраля 2026 (обновлено: 28 февраля 2026)

- Каталог обновляется отдельным микросервисом `services/catalog-updater`.
- Источник миксов и табаков для тестового наполнения: `hookahportal.ru`.
- Поддержан локальный JSON-кеш артефактов:
  - `/Users/admin/PycharmProjects/yummy/services/catalog-updater/cache/hookahportal/tobaccos.json`
  - `/Users/admin/PycharmProjects/yummy/services/catalog-updater/cache/hookahportal/mixes.json`
- В `local-seed` оставлены только табаки (миксы из `local-seed` не используются).
- Все импортированные миксы пишутся с автором `hookahportal`.
- Добавлен корневой `docker-compose.yml` для полного контура:
  - `db`, `mailpit`, `backend`, `catalog-updater`, `yummy-web`
  - profile `setup`: `backend-migrate`, `backend-seed`
  - profile `ml`: `ml`
- Добавлены команды в `services/catalog-updater`:
  - `npm run cache:refresh:hookahportal`
  - `npm run catalog:refresh:from-cache`
- Добавлен `backend`-скрипт запуска импорта через updater:
  - `npm run import:tobaccos`
- Каталоговая модель расширена до prod-ready таксономии:
  - `FlavorProfile`: добавлены `minty`, `fruity`, `floral_herbal`, `citrus`, `berry`
  - `Tobacco`: используется `flavors` + `flavorTags` (мета-теги), `line` удалён
  - `Mix`: добавлен `flavors`, наследование `flavorProfiles/flavors/tags` от компонент

## 2) Актуальные артефакты каталога

По состоянию на обновление артефактов:
- `tobaccos.json`: `count=2616`, `fetchedAt=2026-02-23T16:19:44.798Z`
- `mixes.json`: `count=587`, `fetchedAt=2026-02-23T16:27:54.944Z`

## 3) Последняя проверенная загрузка в БД (только HookahPortal)

Последний запуск refresh-job (28 февраля 2026, `id=7f01ddd7-fc8a-4865-9258-14d22a3f24a4`):
- `sourceNames`: `["hookahportal-catalog-test"]` (только HookahPortal)
- `input`: `tobaccos=2592`, `mixes=581`
- `tobaccosUpdated=2592`
- `mixesUpdated=533`
- `mixesSkipped=48`

Текущие размеры таблиц после пересборки:
- `Manufacturer`: `72`
- `Tobacco`: `2592`
- `Mix`: `533`
- `MixComponent`: `1771`

Примечания:
- Импорт выполнялся через `runRefreshCatalogJob` с `HOOKAHPORTAL_CACHE_READ=true`.
- Пропущенные миксы в основном из-за суммы пропорций != 100 и/или отсутствующих компонентов.

## 4) Как обновить артефакты

```bash
cd /Users/admin/PycharmProjects/yummy/services/catalog-updater
npm run cache:refresh:hookahportal
```

## 5) Как перезалить БД только из HookahPortal-кеша

Очистка каталога:
```bash
docker exec backend-db-1 psql -U yummy -d yummy -v ON_ERROR_STOP=1 -c \
"BEGIN; TRUNCATE TABLE \"Recommendation\", \"FavoriteMix\", \"SessionRating\", \"SmokingSession\", \"MixRating\", \"MixComponent\", \"Mix\", \"Tobacco\", \"Manufacturer\" RESTART IDENTITY CASCADE; COMMIT;"
```

Импорт из кеша:
```bash
cd /Users/admin/PycharmProjects/yummy/services/catalog-updater
DATABASE_URL='postgresql://yummy:yummy@localhost:5432/yummy' npm run catalog:refresh:from-cache
```

## 6) Ограничения и риски

- Для `backend` и `catalog-updater` используется `node:bookworm-slim` + `openssl` в Dockerfile (устраняет падения Prisma на `node:alpine`).
- Источник HookahPortal помечен как test-only (`CATALOG_ALLOW_TEST_SOURCES=true`).
- Часть миксов отбрасывается текущими правилами валидации состава.
- Для новых полей таксономии нужна миграция `20260228204000_expand_tobacco_mix_taxonomy` перед сидингом/импортом.

## 7) Следующие шаги

1. Добавить артефакт-отчёт (JSON) с метриками импорта в `services/catalog-updater/cache/hookahportal/`.
2. Добавить флаг soft-validation для миксов, где сумма пропорций != 100 (чтобы не терять контент полностью).
3. Определить стратегию хранения/чистки кеша в docker-окружении (volume и ретеншн).

## 0.2) Обновление клиента (1 марта 2026) — UX/UI хедера и навигации

Сделано:
- В `YummyWeb/src/ui/App.tsx` пересобран header:
  - title экрана и tabs теперь в одной строке,
  - длинные subtitle-описания удалены,
  - отдельный ряд `desktop-tabbar` убран, навигация встроена в topbar.
- В `YummyWeb/src/ui/styles.css` обновлён layout shell/header:
  - `phone-shell` использует `height` (не `min-height`),
  - скролл ограничен только `main.content`,
  - добавлены стили `topbar-main-row`, `topbar-nav-row`, `topbar-title`, `topbar-nav`.
- Убраны дубли заголовков в контенте:
  - `YummyWeb/src/ui/CatalogScreen.tsx` (удалён `catalog-hero`),
  - `YummyWeb/src/ui/RailScreen.tsx` (удалён `catalog-hero`).
- В `YummyWeb/src/ui-kit/AppTabs.tsx` добавлены параметры `listClassName` и `stretch` для компактного tabbar в header.

Проверка:
- `cd YummyWeb && npm run build` — успешно.
- Playwright before/after:
  - `output/playwright/before/`
  - `output/playwright/after/`

Результат по фидбэку:
- header и меню закреплены относительно scroll-контента;
- дубли title на экранах каталога/рейла убраны;
- лишний служебный текст в topbar убран;
- title и разделы меню на одной линии.

## 0.3) Точечная корректировка (1 марта 2026) — убрать дубли title вкладки

Сделано:
- В `YummyWeb/src/ui/App.tsx` удалён вывод названия активной вкладки в topbar (`h1`), чтобы не дублировать активный tab.
- В `YummyWeb/src/ui/styles.css` удалены стили `topbar-title`; topbar уплотнён по вертикальным отступам.

Результат:
- хедер компактнее;
- нет дублирования "название вкладки + активная вкладка".

## 0.4) Точечная корректировка (1 марта 2026) — меню в одной линии с названием

Сделано:
- В `YummyWeb/src/ui/App.tsx` tabs перенесены из отдельной строки в `topbar-main-row`.
- Теперь header рендерится в одном ряду: бренд слева, меню по центру/в flex-зоне, профиль справа.
- В `YummyWeb/src/ui/styles.css` обновлены стили для ровного выравнивания и компактной высоты.

Результат:
- навигационное меню больше не ниже названия;
- визуально хедер ровнее и компактнее.
- Доп. фиксация: порядок элементов в строке header выставлен как `brand → tabs → profile`.

## 0.5) Итерация A (1 марта 2026) — экран микса, унификация CTA и избранного

Сделано:
- `YummyWeb/src/ui/MixesScreen.tsx`:
  - убран зелёный бейдж количества компонентов в hero-блоке;
  - кнопка `Добавить в сессию` уменьшена и переведена в `ghost`-стиль;
  - кастомное сердечко `♥/♡` заменено на `Heart` (`lucide-react`);
  - кнопка избранного в карточке микса переведена на единый стиль action-кнопок (`mix-action-btn`, `mix-fav-btn`).
- `YummyWeb/src/ui/styles.css`:
  - добавлен `mix-detail-session-btn`;
  - удалены неиспользуемые legacy-стили (`rating-pill`, `icon-btn`, `fav-icon`, `info-btn`);
  - `mix-detail-fav` синхронизирован по размеру с карточками.

Проверка:
- `cd YummyWeb && npm run build` — `OK`.
- Playwright smoke (skill):
  - `output/playwright/iter-a/home-after-a.png`.

## 0.6) Итерация B (1 марта 2026) — каталог: desktop UX и popup info

Сделано:
- Добавлен переиспользуемый компонент `YummyWeb/src/ui/components/MixInfoModal.tsx`.
- `YummyWeb/src/ui/CatalogScreen.tsx`:
  - `info` на карточках теперь всегда открывает popup (`MixInfoModal`), без перехода на экран микса;
  - фильтры `теги`, `профили`, `вкусы` переведены с chip-схемы на scrollbox-подход (масштабируемый выбор);
  - кнопка `Найти` уменьшена (`catalog-find-btn`).
- `YummyWeb/src/ui/HomeScreen.tsx`:
  - popup состава переведён на общий компонент `MixInfoModal`.
- `YummyWeb/src/ui/styles.css`:
  - добавлен `catalog-find-btn`;
  - исправлена переносимость длинных текстов в `filter-option` на desktop.

Проверка:
- `cd YummyWeb && npm run build` — `OK`.
- Playwright smoke (skill):
  - `output/playwright/iter-b/catalog-info-after-b.png`.

## 0.7) Итерация C (1 марта 2026) — Избранное: урезанные фильтры + popup info

Сделано:
- `YummyWeb/src/ui/FavoritesScreen.tsx` переработан:
  - фильтры только `теги`, `вкусы`, `профили`;
  - фильтрация в масштабируемом формате (поиск + scrollbox-мультивыбор);
  - добавлены `active filters` и `Сбросить фильтры` в стиле каталога;
  - `info` в карточке открывает `MixInfoModal`.

Проверка:
- `cd YummyWeb && npm run build` — `OK`.
- Playwright smoke (skill):
  - `output/playwright/iter-c/home-after-c.png`.

## 0.8) Итерация D (1 марта 2026) — Сессии до production-flow

Сделано:
- `YummyWeb/src/ui/SessionsScreen.tsx`:
  - сценарий создания упрощён до одного compose-экрана (`выбор микса + локация + сохранить`);
  - выбор микса с поиском и карточками;
  - `info` по миксу доступен через `MixInfoModal`, из popup можно выбрать микс для сессии;
  - список сессий переработан под card-формат;
  - добавлено удаление сессии с подтверждением.
- `YummyWeb/src/shared/apiClient.ts`:
  - добавлен `deleteSession(...)`.
- `YummyWeb/src/ui/styles.css`:
  - добавлены стили новой компоновки сессий (`session-compose-card`, `session-entry-card`, `session-delete-btn` и т.д.).

Проверка:
- `cd YummyWeb && npm run build` — `OK`.
- Playwright smoke (skill, mock API):
  - `output/playwright/iter-d/sessions-after-d.png`.

Ограничение:
- для реального удаления сессий backend должен поддерживать `DELETE /sessions/:id`.

## 0.9) Итерация E (1 марта 2026) — Мои миксы + удобное создание

Сделано:
- `YummyWeb/src/ui/App.tsx`:
  - из меню профиля открывается экран `Мои миксы`.
- `YummyWeb/src/ui/MixesScreen.tsx`:
  - list-режим переведён на `Мои миксы` (по `authorId` текущего пользователя);
  - убран фильтр `Источник`;
  - из create-режима добавлена кнопка `Назад к моим миксам`;
  - в форме создания добавлен быстрый поиск табаков и блок быстрого добавления компонентов.
- `YummyWeb/src/ui/styles.css`:
  - добавлен `mix-create-search-results`.

Проверка:
- `cd YummyWeb && npm run build` — `OK`.
- Playwright smoke (skill, mock-auth/mock API):
  - `output/playwright/iter-e/my-mixes-after-e.png`.

## 1.0) Итерация F (1 марта 2026) — экран микса с инфографикой и shadcn charts

Сделано:
- Добавлен `recharts` в `YummyWeb`.
- Добавлен shadcn-совместимый chart-примитив:
  - `YummyWeb/src/components/ui/chart.tsx`.
- `YummyWeb/src/ui/MixesScreen.tsx`:
  - улучшена компоновка экрана микса;
  - добавлены инфо-блоки с ключевыми характеристиками;
  - старые conic-диаграммы заменены на `recharts`:
    - donut по табачной базе,
    - вертикальный bar-chart по профилям вкуса.
- `YummyWeb/src/ui/components/MixPreviewCard.tsx`:
  - `info` показывается только при `onOpenInfo` (убран fallback в detail).
- `YummyWeb/src/ui/RailScreen.tsx`, `YummyWeb/src/ui/RecommendationsScreen.tsx`:
  - подключён popup `info` (`MixInfoModal`) для карточек.
- `YummyWeb/src/ui/styles.css`:
  - добавлены стили для новых chart-блоков и инфографики.

Проверка:
- `cd YummyWeb && npm run build` — `OK`.
- Playwright smoke (skill, mock-auth/mock API):
  - `output/playwright/iter-f/mix-detail-charts-after-f.png`.

Нюанс:
- после добавления `recharts` Vite предупреждает о крупном JS chunk (`>500kB`); это не блокирует сборку, но требует последующей оптимизации (`manualChunks`/lazy loading).

## 1.1) Итерация G (1 марта 2026) — доп. пакет UX/UI + тесты/проверки

Сделано:
- `YummyWeb/src/ui/components/MixPreviewCard.tsx`:
  - карточки унифицированы по рейтингу (`rating tag`),
  - добавлены теги микса отдельными чипами,
  - размер иконки избранного выровнен относительно кнопки.
- `YummyWeb/src/ui/components/AddToSessionModal.tsx`:
  - единый popup добавления в сессию с выбором локации (`Дом/Лаунж`) и подтверждением.
- `YummyWeb/src/ui/RecommendationsScreen.tsx`:
  - добавление в сессию переведено на общий popup;
  - рейтинг приведён к единому отображению (tag + личная оценка отдельно).
- `YummyWeb/src/ui/CatalogScreen.tsx`, `YummyWeb/src/ui/FavoritesScreen.tsx`:
  - выравнен формат рейтинга карточек под единый контракт с главной.
- `YummyWeb/src/ui/MixesScreen.tsx`:
  - экран `Мои миксы` приведён к макету как в избранном (`фильтры слева, карточки справа`);
  - фильтрация `теги + вкусы + профили`, плюс поиск/сортировка;
  - detail: добавлены `Доминирующий вкус`, теги и диаграмма `Вкусы микса`;
  - добавление в сессию из detail и из popup `info` — через единый popup;
  - форма создания микса переложена на более стабильный grid-лейаут.
- `YummyWeb/src/ui/SessionsScreen.tsx`:
  - список сессий переделан в компактную таблицу;
  - CTA уменьшен (`Добавить сессию`);
  - выбор микса в compose переделан как в каталоге: `теги + вкусы + профили`, поиск, сортировка;
  - добавление в сессию из карточки и из `info` выполняется через popup с выбором места.
- `YummyWeb/src/ui/styles.css`:
  - обновлены стили action-иконок, таблицы сессий, detail-тегов, create-grid;
  - фильтр-скролл усилен (`overscroll-behavior: contain`, `touch-action: pan-y`).

Проверка:
- `cd YummyWeb && npm run build` — `OK`.
- Playwright UI-check (skill):
  - `output/playwright/home-guest.png`
  - `output/playwright/catalog-filters.png`
  - `output/playwright/catalog-info-modal.png`
  - `output/playwright/catalog-card-element.png`
- Отдельная проверка скролла фильтра через `eval`:
  - `pageBefore=0`, `pageAfter=0`, `boxAfter=boxMax` — прокрутка фильтров независима от прокрутки страницы.

Коммиты:
- `ed3bf60` — `feat(yummyweb): unify mix cards and add session modal flow`
- `b7dd3fe` — `feat(yummyweb): revamp sessions and my-mixes UX layouts`

## 1.2) Итерация H (1 марта 2026) — правки по результатам тестирования

Сделано:
- `YummyWeb/src/ui/components/MixPreviewCard.tsx`:
  - убраны теги микса из карточек (на всех экранах, где используется `MixPreviewCard`);
  - оставлены только профильные чипы + рейтинг-тег.
- `YummyWeb/src/ui/MixesScreen.tsx`:
  - `Вкусы микса` теперь считаются пропорционально долям компонентов (аналогично профилям);
  - `Доминирующий вкус` берётся из того же пропорционального расчёта;
  - `Создать микс` перенесена из панели фильтров в summary-блок `Мои миксы` (справа).
- `YummyWeb/src/ui/SessionsScreen.tsx`, `YummyWeb/src/ui/styles.css`:
  - кнопка `Добавить сессию` уменьшена и выровнена вправо.
- `YummyWeb/src/ui/styles.css`:
  - удалены стили `mix-topic-tag`;
  - добавлены стили `mixes-summary-head`, `mixes-create-btn`.

Проверка:
- `cd YummyWeb && npm run build` — `OK`.
- Playwright UI-check (skill):
  - `output/playwright/catalog-card-tags-removed.png`.

## 1.3) Итерация I (1 марта 2026) — финальные правки после теста

Сделано:
- `YummyWeb/src/ui/components/MixPreviewCard.tsx`:
  - для карточек выбран режим с **одним доминирующим профильным тегом** (чтобы не резались слова/теги).
- `YummyWeb/src/ui/SessionsScreen.tsx`:
  - кнопка `Добавить сессию` перенесена на уровень заголовка `Сессии курения` (справа).
- `YummyWeb/src/ui/MixesScreen.tsx`:
  - tooltip диаграмм (`Состав по табакам`, `Профили вкуса`, `Вкусы микса`) показывают проценты в формате `xx.x%`;
  - улучшена читаемость tooltip на тёмном фоне;
  - форма `Создать микс` визуально поднята ближе к кнопке `Назад к моим миксам`.
- `YummyWeb/src/ui/styles.css`:
  - добавлены/обновлены стили `session-create-head`, `session-open-compose`, `mixes-create-layout`.

Проверка:
- `cd YummyWeb && npm run build` — `OK`.
- Playwright UI-check (skill):
  - `output/playwright/catalog-dominant-tag.png`.

## 1.4) Итерация J (1 марта 2026) — перенос и правка текста в сценарии добавления сессии

Сделано:
- `YummyWeb/src/ui/SessionsScreen.tsx`:
  - удален текст-подсказка из фильтров compose-экрана;
  - добавлен отдельный информационный блок рядом с результатами,
  - обновлен copy на production-формулировку:
    `Выберите карточку микса или откройте «Описание» и нажмите «Добавить в сессию».`
- `YummyWeb/src/ui/styles.css`:
  - добавлен `session-compose-reset-btn` для выравнивания кнопки `Сбросить фильтры`.

Проверка:
- `cd YummyWeb && npm run build` — `OK`.

## 1.5) Итерация K (2 марта 2026) — финальные UX правки по тесту

Сделано:
- `YummyWeb/src/ui/styles.css`:
  - стилизован крестик очистки в поисковых фильтрах (`::-webkit-search-cancel-button`).
- `YummyWeb/src/ui/MixesScreen.tsx`:
  - tooltip `Состав по табакам` показывает `название табака + долю`.
- `YummyWeb/src/ui/SessionsScreen.tsx`:
  - удаление сессии переведено на кастомный `AppModal`;
  - убрано состояние с текстом `Не удалось удалить сессию` (мягкое удаление в UI + фоновая попытка синхронизации).
- `YummyWeb/src/ui/App.tsx`:
  - бренд-блок в хедере (`логотип + название`) стал кликабельным переходом на `Главную`.
- `YummyWeb/src/ui/styles.css`:
  - добавлены стили `brand-home-btn`, `session-delete-modal`, `session-delete-content`, `session-delete-actions`;
  - уменьшен вертикальный зазор формы создания микса (`mixes-create-layout`) для визуального выравнивания с кнопкой `Назад к моим миксам`.

Проверка:
- `cd YummyWeb && npm run build` — `OK`.

## 1.6) Итерация L (2 марта 2026) — выравнивание кнопок в модалке профиля

Сделано:
- `YummyWeb/src/ui/styles.css`:
  - выровнен action-row в модалке `Имя профиля`;
  - зафиксированы размеры/отступы кнопок `Отмена` и `Сохранить`, чтобы кнопка `Сохранить` не съезжала.

Проверка:
- `cd YummyWeb && npm run build` — `OK`.

## 1.7) Итерация M (2 марта 2026) — подтверждённый фикс кнопок в модалке имени

Сделано:
- `YummyWeb/src/ui/styles.css`:
  - устранён конфликт каскада с `.ghost-button`;
  - добавлено специфичное правило для action-кнопок модалки имени:
    `.profile-name-actions .profile-name-cancel, .profile-name-actions .profile-name-save { margin-top: 0; }`.

Проверка:
- Playwright skill:
  - route mock `localhost:3001` + mock auth state,
  - открыта модалка `Изменить имя`,
  - артефакт: `output/playwright/profile-name-modal-aligned.png`.
- `cd YummyWeb && npm run build` — `OK`.

## 1.8) Итерация N (2 марта 2026) — окончательное выравнивание кнопок в модалке удаления

Сделано:
- `YummyWeb/src/ui/SessionsScreen.tsx`:
  - у кнопки `Отмена` в модалке удаления убран класс `ghost-button` (источник вертикального смещения).
- `YummyWeb/src/ui/styles.css`:
  - `session-delete-actions`: `align-items: center`, `flex-wrap: wrap`;
  - `session-delete-cancel`, `session-delete-confirm`: `margin: 0`, `min-height: 40px`, одинаковая компоновка.

Проверка:
- Playwright skill (computed style check):
  - `alignItems: center`,
  - `cancelMarginTop: 0px`, `confirmMarginTop: 0px`,
  - `cancelHeight: 40px`, `confirmHeight: 40px`.
- `cd YummyWeb && npm run build` — `OK`.
