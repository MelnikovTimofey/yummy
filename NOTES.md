# NOTES

Обновление от 3 апреля 2026 (docs: сократить артефактные файлы и вынести полную историю в архив):
- Полные версии рабочих артефактов сохранены без сокращений:
  - `docs/artifacts/archive/2026-04-03-NOTES-full.md`
  - `docs/artifacts/archive/2026-04-03-HANDOFF-full.md`
- Основные `NOTES.md` и `HANDOFF.md` переведены в компактный rolling-формат:
  - здесь остаётся только актуальный срез и краткая история последних значимых блоков;
  - детальный журнал больше не дублируется в основном файле, если он уже сохранён в архиве.
- Это docs-only изменение: runtime, контракты и продуктовая семантика не менялись.

## Как вести файл дальше

- Держать в основном файле только актуальный контекст, нужный для следующего рабочего шага.
- Не тащить сюда полный changelog по каждому локальному микро-изменению, если для этого уже есть `HANDOFF.md` или архив.
- При очередном разрастании переносить старый хвост в новый archive snapshot, а не раздувать основной файл.

## Актуальный срез на 3 апреля 2026

### Repo-level

- `legacy Yummy` и `Nomad` по-прежнему изолированы; текущие активные изменения идут в Nomad-контуре.
- Для больших рабочих записей теперь используется схема:
  - compact main artifact;
  - full archive snapshot в `docs/artifacts/archive/`.

### Nomad Master

- В `Inventory` появился create flow для новых табаков: кнопка, inline-форма и сохранение через backend-контракт `POST /staff/inventory/tobaccos`.
- В `Mixes` operator больше не вводит вручную `популярность` и `базовый рейтинг`; эти поля остаются производными от аналитики и guest-оценок.
- В `Rails` selector добавления миксов переведён на тот же searchable picker pattern, что и выбор табаков в редакторе микса.
- В `Inventory` и `Mixes` giant tag walls заменены на компактные searchable multi-select фильтры.
- Создание и редактирование микса вынесены в отдельные экраны внутри вкладки `Миксы`; широкий каталог больше не конкурирует с боковым editor panel.
- Последний visual pass перевёл `Master` в новый premium editorial backoffice direction:
  - навигация возвращена наверх как compact top nav, чтобы не съедать ширину у больших operational tables;
  - дубль активной секции убран: topbar снова про продукт и runtime, а модульный header отвечает за текущий slice;
  - dashboard surfaces затемнены и приведены к shell baseline без светлых `shadcn/tailwind` карточек;
  - palette стала тёмной copper-black с более выраженным focus на active module и статусах;
  - desktop-first operational layout сохранён без изменения backend/contracts и role semantics.

### Nomad Backend / HTReviews

- Поднят изолированный HTReviews integration foundation:
  - preview import;
  - live sync в текущую Nomad DB;
  - detail backfill для вкусов, тегов и крепости.
- `NomadTobacco` расширен source-полями (`lineName`, source metadata, strength, status, country, image/raw tags).
- Новые HTReviews tobacco по умолчанию импортируются с `inStock=false`.
- Тестовый backend-контур вынесен в отдельную Prisma schema `nomad_test`; `resetNomadState()` запрещён вне test-mode без явного opt-in.

### Staff surfaces

- `Inventory` в `Nomad Master` показывает линейку, крепость, страну, статус и описание табака.
- По клику на табак открывается popup-карточка с атрибутами и зависимыми миксами.
- `Inventory` и `Mixes` работают с opt-in pagination и debounce поиска.

### Фактическое рабочее состояние каталога

- После live rebuild текущий Nomad-каталог собран поверх HTReviews-данных.
- В зафиксированном состоянии из полного журнала:
  - `1674` tobacco rows;
  - `1674` rows с `sourceKind='htreviews'`;
  - `14` rows `inStock=true`;
  - `11` mixes;
  - `3` rails.

## Последние значимые блоки

### 5 апреля 2026 — Nomad Master inventory create + mixes/rails form cleanup

- В `Inventory` добавлен create flow для табака:
  - новый backend endpoint `POST /staff/inventory/tobaccos`;
  - inline-форма в `nomad-master-web`;
  - после сохранения новый табак сразу попадает в inventory list и в selector компонентов микса.
- Из формы создания и редактирования микса убраны ручные поля `популярность` и `базовый рейтинг`.
- В `Rails` selector добавления миксов переведён на searchable picker и теперь визуально/поведенчески совпадает с selector'ом табаков в `Mixes`.
- Проверки:
  - `cd apps/nomad-master-web && npm run build`
  - `cd apps/nomad-backend && npm test`
  - `cd apps/nomad-backend && npm run build`

### 3 апреля 2026 — Nomad Aroma guest contract sync

- `nomad-aroma-web` переведён на backend-семантику `Покурить`: `smoke-cta` больше не уходит на простое открытие карточки микса.
- Событие отправляется только по явному CTA внутри модалки, а успешный выбор закрепляется в верхней панели `Карточка для мастера`.
- Гостевой каталог теперь перечитывается через backend `GET /guest/catalog/mixes` с активными `profiles` и `flavors`, чтобы onboarding и каталог не расходились с guest API.

### 3 апреля 2026 — Nomad Master UX cleanup

- Компактные multi-select фильтры для `Inventory` и `Mixes`.
- Отдельный экран создания микса.
- Проверки в полном журнале: `npm test`, `npm run build`, `git diff --check`, targeted browser pass.

### 3 апреля 2026 — Nomad Master shell redesign

- Весь shell `nomad-master-web` переведён в premium editorial backoffice direction для роли `nomad`.
- Левый operator rail убран; вместо него используется compact верхняя навигация для широких таблиц `Inventory` и `Mixes`.
- Дублирование активной секции убрано: topbar больше не повторяет title текущего модуля.
- Edit-flow миксов переведён из бокового sticky editor в отдельный workspace-screen.
- Dashboard summary и breakdown panels переведены в тёмный copper-black visual system без светлых карточек.
- Проверка: `cd apps/nomad-master-web && npm run build`

### 3 апреля 2026 — HTReviews live catalog и enrichment

- Live sync в текущую БД, затем controlled rebuild каталога.
- Detail backfill подтянул strength, taste tags и derived taxonomy.
- Добавлены safe operational scripts:
  - `import:htreviews:preview`
  - `sync:htreviews`
  - `rebuild:live-catalog`
  - `backfill:htreviews:details`

### 3 апреля 2026 — Staff inventory usability

- Tobacco popup-card в `Nomad Master`.
- Pagination + debounce для `Inventory` и `Mixes`.
- Контракты backend/frontend синхронизированы под paginated staff lists.

## Архив

- Полная прежняя история `NOTES.md`: `docs/artifacts/archive/2026-04-03-NOTES-full.md`
- Полная прежняя история `HANDOFF.md`: `docs/artifacts/archive/2026-04-03-HANDOFF-full.md`
