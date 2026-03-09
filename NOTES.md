## Этот файл для человека

Обновление от 9 марта 2026 (fix: убрать программный scroll после mobile `Найти`):
- Проблема:
  - на реальном iPhone после нажатия mobile-кнопки `Найти` экран мог визуально «срезаться», а хедер пропадал вверх.
- Причина:
  - после submit выполнялся `scrollIntoView` к блоку результатов;
  - на мобильном Safari это могло прокручивать не только внутренний контент, но и весь shell/page, из-за чего верхняя шапка уезжала за экран.
- Изменение:
  - `YummyWeb/src/ui/CatalogScreen.tsx`:
    - убран `resultsRef` и вызов `scrollIntoView` после mobile-submit/reset.
  - `YummyWeb/src/ui/FavoritesScreen.tsx`:
    - убран тот же программный scroll.
  - После применения фильтров теперь происходит только сворачивание панели; результаты становятся видимыми за счёт коллапса блока фильтров, без принудительной прокрутки.
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`.

Обновление от 9 марта 2026 (fix: sticky mobile `Найти` + apply flow for catalog filters):
- Проблема:
  - на телефоне фильтры выбирались в длинной форме, а для применения нужно было возвращаться вверх к кнопке `Найти`;
  - часть фильтров применялась сразу, а часть только по submit, что делало поведение непредсказуемым.
- Изменение:
  - `YummyWeb/src/ui/CatalogScreen.tsx`:
    - mobile-режим переведён на схему `черновик -> применить`;
    - для `Каталога` добавлены applied-state поля для фильтров и сортировки;
    - submit в mobile теперь:
      - применяет текущие черновики,
      - сворачивает блок фильтров,
      - прокручивает к блоку результатов;
    - desktop сохраняет прежний смысл: фильтры обновляются без отдельного цикла применения, поиск по тексту остаётся через submit.
  - `YummyWeb/src/ui/FavoritesScreen.tsx`:
    - та же схема применена к mobile-фильтрам `Избранного`, чтобы поведение было консистентным.
  - `YummyWeb/src/ui/styles.css`:
    - добавлен sticky mobile action bar для `Найти`;
    - кнопка всегда доступна внизу mobile-панели фильтров;
    - inline-кнопка в строке поиска на compact-ширине убрана.
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`;
  - проверка через skill `playwright` на viewport `393x852`:
    - sticky-кнопка `Найти` видна в collapsed и open состоянии фильтров;
    - артефакты:
      - `output/playwright/mobile-wave1/after/catalog-mobile-sticky-find-collapsed.png`
      - `output/playwright/mobile-wave1/after/catalog-mobile-sticky-find-open.png`

Обновление от 9 марта 2026 (fix: mobile search CTA moved below input in catalog screens):
- Проблема:
  - на телефоне кнопка `Найти` в `Каталоге` и `Избранном` находилась в верхней строке рядом с полем поиска и визуально перегружала верхнюю часть блока.
- Изменение:
  - `YummyWeb/src/ui/styles.css`:
    - на ширине до `768px` `.search-row` переведён в одну колонку;
    - `catalog-find-btn` теперь занимает всю ширину строки под полем поиска;
    - desktop-раскладка не менялась.
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`;
  - проверка через skill `playwright` на viewport `393x852` подтвердила, что на mobile кнопка `Найти` уходит под поле поиска.

Обновление от 9 марта 2026 (fix: compact mobile filters for `Каталог` и `Избранное`):
- Проблема:
  - на телефоне блок фильтров в `Каталоге` и `Избранном` занимал почти весь первый экран, из-за чего список результатов или список избранного не был виден без дополнительного скролла;
  - в `Избранном` пользовательский сценарий выглядел как "фильтрация есть, а сам список избранного не видно";
  - внутри доработки был дополнительный риск: JS уже включал compact-режим до `768px`, а CSS показывал toggle только до `480px`.
- Изменение:
  - `YummyWeb/src/ui/hooks/useMediaQuery.ts`:
    - добавлен универсальный hook для media-query без привязки к конкретному экрану.
  - `YummyWeb/src/ui/CatalogScreen.tsx`:
    - добавлен compact-режим фильтров на ширине до `768px`;
    - на mobile сразу видны поиск, статус активных фильтров и результаты;
    - расширенные фильтры открываются отдельной кнопкой `Показать фильтры` / `Скрыть фильтры`.
  - `YummyWeb/src/ui/FavoritesScreen.tsx`:
    - применён тот же compact-паттерн, чтобы список избранного был виден сразу после поиска и summary-блока;
    - добавлены стабильные `data-testid` для toggle и advanced-секции.
  - `YummyWeb/src/ui/styles.css`:
    - добавлены стили для mobile-toggle и группы advanced-фильтров;
    - устранено расхождение breakpoint: `.catalog-mobile-tools` теперь показывается всегда, если блок отрендерен компонентом, без отдельной привязки к `480px`.
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`;
  - проверка через skill `playwright` на viewport `393x852`:
    - `Каталог`: результаты видны сразу, расширенные фильтры свёрнуты по умолчанию;
    - `Избранное`: список избранного виден сразу, фильтры открываются по кнопке.
  - артефакты:
    - `output/playwright/mobile-wave1/after/catalog-mobile-compact-filters.png`
    - `output/playwright/mobile-wave1/after/favorites-mobile-compact-filters.png`

Обновление от 9 марта 2026 (fix: mobile rail headings + hide `Смотреть все` + desktop top align):
- Запрос:
  - на desktop кнопка `Смотреть все` не должна визуально проседать ниже заголовка;
  - на mobile длинные заголовки по-прежнему не влезают;
  - на mobile кнопку `Смотреть все` нужно скрыть.
- Изменение:
  - `YummyWeb/src/ui/HomeScreen.tsx`:
    - заголовочная кнопка рейла получила utility-override:
      - `!flex`
      - `!h-auto`
      - `!w-full`
      - `!items-start`
      - `!justify-start`
      - `!whitespace-normal`
      - `!px-0`
      - `!py-0`
      - `text-left`
    - это снимает дефолтные `h-10`, `justify-center`, `whitespace-nowrap` из `AppButton`.
  - `YummyWeb/src/ui/styles.css`:
    - `home-rail-head` переведён на `align-items: flex-start`;
    - на mobile:
      - уменьшен размер `home-rail-title` до `24px`,
      - включён перенос с нормальным `white-space`,
      - `home-link-btn` скрыт.
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`;
  - проверка через skill `playwright`:
    - mobile viewport `393x852`: заголовки слева, влезают, `Смотреть все` скрыта;
    - desktop viewport `1440x900`: CTA выровнена по верхнему краю строки.

Обновление от 9 марта 2026 (fix: убрать центрирование mobile-заголовков рейлов):
- Проблема:
  - после адаптации длинных заголовков они начали визуально центрироваться на узком mobile viewport.
- Изменение:
  - `YummyWeb/src/ui/HomeScreen.tsx`:
    - для кнопки заголовка рейла добавлены utility-классы `w-full !justify-start text-left`, чтобы перебить базовое `justify-center` из `AppButton`.
  - `YummyWeb/src/ui/styles.css`:
    - сохранена колонка для mobile-шапки рейла и перенос длинных заголовков без центрирования.
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`;
  - проверка через skill `playwright` на mobile viewport (`393x852`) подтверждает левое выравнивание заголовков.

Обновление от 9 марта 2026 (fix: адаптация длинных mobile-заголовков в рейлах):
- Проблема:
  - длинные заголовки разделов на узком iPhone срезались, потому что заголовок и кнопка `Смотреть все` пытались уместиться в одной строке.
