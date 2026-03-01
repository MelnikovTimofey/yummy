## Этот файл для человека

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
