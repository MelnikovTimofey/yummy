# HANDOFF — Yummy

## 2.24) Nomad Master (5 апреля 2026) — editable tobacco editor с choose-or-create полями

- Запрос:
  - для создания табака дать возможность не только ввести новые значения, но и выбрать существующие для `производителя`, `линейки`, `вкусов`, `страны`, `категорий`, `мета-тегов`;
  - ограничить `статус производства` текущими значениями;
  - добавить редактирование уже созданного табака.

- Реализация:
  - backend:
    - `PATCH /staff/inventory/tobaccos/:id` расширен до полного update табачной карточки, а не только toggle `inStock`;
    - добавлена проверка дубликата по `manufacturer + lineName + name`;
    - inventory tests расширены сценарием create + edit;
  - frontend:
    - `Inventory` переведён с create-only формы на единый create/edit editor;
    - edit доступен из таблицы и из popup-карточки табака;
    - `производитель`, `линейка`, `страна` работают как `input + suggestions` по текущему inventory catalog;
    - `категории`, `вкусы`, `мета-теги` переведены на choose-or-create token editor с текущими подсказками и возможностью добавить новое значение;
    - `статус производства` переведён в select только по существующим значениям каталога;
  - docs:
    - обновлены `NOTES.md`, `HANDOFF.md`, `apps/nomad-master-web/README.md`.

- Проверки:
  - `cd apps/nomad-master-web && npm run build`
  - `cd apps/nomad-backend && npm test`
  - `cd apps/nomad-backend && npm run build`

- Остаточный риск:
  - single-value поля (`производитель`, `линейка`, `страна`) используют native `datalist`, поэтому UX выбора зависит от браузера и менее управляем, чем у custom searchable select;
  - `статус производства` нельзя ввести вручную, пока в каталоге не появится первое значение этого статуса через backend/import.

- Эффект:
  - staff может и заводить, и корректировать tobacco-карточки прямо в `Мастере`;
  - справочные значения переиспользуются без ручного копипаста;
  - inventory editor остаётся bounded внутри одного operational surface, без отдельного экрана и без нового list API.

## 2.23) Nomad Backend (5 апреля 2026) — HTReviews paginated brand discovery fix

- Запрос:
  - проверить качество HTReviews выгрузки;
  - закрыть кейс, где бренд `Overdose` есть на источнике, но отсутствует в текущем global import Nomad.

- Реализация:
  - в `apps/nomad-backend/src/integrations/htreviews/client.ts` добавлен JSON fetch path для публичных HTReviews list endpoints;
  - в `apps/nomad-backend/src/integrations/htreviews/catalog.ts` global discovery брендов дополнен paginated запросами к `getData?action=brands` для режимов `position` и `others`;
  - initial HTML discovery сохранён, но больше не является единственным источником списка брендов;
  - добавлен regression test, который подтверждает импорт бренда, доступного только через paginated discovery.

- Проверки:
  - `cd apps/nomad-backend && npm test`
  - `cd apps/nomad-backend && npm run build`

- Остаточный риск:
  - live rebuild каталога после фикса отдельно не запускался, поэтому зафиксированные historical counts в notes/handoff пока относятся к последнему pre-fix rebuild;
  - интеграция всё ещё зависит от публичной структуры HTReviews `getData`; если сайт сменит payload или query semantics, discovery потребует повторной адаптации.

- Эффект:
  - global preview/sync больше не должны обрезаться примерно первыми `20 + 20` брендами из `/tobaccos/brands`;
  - бренды вроде `Overdose` становятся достижимыми без ручного `HTREVIEWS_BRAND_URLS`.

## 2.22) Nomad Master (5 апреля 2026) — создание табака, cleanup формы микса и unified rail selector

- Запрос:
  - добавить создание табака из `Inventory`;
  - убрать ручное заполнение `популярности` и `базового рейтинга` в форме микса;
  - сделать selector миксов в `Rails` таким же searchable, как selector табаков в `Mixes`.

- Реализация:
  - backend:
    - добавлен `POST /staff/inventory/tobaccos`;
    - в state-layer добавлен create flow для `NomadTobacco` с валидацией обязательных полей и возвратом staff inventory view;
    - добавлен integration test на создание табака;
  - frontend:
    - в `Inventory` добавлены кнопка `Новый табак` и inline-форма с сохранением;
    - после create новый табак сразу синхронизируется в inventory list, dashboard-зависимостях и selector'ах редактора миксов;
    - из формы микса удалены поля `Популярность` и `Базовый рейтинг`;
    - selector добавления микса в rail переведён на тот же reusable searchable picker, что и selector табака в компоненте микса;
  - docs:
    - обновлены `NOTES.md`, `HANDOFF.md`, `apps/nomad-master-web/README.md`.

- Проверки:
  - `cd apps/nomad-master-web && npm run build`
  - `cd apps/nomad-backend && npm test`
  - `cd apps/nomad-backend && npm run build`

- Остаточный риск:
  - create flow табака пока не редактирует уже созданную tobacco-карточку; доступно только создание и переключение `in stock`;
  - taxonomy в create-форме вводится строками через запятую, поэтому для новых `flavorProfiles` нужен аккуратный ручной ввод ключей.

- Эффект:
  - staff может заводить новый табак без выхода из `Мастера`;
  - mix form больше не просит руками вводить аналитические метрики;
  - rails/mixes получили единый searchable selection pattern.

## 2.21) Docs (3 апреля 2026) — сократить `NOTES.md` и `HANDOFF.md`, полную историю вынести в архив

- Запрос:
  - сократить разросшиеся артефактные файлы;
  - сохранить полный журнал без потери информации.