- Изменение:
  - `YummyWeb/src/ui/styles.css`:
    - `home-rail-head` получил `min-width: 0`;
    - `home-rail-title-btn` переведён в `flex: 1 1 auto` с `min-width: 0`;
    - `home-rail-title` теперь поддерживает перенос через `overflow-wrap: anywhere`;
    - на `@media (max-width: 480px)` шапка рейла переключается в колонку, а `Смотреть все` уходит под заголовок.
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`.

Обновление от 9 марта 2026 (fix: базовая ширина mobile shell для Safari / iPhone 16):
- Проблема:
  - на реальном iPhone 16 все экраны визуально срезались справа;
  - оболочка приложения получалась шире viewport, даже до применения mobile media query.
- Изменение:
  - `YummyWeb/src/ui/styles.css`:
    - `html`, `body`, `#root` растянуты на `width: 100%`;
    - `body` переведён на `overflow-x: hidden`;
    - `.app-bg` ограничен `width: 100%` и `max-width: 100vw`;
    - `.phone-shell` теперь использует `width: min(calc(100vw - 32px), 430px)` и `max-width: 100%`, чтобы базовая ширина всегда учитывала внешние отступы и не выходила за экран.
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`.

Обновление от 9 марта 2026 (fix: сборка `catalog-updater` с Prisma в Docker):
- Проблема:
  - `docker compose up -d --build` падал на шаге `catalog-updater` при `npm run prisma:generate`;
  - Prisma определял project root как `/app` по пути к schema (`/app/backend/prisma/schema.prisma`) и пытался автоустановить `@prisma/client`, что завершалось ошибкой.
- Изменение:
  - `services/catalog-updater/Dockerfile`:
    - в build stage добавлена установка production-deps из `backend/package.json` в `/app`;
    - это даёт Prisma валидный root package и доступный `@prisma/client` до шага `prisma generate`.
    - `COPY services/catalog-updater ./services/catalog-updater` заменён на выборочное копирование `src`, `scripts`, `tsconfig.json`, чтобы не тянуть локальный `node_modules` в build context образа.
- Проверка:
  - `docker compose build catalog-updater` — `OK`.

Обновление от 9 марта 2026 (docker mobile proxy: `/api` -> `backend:3001`):
- Задача:
  - обеспечить запуск всего проекта в Docker для тестирования с телефона в локальной сети без ручной подстановки LAN IP в frontend API URL.
- Изменение:
  - `YummyWeb/src/shared/api.ts`:
    - базовый API URL по умолчанию переведён с `http://localhost:3001` на относительный `/api`.
  - `YummyWeb/vite.config.ts`:
    - добавлен `server.proxy` для `/api`;
    - target берётся из `API_PROXY_TARGET`, fallback — `http://localhost:3001`.
    - добавлен `rewrite`, который срезает префикс `/api` перед отправкой в backend.
  - `docker-compose.yml`:
    - `yummy-web` теперь получает:
      - `VITE_API_BASE_URL=/api`
      - `API_PROXY_TARGET=http://backend:3001`
    - запросы браузера с телефона идут на один origin (`:5173`), а затем проксируются по внутренней сети Docker.
  - `YummyWeb/README.md`:
    - добавлена инструкция по запуску Docker-контура для телефона.
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`;
  - `docker compose config` — `OK`.

Обновление от 3 марта 2026 (mobile wave1.4: фикс пустого раздела nav после `Смотреть все`):
- Проблема:
  - после перехода `Главная -> Смотреть все` (`rail-list`) в mobile select-nav раздел в шапке становился пустым.
- Причина:
  - в list-nav использовался `value=activeTab`, но для `rail-list` нет пункта в основном списке nav (`home/catalog/favorites/sessions`), из-за чего trigger select рендерился без текста.
- Изменение:
  - `YummyWeb/src/ui/App.tsx`:
    - добавлен `activeMainTabForListNav` (`MainTabKey`) с fallback на `home` для экранов вне основного меню (`rail-list`, `mixes`);
    - в mobile `AppSelect` теперь передаётся `value={activeMainTabForListNav}` и базовые `mainTabItems`.
  - `YummyWeb/e2e/mobile.smoke.spec.ts`:
    - в auth-smoke добавлен шаг перехода через `Смотреть все`, чтобы закрепить регресс-контур сценария.
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`;
  - `cd YummyWeb && npm run e2e:smoke` — `OK` (6/6);
  - контрольный скриншот: `output/playwright/mobile-wave1/after/check-430x932-see-all-nav-v3.png`.

Обновление от 3 марта 2026 (mobile wave1.3: фиксация позиции тега пользовательского микса):
- Проблема:
  - после перехода на icon-only режим тег `Мой микс` оставался под заголовком и визуально «съезжал» на `430x932`.
- Изменение:
  - `YummyWeb/src/ui/components/MixPreviewCard.tsx`:
    - `mix-user-tag` перенесён из `mix-unified-title-wrap` в `mix-unified-actions`, рядом с `info/favorite`.
  - `YummyWeb/src/ui/styles.css`:
    - для `mix-user-tag` добавлены фиксирующие параметры (`justify-content: center`, `min-height: 24px`, `flex: 0 0 auto`).
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`;
  - `cd YummyWeb && npm run e2e:smoke` — `OK` (6/6);
  - контрольный скриншот `430x932` с карточкой: `output/playwright/mobile-wave1/after/check-430x932-user-tag-focus.png`.

Обновление от 3 марта 2026 (mobile wave1.2: фикс тега `Мой микс` на `430x932`):
- Запрос:
  - в карточке на mobile (`430x932`) тег `Мой микс` уезжает и перекрывает контент.
- Изменение:
  - `YummyWeb/src/ui/components/MixPreviewCard.tsx`:
    - пользовательский тег переведён в компактный формат с иконкой (`UserRound`) и короткой подписью (`Мой`/`Автор`);
    - добавлены `title`/`aria-label` для доступности при компактном отображении.
  - `YummyWeb/src/ui/styles.css`:
    - добавлены стили `mix-user-tag-icon` и `mix-user-tag-text`;
    - на `@media (max-width: 480px)` тег переключается в иконку-кружок `24x24` без текста, чтобы исключить наложения.
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`;
  - `cd YummyWeb && npm run e2e:smoke` — `OK` (6/6);
  - контрольный скриншот mobile `430x932`: `output/playwright/mobile-wave1/after/check-430x932-home.png`.

Обновление от 3 марта 2026 (mobile wave1.1: меню-список и упрощение рейлов):
- Запрос:
  - в mobile-версии стрелки в рейлах выглядят избыточно;
  - навигация в header срезается, нужна форма меню «списком».
