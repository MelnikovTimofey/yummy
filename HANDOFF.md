# HANDOFF — Yummy

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