- Реализация:
  - созданы archive snapshot'ы:
    - `docs/artifacts/archive/2026-04-03-NOTES-full.md`
    - `docs/artifacts/archive/2026-04-03-HANDOFF-full.md`
  - основные `NOTES.md` и `HANDOFF.md` переписаны в компактный rolling-формат;
  - в основных файлах оставлен:
    - актуальный operational context;
    - краткий срез последних значимых блоков;
    - ссылки на полный архив.

- Проверки:
  - `wc -l docs/artifacts/archive/2026-04-03-NOTES-full.md docs/artifacts/archive/2026-04-03-HANDOFF-full.md`
  - `git diff --check`

- Остаточный риск:
  - старые записи теперь нужно искать через archive snapshot, а не в корневом артефакте;
  - если позже понадобится machine-parsed полный changelog из корневых файлов, текущий compact format придётся учесть отдельно.

- Эффект:
  - рабочие артефакты снова короткие и читаемые;
  - полная история сохранена без удаления.

## Активный срез на 3 апреля 2026

### Nomad Master

- `Inventory` теперь поддерживает и создание, и редактирование табака через единый editor surface.
- `Производитель`, `Линейка`, `Страна`, `Категории`, `Вкусы` и `Мета-теги` в tobacco editor работают как choose-or-create поля поверх текущего каталога.
- `Статус производства` в tobacco editor ограничен уже существующими значениями.
- В `Inventory` добавлен create flow для нового табака с сохранением через backend.
- В `Mixes` убраны ручные поля `популярность` и `базовый рейтинг`.
- В `Rails` selector добавления миксов переведён на тот же searchable picker pattern, что и selector табаков в `Mixes`.
- `Inventory` и `Mixes` переведены на компактные searchable multi-select фильтры вместо длинных облаков тегов.
- Создание и редактирование микса вынесены в отдельные экраны; каталог снова работает во всю ширину без бокового sticky editor.
- Последний visual pass перевёл shell в новый premium editorial backoffice direction:
  - compact верхний nav вместо левого rail, потому что `Inventory` и `Mixes` содержат широкие таблицы;
  - topbar больше не дублирует active section, а stage header отвечает за текущий модуль;
  - dashboard surfaces затемнены и приведены к общему copper-black baseline;
  - тёмный copper-black visual system и плотный status-first topbar сохранены.

Проверенный контур:
- `cd apps/nomad-master-web && npm test`
- `cd apps/nomad-master-web && npm run build`
- targeted browser pass через `Playwright`

Остаточный риск:
- `Master` всё ещё desktop-first; отдельный mobile/tablet sign-off не был целью последних pass'ов.
- Не было отдельного browser-based visual smoke по длинной реальной таблице и full edit-flow микса после перевода navigation наверх; сейчас есть только `npm run build`.

### Aroma guest contract sync

- `nomad-aroma-web` теперь отправляет `POST /guest/events/smoke-cta` только по явному действию `Покурить`, а не при простом открытии карточки.
- Верхняя закреплённая панель переименована в `Карточка для мастера`, чтобы guest-flow был согласован с текущей backend-семантикой CTA.
- Гостевой каталог перечитывается с backend-фильтрами `profiles` и `flavors`; это удерживает каталог синхронным с онбордингом и текущим guest API.

Проверенный контур:
- `cd apps/nomad-aroma-web && npm run build`

Остаточный риск:
- для полного smoke-pass ещё полезно руками подтвердить сценарий: онбординг -> `Покурить` -> повторное открытие карточки -> переход в каталог с активными вкусовыми фильтрами.

### HTReviews / Nomad Backend

- Добавлен изолированный integration foundation для `https://htreviews.org`.
- Подняты operational scripts:
  - `npm run import:htreviews:preview`
  - `npm run sync:htreviews`
  - `npm run rebuild:live-catalog`
  - `npm run backfill:htreviews:details`
- `NomadTobacco` расширен source metadata, line-level identity и табачными атрибутами.
- Global HTReviews discovery теперь дополняется paginated brand list через публичный `getData?action=brands`, чтобы не терять бренды вне первого HTML-среза `/tobaccos/brands`.
- Backend tests переведены в отдельную Prisma schema `nomad_test`.
- `resetNomadState()` запрещён вне test-mode без явного opt-in.

Фактический live-state из последнего полного журнала:
- `1674` tobacco rows total
- `1674` rows с `sourceKind='htreviews'`
- `14` rows `inStock=true`
- `11` mixes
- `3` rails

Проверенный контур:
- `cd apps/nomad-backend && npm test`
- `cd apps/nomad-backend && npm run build`
- targeted live scripts против `public` schema по отдельным handoff block'ам

Остаточный риск:
- live catalog сейчас зависит от rule-based rebuild overrides;
- для richer taxonomy или более глубокого enrichment нужен отдельный controlled slice, а не быстрый operational rerun.

### Staff inventory / mixes

- `Inventory` теперь показывает strength, country, production status и description.
- По клику на табак открывается popup-карточка с атрибутами и зависимыми миксами.
- `Inventory` и `Mixes` получили opt-in pagination и debounce поиска.

Проверенный контур:
- `cd apps/nomad-master-web && npm test`
- `cd apps/nomad-master-web && npm run build`
- `cd apps/nomad-backend && npm test`

Остаточный риск:
- после pagination стоит при следующем smoke-pass руками подтвердить page switching и поведение после batch/update действий.

## Архив полной истории

- Полный старый `NOTES.md`: `docs/artifacts/archive/2026-04-03-NOTES-full.md`
- Полный старый `HANDOFF.md`: `docs/artifacts/archive/2026-04-03-HANDOFF-full.md`