- Изменение:
  - `YummyWeb/src/ui/App.tsx`:
    - добавен responsive-переключатель навигации:
      - на `<=900px` используется list-nav через `AppSelect`,
      - на больших экранах сохраняется tab-nav;
    - list-nav рендерится отдельной строкой под брендом/профилем;
    - для mobile-nav добавлен `data-testid=\"topbar-nav-select\"`.
  - `YummyWeb/src/ui-kit/AppSelect.tsx`:
    - добавлен `triggerTestId` для стабильного e2e-хука.
  - `YummyWeb/src/ui/styles.css`:
    - добавлены стили `topbar-nav-list`, `topbar-nav-select-*`, `topbar-main-row-compact`;
    - в mobile/compact убрано переполнение header-навигации;
    - стрелки рейлов скрыты по умолчанию и оставлены только на desktop (`@media min-width: 1024px`).
  - `YummyWeb/e2e/mobile.smoke.spec.ts`:
    - smoke адаптирован под list-nav (навигация через select);
    - guest-скролл рейла проверяется через жест прокрутки контейнера, без клика по стрелкам.
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`;
  - `cd YummyWeb && npm run api:smoke:mobile` — `OK`;
  - `cd YummyWeb && npm run e2e:smoke` — `OK` (6/6, `android-chrome` + `ios-safari`).

Обновление от 3 марта 2026 (mobile wave1: API контракт + smoke + touch UX):
- Baseline и дефекты (этап A):
  - baseline-артефакты сохранены в:
    - `output/playwright/mobile-wave1/before/*` (guest/auth, `390x844` и `360x800`);
  - подтверждён P0:
    - отсутствовал backend endpoint `DELETE /sessions/:id` (фактический `404 Not Found`);
  - подтверждён P1:
    - часть touch-таргетов на mobile была ниже целевого порога (`~40px`) для tab/actions.
- Изменение (этап B/C):
  - `backend/src/sessions/routes.ts`:
    - добавлен `DELETE /sessions/:id` с поведением:
      - `400` для невалидного `id`,
      - `404` если сессия пользователя не найдена,
      - `200 { ok: true }` при успешном удалении.
  - `YummyWeb/src/ui/SessionsScreen.tsx`:
    - удаление сессии переведено на optimistic+rollback:
      - удаление из UI + API sync,
      - rollback списка и фидбек `Не удалось удалить сессию.` при ошибке.
  - touch/mobile UX:
    - `YummyWeb/src/components/ui/tabs.tsx`, `YummyWeb/src/ui-kit/AppTabs.tsx`,
      `YummyWeb/src/ui/styles.css`:
      - увеличены tap-target для табов и ключевых action-кнопок;
      - увеличены размеры `header`/`profile menu` кнопок и action-кнопок карточек.
  - для стабильного e2e-контракта добавлены `data-testid` в критичные узлы:
    - `App`, `HomeScreen`, `MixPreviewCard`, `SessionsScreen`, `MixInfoModal`, `AddToSessionModal`, `AppTabs`.
- Репозитарный smoke-контур (этап D):
  - добавлен Playwright smoke:
    - `YummyWeb/playwright.config.ts` (проекты `android-chrome`, `ios-safari`);
    - `YummyWeb/e2e/mobile.smoke.spec.ts` (guest/auth критичные флоу);
    - `YummyWeb/e2e/helpers/authState.ts` (кеш auth-state + refresh fallback).
  - добавлен API smoke:
    - `YummyWeb/scripts/mobileApiSmoke.mjs` (контрактный прогон `/home/rails`, `/mixes`, `/favorites`, `/sessions`, `/mix-ratings/summary`, create/delete session).
  - добавлены npm-скрипты:
    - `api:smoke:mobile`,
    - `e2e:install`,
    - `e2e:smoke`,
    - `e2e:smoke:chromium`,
    - `e2e:smoke:webkit`.
- Проверка (этап E):
  - `cd backend && npm run build` — `OK`;
  - `cd YummyWeb && npm run build` — `OK`;
  - `cd YummyWeb && npm run api:smoke:mobile` — `OK`;
  - `cd YummyWeb && npm run e2e:smoke` — `OK` (`android-chrome` + `ios-safari`, 6/6).
  - after-артефакты сохранены в:
    - `output/playwright/mobile-wave1/after/*`.

Обновление от 3 марта 2026 (точечные UI-правки по фидбеку):
- Изменение:
  - `YummyWeb/src/ui/components/MixPreviewCard.tsx`:
    - тег пользовательского микса (`Мой микс`/`Пользовательский`) перенесён под название карточки.
  - `YummyWeb/src/ui/styles.css`:
    - таблица сессий возвращена на полную ширину контейнера:
      - `.session-table-card { width: 100%; justify-self: stretch; }`
      - `.session-table { width: 100%; min-width: 620px; }`.
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`.

Обновление от 2 марта 2026 (UI-фикс адаптива, скроллов, сессий и меню):
- Проблема:
  - контейнер `phone-shell` был ограничен по ширине на desktop;
  - на mobile появлялся горизонтальный overflow (`topbar/content`);
  - в фильтрах/каталоге использовались «системные» скроллбары;
  - таблица сессий выглядела как слишком широкий пустой блок;
  - пункт `Изменить имя` был не первым в profile-menu;
  - карточки не отличали пользовательские миксы.
- Изменение:
  - `YummyWeb/src/ui/styles.css`:
    - адаптив оболочки: добавлен `grid-template-columns: minmax(0, 1fr)`, desktop-ширина переведена на `width: 100%; max-width: none`;
    - для `.content` включён `overflow-x: hidden`;
    - для mobile (`@media max-width: 480px`) уменьшены отступы/гапы topbar и размеры бренда;
    - введён единый тематический стиль скроллбаров для `.content`, `.catalog-controls`, `.filter-scrollbox`, `.session-table-wrap`, `.preferences-popup`, `.mix-info-modal-shell`;
    - `session-table-card` переведён в `fit-content`-режим, таблица — `width: max-content; min-width: 620px` (`560px` на mobile).
  - `YummyWeb/src/ui/components/MixPreviewCard.tsx`:
    - добавлен optional prop `currentUserId?: string`;
    - добавлен бейдж пользовательского микса:
      - `Мой микс` — для микса текущего пользователя,
      - `Пользовательский` — для остальных `isUserMix`.
  - прокинут `currentUserId` в карточки на экранах:
    - `HomeScreen`, `CatalogScreen`, `FavoritesScreen`, `SessionsScreen`, `RecommendationsScreen`, `MixesScreen`.
  - `YummyWeb/src/ui/App.tsx`:
    - пункт `Изменить имя` перенесён на первое место в выпадающем меню профиля.
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`;
  - проверка через skill `playwright` (`~/.codex/skills/playwright`):
    - desktop `1920x1080`: `shellWidth=1896`, `shellMaxWidth=none`;
    - mobile `390x844`: `shell/header/main scrollWidth == clientWidth` (горизонтального overflow нет);
    - порядок profile-menu: `Изменить имя` отображается первым;
    - в каталоге: `scrollbarWidth=thin` у `content/controls/filter-scrollbox`;
    - в карточках есть бейджи `Мой микс`/`Пользовательский`;
    - в сессиях: `session-table-card` имеет `justify-self:start`, таблица контентной ширины.

Обновление от 1 марта 2026 (фикс переполнения попапа по высоте):
- Проблема:
  - большой попап состава выходил за пределы экрана по вертикали.
- Изменение:
  - `YummyWeb/src/ui/styles.css`:
    - для `mix-info-modal-shell` добавлены:
      - `max-height: min(92dvh, 900px)`,
      - `overflow-y: auto`,
      - `overscroll-behavior: contain`,
      - стили скроллбара.
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`.

Обновление от 1 марта 2026 (попап: убрать нижние теги профилей и добавить рейтинг):
- Изменение:
  - `YummyWeb/src/ui/HomeScreen.tsx`:
    - в секции `Вкусовые профили` убраны дублирующие чипы внизу;
    - добавлена новая секция `Оценка` с полями:
      - `Средняя`,
      - `Количество оценок`.
    - значения берутся из `mixSummaries` по `mixId`.
  - `YummyWeb/src/ui/styles.css`:
    - удалены стили `mix-info-profile-tags` как неиспользуемые.
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`.

Обновление от 1 марта 2026 (стабилизация карточки и рейтинг-тег):
- Проблема:
  - при длинном тексте карточка выглядела «съехавшей»;
  - рейтинг отображался отдельной строкой снизу вместо компактного тега.
- Изменение:
  - `YummyWeb/src/ui/components/MixPreviewCard.tsx`:
    - добавлен `ratingTagText` и рендер рейтинга в блоке тегов;
    - при наличии рейтинга количество видимых профилей ограничивается для предотвращения переполнения.
  - `YummyWeb/src/ui/HomeScreen.tsx`:
    - рейтинг карточки главной передаётся как тег `★ X,X` (или `★ —`).
  - `YummyWeb/src/ui/styles.css`:
    - зафиксирована высота заголовка карточки (две строки), мета ограничена одной строкой;
    - добавлен стиль `mix-rating-tag`.
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`.

Обновление от 1 марта 2026 (редизайн попапа карточки на главной):
- Проблема:
  - попап был визуально слабым и содержал только краткое описание/строку табаков.
- Изменение:
  - `YummyWeb/src/ui/HomeScreen.tsx`:
    - попап переработан в структуру с отдельными секциями:
      - `Табаки и пропорции`,
      - `Вкусы и пропорции` (взвешенно по пропорциям компонентов),
      - `Вкусовые профили` (взвешенно по пропорциям компонентов + чипы),
      - `Описание` (показывается только если есть текст).
    - добавлены функции агрегации долей вкусов/профилей и форматирования процентов.
  - `YummyWeb/src/ui/styles.css`:
    - добавлен продуктовый стиль модалки (`mix-info-modal-shell`, секции, типографика, строки значений, адаптация для mobile).
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`.

Обновление от 1 марта 2026 (оценка на карточках главной):
- Требование:
  - на карточках главной добавить отображение оценки.
- Изменение:
  - `YummyWeb/src/ui/HomeScreen.tsx`:
    - загружаются `mix rating summaries` через `getMixRatingSummaries(...)` для авторизованного пользователя;
    - в `MixPreviewCard` передаётся footer `Средняя: X.X` (или `нет`, если оценки отсутствуют).
- Ограничение:
  - endpoint `/mix-ratings/summary` требует авторизацию (`requireAuth`), поэтому в гостевом режиме оценка на карточках главной не отображается.
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`.

Обновление от 1 марта 2026 (унификация карточек миксов между экранами):
- Требование:
  - карточки должны выглядеть одинаково в каталоге, избранном, рейле и остальных списках миксов.
- Изменение:
  - добавлен общий компонент `YummyWeb/src/ui/components/MixPreviewCard.tsx`:
    - единая структура карточки (заголовок, action-кнопки, мета, теги профилей, нижняя строка),
    - единые action-кнопки (`Info`/`Heart`) и состояния избранного,
    - единая логика сортировки профилей по пропорциям компонентов.
  - на общий компонент переведены списки в:
    - `HomeScreen`, `CatalogScreen`, `FavoritesScreen`, `RailScreen`, `MixesScreen`,
    - выбор микса в `SessionsScreen`,
    - карточки рекомендаций в `RecommendationsScreen` (preview-часть).
  - `YummyWeb/src/ui/styles.css`:
    - добавлены универсальные классы `mix-unified-*` и размеры `rail/grid/fluid`,
    - home-рейл использует тот же компонент через `home-rail-card`.
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`.

Обновление от 1 марта 2026 (рефакторинг action-кнопок карточки на главной):
- Проблема:
  - кнопки `info` и `избранное` на карточках выглядели визуально неровно.
- Изменение:
  - `YummyWeb/src/ui/HomeScreen.tsx`:
    - текстовые символы заменены на иконки `Info` и `Heart` из `lucide-react` (экосистема `shadcn/ui`);
    - для кнопок карточки введены отдельные классы `home-action-btn`/`home-fav-btn`.
  - `YummyWeb/src/ui/styles.css`:
    - добавлены стили единых квадратных action-кнопок (размер, бордер, hover, активное состояние избранного, dashed-стиль для guest).
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`.

Обновление от 1 марта 2026 (порядок профилей на карточках по пропорциям):
- Требование:
  - профили вкуса на карточке должны отображаться в порядке доминирования по пропорциям компонентов микса.
- Изменение:
  - `YummyWeb/src/ui/HomeScreen.tsx`:
    - `getProfileTags` переписан на взвешенный расчёт:
      - для каждого профиля суммируется вклад компонента по `proportion` (с делением вклада на число профилей табака),
      - итоговый список сортируется по убыванию суммарного вклада;
      - профили из `mix.flavorProfiles`, которых нет в расчёте, добавляются в хвост.
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`.

Обновление от 1 марта 2026 (фикс левой стрелки рейла на главной):
- Проблема:
  - левая стрелка в карусели могла не прокручивать рейл, хотя правая работала.
- Причина:
  - при расчёте предыдущей карточки алгоритм иногда выбирал текущую позицию, из-за чего целевой `scrollLeft` не менялся.
- Изменение:
  - `YummyWeb/src/ui/HomeScreen.tsx`:
    - обновлена логика `getNextRailScrollLeft(..., direction=-1)`:
      - переход влево теперь выбирает карточку строго левее текущего `scrollLeft` (с tolerance), а не текущую.
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`.

Обновление от 1 марта 2026 (фикс переполнения тегов в карточках главной):
- Проблема:
  - чипы профилей вкуса могли переноситься на вторую строку и визуально «вылезать» за нижнюю границу карточки.
- Изменение:
  - `YummyWeb/src/ui/HomeScreen.tsx`:
    - отображение тегов профилей в карточке ограничено компактным форматом:
      - до 2 тегов, если тегов немного;
      - при большем количестве — первый тег + индикатор `+N`.
  - `YummyWeb/src/ui/styles.css`:
    - для `home-item-tags` включён однострочный режим без переноса;
    - теги в карточке сделаны компактнее и с `ellipsis` при нехватке ширины.
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`.

Обновление от 1 марта 2026 (UI-рефакторинг карточек на главной):
- Проблема:
  - заголовки и блоки контента в карточках рейлов отображались на разной высоте из-за нижнего выравнивания всего контента.
- Изменение:
  - `YummyWeb/src/ui/HomeScreen.tsx`:
    - структура карточки разделена на `home-item-head` (верхняя зона: заголовок + действия) и `home-item-body` (нижняя зона: мета + теги).
  - `YummyWeb/src/ui/styles.css`:
    - `home-item-overlay` переведён на верхнее выравнивание с `home-item-body { margin-top: auto; }`;
    - добавлены ограничения и единые отступы для `home-item-meta` и `home-item-tags`, чтобы карточки выглядели консистентнее при разной длине текста и тегов.
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`.

Обновление от 1 марта 2026 (миграция `YummyWeb` на `shadcn/ui`, этапы 1-9):
- Что сделано:
  - подключены `Tailwind CSS` + `shadcn/ui` инфраструктура:
    - `components.json`, `tailwind.config.ts`, `postcss.config.js`,
    - алиас `@` в `tsconfig.json` и `vite.config.ts`,
    - `src/lib/utils.ts` (`cn`).
  - добавлены shadcn-примитивы в `src/components/ui/*`:
    - `button`, `input`, `textarea`, `select`, `dialog`, `sheet`, `tabs`, `card`, `badge`, `scroll-area`, `separator`, `label`.
  - добавлен продуктовый адаптерный слой `src/ui-kit/*`:
    - `AppButton`, `AppInput`, `AppTextarea`, `AppSelect`, `AppModal`, `AppCard`, `AppBadge`, `AppTabs`.
  - на `ui-kit` переведены экраны:
    - `App`, `AuthScreen`, `CatalogScreen`, `FavoritesScreen`, `HomeScreen`, `MixesScreen`,
    - `SessionsScreen`, `PreferencesPanel`, `ProfileScreen`, `RailScreen`, `RecommendationsScreen`.
  - выполнена первичная очистка legacy CSS:
    - удалены неиспользуемые классы `popup-*` и `desktop-tab*` из `YummyWeb/src/ui/styles.css`.
  - обновлён `YummyWeb/README.md` (новый UI-стек, структура и правила UI-слоя).
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`.
- Коммиты по логическим блокам:
  - `5bf6de5` — `chore(yummyweb): init tailwind and shadcn base`
  - `b3479fd` — `feat(yummyweb): add brand theme tokens for shadcn`
  - `a366e8e` — `feat(yummyweb): introduce ui-kit adapters over shadcn`
  - `87eeda1` — `refactor(yummyweb): migrate app shell to ui-kit`
  - `634966a` — `refactor(yummyweb): migrate forms and filters to ui-kit`
  - `60c58e8` — `refactor(yummyweb): migrate cards rails and chips to ui-kit`
  - `7f82647` — `refactor(yummyweb): migrate dormant screens to ui-kit`
  - `00f2af7` — `chore(yummyweb): remove unused legacy css after shadcn migration`

Обновление от 1 марта 2026 (Sprint 2, P2.2 — точечный фикс по рейлам и fallback имени):
- Проблема:
  - правая стрелка рейла могла «пропадать», а листание выглядело как общий свайп;
  - при отсутствии заданного имени в профиле отображалось `Seed`, а не email.
- Гипотеза:
  - если зафиксировать ширину контейнера рейла в viewport-границах и листать к первой скрытой карточке, стрелки будут предсказуемо работать для каждого рейла отдельно;
  - если fallback имени сделать на полный email, исчезнет неявная генерация `Seed`.
- Изменение:
  - `YummyWeb/src/ui/styles.css`:
    - исправлена layout-геометрия рейлов (`home-rail`, `home-rail-carousel`, `home-rail-row`) для desktop, чтобы карусель не растягивалась до полной scroll-ширины;
    - overlay-стрелки остаются поверх крайних карточек, но теперь обе находятся в видимой области рейла.
  - `YummyWeb/src/ui/HomeScreen.tsx`:
    - логика стрелок переписана с `scrollBy` на целевую прокрутку к следующей/предыдущей скрытой карточке;
    - скролл выполняется только для конкретного рейла (реф-ключ `id:index`), без побочных эффектов на другие рейлы.
  - `YummyWeb/src/shared/profileName.ts`:
    - fallback изменён: `custom` -> `user.name` -> `email` -> `Мой профиль`.
- Проверка (как проверялось):
  - `npm run build` (`YummyWeb`) — `OK`;
  - Playwright:
    - геометрия первого рейла после hover:
      - `carousel.width=1462`, `leftBtn.x=45`, `rightBtn.x=1439` (обе стрелки в видимой области);
    - клик правой стрелки: `scrollLeft` первого рейла `0 -> 1248` (к первому скрытому блоку карточек);
    - контроль «не скроллить все рейлы»:
      - до: `[1248,0,0]`, после клика: `[2394,0,0]` (меняется только первый рейл);
    - fallback имени в auth-моке:
      - в хедере кнопка `seed@yummy.local`.
- Результат:
  - стрелки стабильно видимы и листают конкретный рейл по непоказанным карточкам;
  - fallback имени больше не генерирует `Seed`, используется email.
- Скриншоты:
  - before (рейл hover): `output/playwright/sprint2-auth-fix-before/rail-hover.png`
  - after (рейл hover): `output/playwright/sprint2-railfix-after/rail-hover.png`
  - e2e (рейл до клика): `output/playwright/sprint2-railfix-e2e/rail-before-click.png`
  - e2e (рейл после клика): `output/playwright/sprint2-railfix-e2e/rail-after-click.png`
  - e2e (fallback email): `output/playwright/sprint2-railfix-e2e/profile-fallback-email.png`
- Коммит: `927f7f5` — `fix(web): починить листание рейлов стрелками и fallback имени`

Обновление от 1 марта 2026 (Sprint 2, P2.1 — UX доработка по фидбэку):
- Проблема:
  - стрелки в рейлах отображались рядом с каруселью, а не поверх крайних карточек;
  - имя профиля в хедере выглядело как `SEED` (форсированный uppercase), не было сценария изменения имени.
- Гипотеза:
  - если сделать стрелки overlay-элементами над крайними карточками, навигация рейлов будет ближе к ожидаемому desktop-паттерну;
  - если добавить редактируемое display name с fallback, профиль станет персонализированным и читаемым.
- Изменение:
  - `YummyWeb/src/ui/styles.css`:
    - desktop-стрелки рейлов переведены в overlay-позиционирование (absolute, поверх левой/правой карточки);
    - кнопка профиля больше не принудительно uppercased.
  - `YummyWeb/src/shared/profileName.ts`:
    - добавлена изолированная логика имени профиля:
      - localStorage-хранилище по `userId`,
      - нормализация ввода,
      - fallback-резолвер (`custom name` -> `user.name` -> humanized email -> `Мой профиль`).
  - `YummyWeb/src/ui/App.tsx`:
    - в dropdown профиля добавлен пункт `Изменить имя`;
    - добавлен popup с полем `Имя` и сохранением;
    - имя в хедере теперь берётся через `resolveProfileName(...)`.
  - `YummyWeb/src/shared/types.ts`:
    - `ApiUser` расширен опциональным полем `name`.
- Проверка (как проверялось):
  - `npm run build` (`YummyWeb`) — `OK`;
  - Playwright:
    - before/after snapshot hover-состояния рейла;
    - before/after snapshot dropdown профиля;
    - сценарий изменения имени: `Seed` -> `Алексей` (обновление кнопки в хедере).
- Результат:
  - стрелки появляются поверх крайних карточек рейла;
  - имя профиля читаемо (`Seed` вместо `SEED`) и редактируется пользователем;
  - при пустом имени используется fallback: имя из e-mail или `Мой профиль`.
- Скриншоты:
  - before: `output/playwright/sprint2-auth-fix-before/rail-hover.png`
  - after: `output/playwright/sprint2-auth-fix-after/rail-hover.png`
  - before (profile): `output/playwright/sprint2-auth-fix-before/profile-menu.png`
  - after (profile): `output/playwright/sprint2-auth-fix-after/profile-menu.png`
  - after (edit popup): `output/playwright/sprint2-auth-fix-after/profile-name-modal.png`
  - e2e (updated name): `output/playwright/sprint2-auth-fix-e2e/profile-name-updated.png`
- Коммит: `bff4425` — `feat(web): overlay-стрелки рейлов и редактируемое имя профиля`

Обновление от 1 марта 2026 (Sprint 2, P2 — auth UX desktop):
- Проблема:
  - вход для гостя был в контенте экрана и не воспринимался как primary action;
  - точка входа в профиль была неочевидной;
  - отдельный экран профиля дублировал навигацию и усложнял путь к `выходу/предпочтениям`.
- Гипотеза:
  - если перенести auth в стандартный desktop-паттерн (`Войти` в хедере + popup),
  - а профиль перевести в header-dropdown с ключевыми действиями,
  - то сценарии `войти/выйти/перейти в раздел` станут короче и заметнее.
- Изменение:
  - `YummyWeb/src/ui/App.tsx`:
    - гостевой хедер: добавлена кнопка `Войти` справа, форма входа вынесена в popup;
    - авторизованный хедер: email заменён на кнопку имени профиля;
    - добавлено dropdown-меню профиля (`Избранное`, `Сессии`, `Создать микс`, `Предпочтения`, `Выйти`);
    - убран отдельный таб `Профиль`, предпочтения открываются в popup поверх текущего экрана;
    - меню профиля закрывается по клику вне меню и по `Escape`.
  - `YummyWeb/src/ui/AuthScreen.tsx`:
    - добавлен режим `asCard` для переиспользования формы входа внутри popup без лишней вложенной карточки.
  - `YummyWeb/src/ui/PreferencesPanel.tsx`:
    - добавлен отдельный компонент панели предпочтений для popup-сценария.
  - `YummyWeb/src/ui/styles.css`:
    - добавлены стили header-auth/profile controls, dropdown меню и popup-хедеров.
- Проверка (как проверялось):
  - `npm run build` в `YummyWeb` — `OK`;
  - Playwright smoke:
    - before/after скриншоты гостевого состояния,
    - открытие/закрытие popup входа,
    - mock-auth через `?token=` + route-моки API,
    - открытие profile-dropdown,
    - открытие popup `Предпочтения`,
    - `Выйти` из dropdown с возвратом в гостевое состояние.
- Результат:
  - вход перенесён в стандартный и видимый desktop-паттерн;
  - вход в профиль и выход доступны из правой части хедера без перехода на отдельный экран;
  - сценарий управления аккаунтом стал линейным и короче по количеству действий.
- Скриншоты:
  - before: `output/playwright/sprint2-auth-before/guest-home.png`
  - after: `output/playwright/sprint2-auth-after/guest-home.png`
  - after (auth popup): `output/playwright/sprint2-auth-after/guest-auth-modal.png`
  - after (profile menu): `output/playwright/sprint2-auth-after/profile-menu-open.png`
  - after (preferences popup): `output/playwright/sprint2-auth-after/preferences-modal.png`
  - e2e: `output/playwright/sprint2-auth-e2e/`
- Коммит: `8cb4958` — `feat(web): перейти на header-auth popup и dropdown профиля`

Обновление от 1 марта 2026 (адаптация клиента под новую структуру):
- В `YummyWeb` исправлен рендер тегов на карточках главной:
  - добавлена санитизация профилей (`trim`, фильтр невалидных/пустых),
  - пустые чипы больше не отображаются.
- В `MixesScreen` обновлён фильтр профилей до полной таксономии:
  - `minty`, `fruity`, `floral_herbal`, `citrus`, `berry`, `perfume`.
- В диаграмме профилей микса добавлена санитизация входных профилей от невалидных значений.

Обновление от 28 февраля 2026 (финализация каталога табаков):
- Для `Tobacco` зафиксирована целевая модель:
  - `flavorProfiles` (включая `perfume`),
  - `flavors` (отдельный массив вкусов),
  - `flavorTags` (только мета-теги: `редкие`, `напитки`, `охлаждающий`).
- Поле `line` удалено из БД и из прикладной модели табака.
- Поле `flavor` отсутствует в схеме, используется `flavors`.
- Добавлены и применены миграции:
  - `20260228213000_tobacco_flavor_perfume_cleanup`
  - `20260228222000_sanitize_tobacco_flavor_fields`
- Выполнен полный uncached refresh только из `hookahportal.ru`:
  - job `11944911-aebf-4bd0-affd-e26e5421bf51`
  - `input.tobaccos=2585`, `input.mixes=602`
  - `tobaccosCreated=33`, `tobaccosUpdated=2552`
  - `mixesCreated=54`, `mixesUpdated=510`, `mixesSkipped=38`
- Проверка эталонного кейса `RED`:
  - `flavorProfiles={floral_herbal,perfume}`
  - `flavorTags={редкие}`
  - `flavors={травы}`
- Контроль качества после миграции:
  - `tobaccos_with_non_meta_tags = 0`
  - в `Tobacco` нет колонки `line`
  - в `Tobacco` нет колонки `flavor`, есть `flavors`

Обновление от 28 февраля 2026 (prod-ready таксономия табаков/миксов):
- В Prisma добавлены новые профили вкуса: `minty`, `fruity`, `floral_herbal`, `citrus`, `berry`.
- В `Tobacco` добавлены атрибуты `flavors` (вкусы) и `tags` (полезные некатегоризированные свойства).
- В `Mix` добавлен атрибут `flavors`; микс теперь наследует `flavorProfiles`, `flavors` и `tags` от табаков-компонентов.
- Добавлена миграция: `backend/prisma/migrations/20260228204000_expand_tobacco_mix_taxonomy/migration.sql`.
- Обновлены `backend/prisma/seed.ts` и `services/catalog-updater` для автозаполнения:
  - `flavors` из вкусовых тегов,
  - `tags` (включая эвристику `напитки/охлаждающий/редкий`),
  - наследование свойств в миксах.
- API расширен:
  - `/tobaccos` поддерживает фильтры `profile`, `flavor`, `tag`,
  - `/mixes` и `/favorites` поддерживают фильтры `profiles`, `flavors`, `tags`.

Обновление от 28 февраля 2026 (миграция + пересборка каталога):
- Миграции Prisma применены через `backend-migrate` (pending migrations: `0`).
- Пересборка каталога выполнена job `7f01ddd7-fc8a-4865-9258-14d22a3f24a4`.
- Источник каталога: только `hookahportal` (`sourceNames: ["hookahportal-catalog-test"]`).
- Итог job:
  - `input.tobaccos=2592`, `input.mixes=581`
  - `tobaccosUpdated=2592`
  - `mixesUpdated=533`
  - `mixesSkipped=48`
- Текущие размеры таблиц после пересборки:
  - `Manufacturer=72`
  - `Tobacco=2592`
  - `Mix=533`
  - `MixComponent=1771`

Текущее состояние каталога (на 23 февраля 2026):
- Для табаков и миксов используется HookahPortal как test-source.
- Добавлен локальный JSON-кеш:
  - `services/catalog-updater/cache/hookahportal/tobaccos.json`
  - `services/catalog-updater/cache/hookahportal/mixes.json`
- Последний импорт в БД после полной очистки каталога:
  - `Manufacturer=69`
  - `Tobacco=2528`
  - `Mix=508`
  - `MixComponent=1652`
- Автор всех импортированных миксов: `hookahportal`.

Что важно помнить:
1. Источник HookahPortal включается только при `CATALOG_ALLOW_TEST_SOURCES=true`.
2. `local-seed` сейчас используется только для табаков (без миксов).
3. Часть миксов отбрасывается валидатором (некорректные пропорции/компоненты).
4. Перед запуском `npm run import:tobaccos` в новом окружении обязательно применить миграции (`docker compose --profile setup up backend-migrate` или `npm run prisma:migrate`).

Следующие шаги:
1. `npm run cache:refresh:hookahportal` добавлена в `services/catalog-updater`.
2. `npm run catalog:refresh:from-cache` добавлена в `services/catalog-updater`.
3. Добавлен `npm run import:tobaccos` в `backend` (запуск refresh через API updater + polling статуса).
4. Добавлен корневой `docker-compose.yml` для полного локального контура (`db`, `mailpit`, `backend`, `catalog-updater`, `yummy-web`, профили `setup` и `ml`).
5. Сохранить отчёт о последнем импорте (JSON артефакт со stats/issues).
6. Решить стратегию для миксов с суммой пропорций != 100 (нормализация или soft-skip).

## Обновления продуктового сценария UI (целевое)

Статус: `target state / artifact update` (описание целевого сценария, не факт полной реализации в коде).

Экранные замечания (12):
1. Вместо неочевидной первой карточки на главной первым блоком должен идти рейл `Рекомендации для вас`.
2. Элемент рейла должен содержать: название микса, названия табаков (без названия производителя).
3. В элементе рейла должна быть кнопка/иконка `info` с popup-описанием.
4. Вкусовые профили должны отображаться тегами.
5. Нажатие на название рейла или `Смотреть все` открывает отдельный экран полного списка элементов рейла.
6. В основной tab-навигации сохраняется `Каталог`, вкладка `Миксы` убирается.
7. Экран `Подборка` как отдельный сценарий больше не используется.
8. На главной добавляется отдельный рейл `Избранное`.
9. Панель `API Endpoint` убирается из продуктового интерфейса.
10. `Сессии курения` доступны из `Профиля`.
11. Кнопка `Карточка` в элементах списков не нужна, переход выполняется нажатием на элемент.
12. Действие `В избранное` оформляется иконкой, а не текстовой кнопкой.

Дизайн-замечания (8):
1. Нормализовать стиль компонентов и экранов в единой дизайн-системе.
2. Визуальное направление: `luxury / lounge / rich / best / old money`.
3. Карточку микса сделать более согласованной: две круговые диаграммы не размещать вертикальным стеком.
4. Согласовать размеры кнопок между экранами.
5. Навигационное меню ориентировать на референсы: `okko.tv`, `artlebedev.ru`.
6. Добавить логотип.
7. Для больших списков добавить поиск по подстроке.
8. Для рейлов использовать листание кнопками влево/вправо как основной паттерн (без акцента на нижний горизонтальный скролл).

Product-rules (зафиксировано):
1. Первый рейл на главной: `Рекомендации для вас`.
2. Рейл `Избранное` на главной — только для авторизованного пользователя.
3. В карточке элемента рейла используются иконки `info` и избранного.
4. Переход в карточку микса происходит нажатием на элемент.
5. Длинные списки должны поддерживать поиск по подстроке.
6. Рейлы должны поддерживать листание кнопками влево/вправо.

Обновление от 1 марта 2026 (UX quick wins, desktop):
- `YummyWeb`:
  - улучшена desktop-читаемость интерфейса (типографика, размеры интерактивов, контраст фокуса);
  - добавлены `focus-visible`-стили для `button/input/select`;
  - добавлен inline favicon в `index.html` (устранён 404 по `/favicon.ico`);
  - в `CatalogScreen` добавлены:
    - summary активных фильтров,
    - кнопка `Сбросить фильтры`,
    - чистая функция `buildActiveFilterLabels` для тестируемой логики формирования summary;
  - в `HomeScreen` для гостя:
    - добавлена явная подсказка по ограничениям режима,
    - кнопка избранного больше не «мертвая» (не `disabled`), показывает обратную связь «Войдите, чтобы управлять избранным»;
    - исправлена доступность: убран `aria-disabled`-паттерн, блокировавший вложенные кнопки карточки;
    - popup `Описание` закрывается по клавише `Escape`.
- Проверка:
  - `npm run build` (успешно);
  - e2e smoke через Playwright:
    - главная/каталог,
    - поиск + сброс фильтров,
    - открытие карточки микса из каталога + возврат,
    - гостевой клик по избранному,
    - popup описания + закрытие по `Escape`.
- Скриншоты:
  - до: `output/playwright/audit-before/`
  - после: `output/playwright/audit-after/`
  - e2e: `output/playwright/e2e/`

Обновление от 1 марта 2026 (Sprint 2, P0 — по пользовательскому фидбэку):
- `YummyWeb`:
  - в карточках рейлов вместо названий табаков показываются `flavors` (топ-3; fallback — `Вкусы не указаны`);
  - на desktop стрелки рейлов скрыты по умолчанию и показываются при `hover/focus-within` рейла;
  - в гостевом режиме блок авторизации поднят наверх контента (стал заметным до скролла);
  - в основную desktop-навигацию вынесены разделы из профиля: `Избранное`, `Сессии`, `Профиль`;
  - из экрана `Профиль` убраны дублирующие переходы `Избранное/Сессии`;
  - убраны сообщения вида `Рейл «Избранное» появится...` и `Рейл «Мои миксы» появится...`;
  - дополнительно уплотнены desktop-отступы/ширины карточек для снижения визуальной «пустоты».
- Проверка:
  - `npm run build` — успешно;
  - Playwright smoke:
    - guest: главная/каталог и новое расположение auth-блока;
    - проверка поведения стрелок рейла (до hover `opacity=0,pointer-events=none`, на hover `opacity=1,pointer-events=auto`);
    - mocked-auth snapshot: подтверждена новая top-nav с `Избранное/Сессии/Профиль`.
- Скриншоты итерации:
  - before: `output/playwright/sprint2-p0-before/`
  - after: `output/playwright/sprint2-p0-after/`

Обновление от 1 марта 2026 (Sprint 2, P1 — каталог desktop):
- `YummyWeb / CatalogScreen`:
  - desktop-раскладка каталога переделана на 2 колонки:
    - слева выдача,
    - справа постоянная панель фильтров;
  - фильтры производителей и табаков теперь поддерживают мультивыбор;
  - добавлен фильтр по вкусам (`flavors`) с мультивыбором;
  - добавлено автодополнение тегов:
    - ввод тега с добавлением по `Enter`/`,`,
    - быстрый выбор из подсказок,
    - удаление выбранных тегов через chip;
  - summary активных фильтров расширен (бренды/табаки/вкусы/теги).
- `API client`:
  - в параметры `getMixes/getFavorites` добавлена поддержка `flavor/flavors`.
- Проверка:
  - `npm run build` — успешно;
  - Playwright smoke:
    - baseline catalog before/after,
    - мультивыбор брендов и табаков,
    - фильтр по вкусу,
    - выбор тега из автодополнения,
    - reset фильтров.
- Скриншоты итерации:
  - before: `output/playwright/sprint2-p1-before/`
  - after: `output/playwright/sprint2-p1-after/`

Доп. корректировка от 1 марта 2026 (по фидбэку после P1):
- Desktop catalog:
  - панель фильтров перенесена в левую колонку (выдача справа).
- Карточки рейлов на главной:
  - добавлен более жёсткий fallback для строки вкусов:
    - `flavors`,
    - fallback на профили (в нижнем регистре),
    - затем `вкус не указан`.
- Desktop spacing:
  - расширена рабочая область (`phone-shell`) и уменьшены внешние отступы `app-bg`.
- Артефакты проверки:
  - before: `output/playwright/sprint2-fix-before/`
  - after: `output/playwright/sprint2-fix-after/`

Обновление от 1 марта 2026 (UX/UI хедера и навигации, all screens):
- `YummyWeb / App.tsx`:
  - убран длинный subtitle в topbar;
  - title экрана и tab-меню объединены в одну строку в рамках `topbar`;
  - удалён отдельный блок `desktop-tabbar` (навигация встроена в header).
- `YummyWeb / styles.css`:
  - `phone-shell` переведён на фиксированную высоту viewport (`height` вместо `min-height`);
  - контейнер контента оставлен как единственная scroll-область (`main.content`);
  - обновлены стили `topbar` и tabs для layout `title + menu` в одну линию;
  - удалены стили `catalog-hero` и устаревшего отдельного tabbar.
- `YummyWeb / CatalogScreen.tsx`, `RailScreen.tsx`:
  - убраны дублирующие hero-заголовки, повторявшие title из topbar.
- `YummyWeb / ui-kit/AppTabs.tsx`:
  - добавлены `listClassName` и `stretch`, чтобы использовать компактные tabs в header-строке.
- Проверка:
  - `npm run build` — успешно;
  - сняты before/after-скриншоты через Playwright.
- Артефакты:
  - before: `output/playwright/before/`
  - after: `output/playwright/after/`

Точечная корректировка от 1 марта 2026 (по доп. фидбэку UX):
- В `YummyWeb/src/ui/App.tsx` убрано дублирование названия активной вкладки в хедере (удалён `h1` с title секции).
- Хедер оставляет только бренд/профиль и строку вкладок, без отдельного текстового заголовка вкладки.
- В `YummyWeb/src/ui/styles.css` уменьшены вертикальные отступы topbar, удалены стили `topbar-title`.
- Проверка: `cd YummyWeb && npm run build` — успешно.

Точечная корректировка от 1 марта 2026 (выравнивание меню в одной линии):
- В `YummyWeb/src/ui/App.tsx` меню вкладок перенесено в `topbar-main-row` (одна горизонтальная линия с названием бренда).
- Удалён отдельный нижний ряд навигации внутри хедера.
- В `YummyWeb/src/ui/styles.css` обновлён `topbar`/`topbar-main-row`:
  - единая строка `brand + tabs + profile`,
  - `topbar-nav` стал flex-областью с горизонтальным скроллом,
  - для компактности уменьшены размеры бренд-блока, на узком mobile скрывается `tagline`.
- Проверка: `cd YummyWeb && npm run build` — успешно.
- Доп. фиксация: в одной строке установлен порядок `brand → tabs → profile`, чтобы навигация была визуально по центру, а профиль стабильно справа.

Обновление от 1 марта 2026 (Итерация A — экран микса, точечная унификация):
- `YummyWeb/src/ui/MixesScreen.tsx`:
  - убран зелёный бейдж с цифрой количества компонентов в hero-блоке;
  - CTA `Добавить в сессию` переведён в компактный `ghost`-стиль;
  - кастомный символ `♥/♡` заменён на `Heart` из `lucide-react`;
  - кнопка избранного в деталке микса переведена на общие классы карточек (`mix-action-btn`, `mix-fav-btn`).
- `YummyWeb/src/ui/styles.css`:
  - добавлен класс `mix-detail-session-btn` для уменьшенного CTA в hero;
  - удалены неиспользуемые legacy-стили `rating-pill`, `icon-btn`, `fav-icon`, `info-btn`;
  - размер `mix-detail-fav` синхронизирован с action-кнопками карточек.
- Проверка:
  - `cd YummyWeb && npm run build` — успешно;
  - Playwright smoke (skill `playwright`): `output/playwright/iter-a/home-after-a.png`.

Обновление от 1 марта 2026 (Итерация B — каталог):
- `YummyWeb/src/ui/CatalogScreen.tsx`:
  - `info` на карточках каталога переведён на popup (больше не ведёт в карточку микса);
  - добавлен единый попап состава (`MixInfoModal`) для каталога;
  - фильтры `теги`, `профили`, `вкусы` переведены на масштабируемый scroll-паттерн (аналогично производителям/табаку);
  - уменьшена кнопка `Найти` через класс `catalog-find-btn`.
- `YummyWeb/src/ui/components/MixInfoModal.tsx`:
  - выделен переиспользуемый popup с секциями: рейтинг, табаки, вкусы, профили, описание.
- `YummyWeb/src/ui/HomeScreen.tsx`:
  - модалка состава переведена на `MixInfoModal` (без изменения пользовательского сценария).
- `YummyWeb/src/ui/styles.css`:
  - добавлены стили для компактного поиска в каталоге (`catalog-find-btn`);
  - улучшена переносимость текста в `filter-option` (устранение срезания на desktop);
  - добавлен `mix-detail-session-btn` и общий cleanup legacy-классов из итерации A.
- Проверка:
  - `cd YummyWeb && npm run build` — успешно;
  - Playwright smoke (skill `playwright`):
    - переход в `Каталог`;
    - клик `info` открывает popup без навигации;
    - артефакт: `output/playwright/iter-b/catalog-info-after-b.png`.

Обновление от 1 марта 2026 (Итерация C — Избранное):
- `YummyWeb/src/ui/FavoritesScreen.tsx` полностью переведён на новый UX:
  - фильтры урезаны до `теги + вкусы + профили` (как согласовано);
  - добавлены масштабируемые scrollbox-фильтры с поиском внутри групп;
  - добавлены активные фильтры + `Сбросить фильтры` (паттерн каталога);
  - карточки оставлены в едином `MixPreviewCard` grid-формате;
  - `info` на карточках переведён в popup через `MixInfoModal`.
- Проверка:
  - `cd YummyWeb && npm run build` — успешно;
  - Playwright smoke (skill): `output/playwright/iter-c/home-after-c.png`.

Обновление от 1 марта 2026 (Итерация D — Сессии):
- `YummyWeb/src/ui/SessionsScreen.tsx`:
  - сценарий создания сессии переработан: единый экран `compose` (выбор микса + локация + сохранение);
  - добавлен поиск по миксам при добавлении;
  - добавлен `info` popup в выборе микса через `MixInfoModal`;
  - добавлена возможность выбора микса из popup (`Выбрать микс для сессии`);
  - список сессий обновлён до более структурированного card-layout;
  - добавлено удаление сессии с подтверждением (`window.confirm`).
- `YummyWeb/src/shared/apiClient.ts`:
  - добавлен `deleteSession(auth, onAuthUpdate, sessionId)` (`DELETE /sessions/:id`).
- `YummyWeb/src/ui/styles.css`:
  - добавлены стили compose/list сценария сессий (`session-compose-card`, `session-entry-card`, `session-delete-btn` и др.).
- Проверка:
  - `cd YummyWeb && npm run build` — успешно;
  - Playwright smoke (skill, с mock API-роутами):
    - авторизованный mock-режим,
    - переход на вкладку `Сессии`,
    - артефакт: `output/playwright/iter-d/sessions-after-d.png`.
- Ограничение:
  - удаление требует backend endpoint `DELETE /sessions/:id`; в клиенте поддержка уже добавлена.

Обновление от 1 марта 2026 (Итерация E — Мои миксы + создание микса):
- `YummyWeb/src/ui/App.tsx`:
  - пункт меню профиля `Создать микс` заменён на `Мои миксы`;
  - переход из меню профиля теперь открывает экран `Мои миксы` (list-режим).
- `YummyWeb/src/ui/MixesScreen.tsx`:
  - экран переведён в сценарий `Мои миксы` по умолчанию (загрузка только `authorId=currentUser`);
  - убран переключатель источника `Все/Только мои`;
  - добавлена явная кнопка возврата из формы создания в список `Мои миксы`;
  - улучшен UX выбора табаков при создании:
    - добавлен быстрый поиск табака,
    - добавлен список быстрых результатов с добавлением в компоненты,
    - оставлен детальный контроль пропорций по строкам.
- `YummyWeb/src/ui/styles.css`:
  - добавлен `mix-create-search-results` для прокручиваемого блока быстрых результатов.
- Проверка:
  - `cd YummyWeb && npm run build` — успешно;
  - Playwright smoke (skill, mock-auth + mock API):
    - открытие меню профиля,
    - переход `Мои миксы`,
    - артефакт: `output/playwright/iter-e/my-mixes-after-e.png`.

Обновление от 1 марта 2026 (Итерация F — экран микса + shadcn charts):
- `YummyWeb/package.json`, `YummyWeb/package-lock.json`:
  - добавлена зависимость `recharts` для графиков.
- `YummyWeb/src/components/ui/chart.tsx`:
  - добавлен shadcn-совместимый chart-контейнер (`ChartContainer`, `ChartConfig`).
- `YummyWeb/src/ui/MixesScreen.tsx`:
  - экран микса переработан по компоновке;
  - добавлен блок инфографики (`Доминирующий профиль`, `База микса`);
  - диаграммы переведены на `recharts` внутри `ChartContainer`:
    - donut по табакам,
    - bar-chart по профилям вкуса;
  - на list-экране `Мои миксы` подключён popup `info`.
- `YummyWeb/src/ui/components/MixPreviewCard.tsx`:
  - `info`-кнопка отображается только при переданном `onOpenInfo` (исключён fallback-переход в карточку микса).
- `YummyWeb/src/ui/RailScreen.tsx`, `YummyWeb/src/ui/RecommendationsScreen.tsx`:
  - подключён `MixInfoModal` для `info`-кнопки на карточках.
- `YummyWeb/src/ui/styles.css`:
  - добавлены стили инфографики и новых chart-контейнеров;
  - адаптация chart-блоков под mobile (`1` колонка).
- Проверка:
  - `cd YummyWeb && npm run build` — успешно (есть предупреждение о размере chunk после добавления `recharts`);
  - Playwright smoke (skill, mock-auth/mock API):
    - переход `Профиль -> Мои миксы -> карточка микса`,
    - артефакт: `output/playwright/iter-f/mix-detail-charts-after-f.png`.

Обновление от 1 марта 2026 (Итерация G — доп. UX/UI правки карточек, сессий и моих миксов):
- `YummyWeb/src/ui/components/MixPreviewCard.tsx`:
  - унифицировано содержимое карточек: рейтинг переведён в `rating tag` формат;
  - добавлены теги микса как отдельные чипы (`mix-topic-tag`) вместе с профилями;
  - выровнен размер иконки избранного относительно action-кнопки.
- `YummyWeb/src/ui/components/AddToSessionModal.tsx`:
  - добавлен единый popup добавления в сессию (Дом/Лаунж + кнопка `Добавить в сессию`).
- `YummyWeb/src/ui/RecommendationsScreen.tsx`:
  - добавление в сессию переведено на общий popup `AddToSessionModal`;
  - карточки приведены к единому контракту рейтинга (tag + footer с личной оценкой).
- `YummyWeb/src/ui/CatalogScreen.tsx`, `YummyWeb/src/ui/FavoritesScreen.tsx`:
  - выравнен формат рейтинга на карточках (tag), без расхождения с главной.
- `YummyWeb/src/ui/MixesScreen.tsx`:
  - list `Мои миксы` переделан в структуру как у избранного/каталога (`filters слева`, `карточки справа` на desktop);
  - фильтры в `Мои миксы`: `теги + вкусы + профили`, поиск и сортировка;
  - в detail добавлены: `Доминирующий вкус`, теги микса и диаграмма `Вкусы микса`;
  - добавление в сессию из detail и из `info` popup переведено на единый popup;
  - форма создания микса переложена в более стабильный grid-лейаут (исправление кривой верстки).
- `YummyWeb/src/ui/SessionsScreen.tsx`:
  - список сессий переведён в компактный табличный формат;
  - уменьшена визуальная масса CTA (`Добавить сессию`);
  - выбор микса в compose переделан как каталог: фильтры `теги + вкусы + профили`, поиск и сортировка;
  - добавление в сессию из карточки и из `info` выполняется через popup с выбором места.
- `YummyWeb/src/ui/styles.css`:
  - добавлены/обновлены стили для таблицы сессий, popup добавления в сессию, create-grid, тегов detail и улучшенного скролла фильтров (`overscroll-behavior`, `touch-action`).

Проверка:
- `cd YummyWeb && npm run build` — `OK`.
- Playwright UI-check (skill, guest-flow + модалка + проверка скролла фильтра):
  - `output/playwright/home-guest.png`
  - `output/playwright/catalog-filters.png`
  - `output/playwright/catalog-info-modal.png`
  - `output/playwright/catalog-card-element.png`
  - проверка независимого скролла фильтра через `eval`: `page scroll` остаётся `0`, `filter-scrollbox` прокручивается до `boxMax`.

Обновление от 1 марта 2026 (Итерация H — точечные правки после тестирования):
- `YummyWeb/src/ui/components/MixPreviewCard.tsx`:
  - удалены теги микса из карточек на всех экранах;
  - в карточке оставлены только профильные чипы (и рейтинг-тег, если передан).
- `YummyWeb/src/ui/MixesScreen.tsx`:
  - диаграмма `Вкусы микса` переведена на пропорциональный расчёт (по долям компонентов, как у профилей);
  - `Доминирующий вкус` теперь берётся из рассчитанного пропорционального распределения;
  - кнопка `Создать микс` вынесена из фильтров в блок рядом с заголовком `Мои миксы` (справа).
- `YummyWeb/src/ui/SessionsScreen.tsx`, `YummyWeb/src/ui/styles.css`:
  - кнопка `Добавить сессию` уменьшена и выровнена вправо на экране сессий.
- `YummyWeb/src/ui/styles.css`:
  - удалены стили под mix-теги карточек;
  - добавлены стили `mixes-summary-head`, `mixes-create-btn`.

Проверка:
- `cd YummyWeb && npm run build` — `OK`.
- Playwright UI-check (skill):
  - `output/playwright/catalog-card-tags-removed.png`.

Обновление от 1 марта 2026 (Итерация I — финальные UX-правки карточек/сессий/инфографики):
- `YummyWeb/src/ui/components/MixPreviewCard.tsx`:
  - выбран вариант отображения **одного доминирующего профильного тега** в карточке (вместо нескольких), чтобы исключить обрезание тегов.
- `YummyWeb/src/ui/SessionsScreen.tsx`, `YummyWeb/src/ui/styles.css`:
  - кнопка `Добавить сессию` перенесена в строку заголовка `Сессии курения` (справа) и сделана заметнее.
- `YummyWeb/src/ui/MixesScreen.tsx`:
  - tooltip на всех диаграммах экрана микса приведены к явному показу процентов (`Доля`, формат `xx.x%`);
  - обновлена визуальная читаемость tooltip (label/item color на тёмном фоне);
  - форма создания микса поднята выше к кнопке `Назад к моим миксам` (через `mixes-create-layout`).
- `YummyWeb/src/ui/styles.css`:
  - добавлены стили `session-create-head`, скорректирован `session-open-compose`, добавлен `mixes-create-layout`.

Проверка:
- `cd YummyWeb && npm run build` — `OK`.
- Playwright UI-check (skill):
  - `output/playwright/catalog-dominant-tag.png`.

Обновление от 1 марта 2026 (Итерация J — copy/placement для создания сессии):
- `YummyWeb/src/ui/SessionsScreen.tsx`:
  - убран служебный текст из блока фильтров в compose-режиме;
  - добавлен отдельный информационный блок в зоне результатов со production-формулировкой:
    `Выберите карточку микса или откройте «Описание» и нажмите «Добавить в сессию».`
- `YummyWeb/src/ui/styles.css`:
  - добавлен `session-compose-reset-btn` для аккуратного позиционирования кнопки `Сбросить фильтры`.

Проверка:
- `cd YummyWeb && npm run build` — `OK`.

Обновление от 2 марта 2026 (Итерация K — UX фиксы фильтров/удаления/хедера):
- `YummyWeb/src/ui/styles.css`:
  - стилизован системный крестик очистки в `search`-инпутах (`::-webkit-search-cancel-button`) под продуктовую палитру.
- `YummyWeb/src/ui/MixesScreen.tsx`:
  - tooltip диаграммы `Состав по табакам` теперь показывает не только долю, но и название табака.
- `YummyWeb/src/ui/SessionsScreen.tsx`:
  - удаление сессии переведено с системного `window.confirm` на продуктовый `AppModal`;
  - убрано сообщение `Не удалось удалить сессию`: используется мягкое удаление в UI с best-effort синхронизацией на backend.
- `YummyWeb/src/ui/App.tsx`:
  - клик по логотипу/названию в хедере (гость и авторизованный режим) ведёт на `Главную`.
- `YummyWeb/src/ui/styles.css`:
  - добавлены стили для `brand-home-btn`, `session-delete-modal`, `session-delete-actions`;
  - форма создания микса поднята ближе к кнопке `Назад к моим миксам` (`mixes-create-layout`).

Проверка:
- `cd YummyWeb && npm run build` — `OK`.

Обновление от 2 марта 2026 (Итерация L — фиксация layout кнопок в модалке имени):
- `YummyWeb/src/ui/styles.css`:
  - исправлено выравнивание блока действий в модалке `Имя профиля` (`profile-name-actions`);
  - кнопки `Отмена` и `Сохранить` принудительно выровнены по одной линии (`align-items:center`, `margin:0`, `min-height`),
  - добавлены минимальные ширины для стабильной композиции.

Проверка:
- `cd YummyWeb && npm run build` — `OK`.

Обновление от 2 марта 2026 (Итерация M — финальный фикс модалки имени):
- Причина съезда кнопки `Отмена`: каскад `.ghost-button { margin-top: 10px; }` переопределял стиль модалки.
- `YummyWeb/src/ui/styles.css`:
  - добавлено более специфичное правило ниже по файлу:
    `.profile-name-actions .profile-name-cancel, .profile-name-actions .profile-name-save { margin-top: 0; }`
  - кнопки в модалке имени снова выровнены по одной горизонтали.

Проверка (playwright skill):
- mock-auth через `localStorage` + route mock API;
- открыта модалка `Изменить имя` и снят скрин:
  - `output/playwright/profile-name-modal-aligned.png`.
- `cd YummyWeb && npm run build` — `OK`.

Обновление от 2 марта 2026 (Итерация N — выравнивание кнопок в модалке удаления):
- `YummyWeb/src/ui/SessionsScreen.tsx`:
  - кнопка `Отмена` в модалке удаления больше не использует класс `ghost-button` (он добавлял `margin-top`).
- `YummyWeb/src/ui/styles.css`:
  - в `session-delete-actions` зафиксировано выравнивание по центру и единая высота;
  - добавлены отдельные стили `session-delete-cancel` / `session-delete-confirm` с `margin:0`, `min-height:40px`.

Проверка (playwright skill):
- проверены computed styles в контексте страницы:
  - `alignItems: center`,
  - `cancelMarginTop: 0px`,
  - `confirmMarginTop: 0px`,
  - `cancelHeight: 40px`, `confirmHeight: 40px`.
- `cd YummyWeb && npm run build` — `OK`.
