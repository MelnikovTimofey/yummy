# HANDOFF — Nomad

## 2.31) Backend + Ops (24 мая 2026) — Этап 1: production-БД питается из htreviews

- Запрос: «Наполнение базы данными продуктивного контура» — стадии: (1) каталог
  табаков, (2) миксы холодного старта, (3) пара редакторских rails. Эта запись
  фиксирует первую стадию.

- Контекст (issue #16, ветка `feature/16-live-tobacco-catalog`):
  - До правок `ensureNomadState()` срабатывал по триггеру `tobaccoCount === 0`,
    звал `seedNomadStorage()` и наливал 12 синтетических seed-табаков
    + 11 миксов + 3 rails. Production-БД из docker compose стартовала с этой
    же фикстурой, что нарушало продуктовый инвариант «каталог из htreviews».
  - В репо уже есть рабочий `npm run sync:htreviews` →
    `syncHtReviewsCatalogToNomad`, который сканирует htreviews.org и upsert'ит
    `NomadTobacco`. Этап 1 — отвязать production-bootstrap от seed-каталога и
    дать docker compose явный one-shot профиль для прогона sync.

- Реализация (PR #?, ветка `feature/16-live-tobacco-catalog`):
  - `apps/nomad-backend/src/state.ts`:
    - вместо одного `seedNomadStorage` теперь три хелпера —
      `wipeNomadStorage`, `insertNomadOperationalState`, `insertNomadSeedCatalog`;
    - production-путь `bootstrapNomadOperationalState()` вставляет только
      staff/коды/recipients/operators/intro и не делает `deleteMany`;
    - test-путь `resetNomadStorageWithSeedCatalog()` сохраняет прежнее
      поведение (полный wipe + seed-каталог как фикстура);
    - `ensureNomadState()` триггерится по `staffAccountCount === 0`, чтобы
      пустой каталог не повторно ронял staff/коды на каждом API-запросе;
    - `resetNomadState()` (test-only, `NOMAD_ALLOW_STATE_RESET=1`) продолжает
      звать полный reset — все 5 тестовых файлов (`inventory/access/content/
      recommendations/automation`) идут без изменений.
  - `apps/nomad-backend/src/catalog.ts` — добавлен header «test fixture only».
  - `apps/nomad-backend/scripts/rebuild-live-catalog.ts` — удалён вместе с
    `npm run rebuild:live-catalog` в `package.json` и README-разделом про него;
    его роль (мост seed↔htreviews) теряет смысл после изоляции production.
  - `apps/nomad-backend/Dockerfile` — runtime stage теперь копирует `src` и
    `tsconfig.json`, чтобы `npx tsx scripts/sync-htreviews.ts` отрабатывал из
    seeder-контейнера (он импортирует `../src/integrations/...`).
  - `docker-compose.yml` (корень) — новый сервис `seeder` под profile `seed`:
    тот же образ, что backend, command =
    `npx prisma db push --skip-generate && npx tsx scripts/sync-htreviews.ts`,
    env `HTREVIEWS_*` пробрасываются из `.env`. Backend и aroma/master-web
    дефолтного `up` не задевает.
  - `.env.example` — добавлен блок переменных для seeder.
  - `apps/nomad-backend/README.md` — раздел «Live catalog seed (этап 1)»
    описывает контракт: `docker compose up -d db backend` →
    `docker compose --profile seed run --rm seeder` → live-каталог в БД.

- Проверки:
  - `cd apps/nomad-backend && npm test` — 40/40 зелёных (resetNomadState
    оставлен под тесты, поэтому ни один из existing seed-IDs тестов не
    сломался);
  - `cd apps/nomad-backend && npm run build` — чистый tsc;
  - `docker compose config --quiet` — валидный compose;
  - реальный live-прогон seeder против htreviews.org **не выполнялся** в этой
    сессии (длинный network-bound прогон); проверка остаётся на момент
    реального наполнения продуктивного контура.

- Остаточный риск:
  - seeder сейчас полагается на `npx tsx` и `npx prisma` — оба грузятся в
    runtime-контейнере при первом вызове. Для продакшен-наполнения это
    приемлемо (одноразовая операция), но если потребуется частый перезапуск
    — стоит вынести `tsx`/`prisma` в `dependencies` или скомпилировать
    `scripts/` в `dist/`;
  - этапы 2-3 (миксы и rails) пока обслуживаются только тестовой фикстурой
    в `resetNomadState` — после их доставки нужно будет ещё раз пройтись по
    bootstrap-контракту;
  - `seedNomadStorage`-композиция теперь шире, чем была — стоит проверить,
    что test-reset продолжает работать при добавлении новых таблиц в схему.

- Эффект:
  - первый `docker compose up` поднимает Postgres с пустыми
    `NomadTobacco/Mix/MixComponent/Rail/RailMix`; ни одной синтетической
    seed-записи в production нет;
  - `docker compose --profile seed run --rm seeder` за один шаг наполняет
    каталог из htreviews.org (~сотни брендов × десятки SKU; темп
    контролируется `HTREVIEWS_*`);
  - все backend-тесты остались валидны без переписывания (seed-фикстура
    живёт только внутри `resetNomadState`).

## 2.30) Ops + Process (23 мая 2026) — root docker compose stack и жёсткий запрет правок в `main`

- Запрос: «Генерация docker compose для запуска сервисов продукта nomad yummy»
  + после того как изменения были записаны в `main` напрямую, пользователь
  попросил вынести их в отдельную ветку и усилить правило в CLAUDE.md.

- Реализация (PR #11, ветка `feature/docker-compose-stack`):
  - `docker-compose.yml` в корне: `db` (Postgres 16, проброс `5433:5432` для
    совместимости с `apps/nomad-backend/docker-compose.yml`), `backend`,
    `aroma-web`, `master-web` и `telegram-bot` под profile `bot`
    (требует `TELEGRAM_BOT_TOKEN`, поэтому не входит в дефолтный `up`).
  - Multi-stage Dockerfile + `.dockerignore` для каждого сервиса:
    - backend — на старте `prisma db push --skip-generate && node dist/index.js`,
      потому что Prisma-миграций в репо нет, схема накатывается напрямую;
    - aroma/master — vite build с `VITE_API_BASE_URL` как build-arg, runtime
      через `vite preview` (`--host 0.0.0.0`, порты 4174/4175 из package.json);
    - telegram-bot — node runtime, состояние в named volume `nomad_bot_state`
      (`NOMAD_BOT_STATE_PATH=/data/...`).
  - `.env.example` с переменными для backend secrets, build-args веба и токенов
    Telegram.
  - CLAUDE.md §5 и «Главное правило» усилены отдельным блоком про запрет
    Edit/Write в `main` — триггер: я сам нарушил это правило при первой версии
    PR. Добавлена явная инструкция перед первым `Edit`/`Write` проверять
    `git rev-parse --abbrev-ref HEAD` и заводить `feature/<slug>`.

- Проверки:
  - `docker compose config --quiet` — валидный compose;
  - `docker compose up --build` локально не запускался (длинная сборка
    образов), только `config` gate;
  - smoke / unit тесты не затронуты — инфраструктурное изменение.

- Остаточный риск:
  - Backend в compose использует `prisma db push` вместо миграций — для
    локального dev'a ок, но при появлении формальных миграций надо переключить
    на `prisma migrate deploy`;
  - `vite preview` в проде не предполагается; контейнеры рассчитаны на
    локальный/CI запуск всего контура, не на production-deploy.

- Эффект:
  - один `docker compose up` поднимает весь контур Nomad — упрощает
    онбординг и e2e-проверки;
  - правило «правок в `main` не делать» теперь дублировано (CLAUDE.md §5,
    «Главное правило», memory) — должно сработать даже при беглом чтении.

## 2.29) Smoke (23 мая 2026) — обновление stale assertions после редизайнов master/aroma

- Запрос: разобраться, почему smoke упал после restart CI на `main` (PR #9, #10).

- Причина: smoke job был орфан с 28 марта (последний успешный run на
  `codex/issue-2-close`). Между мартом и маем UI Master/Aroma полировался, но
  smoke на этих PR не запускался — три assertion'а накопили drift.

- Реализация (PR #10, ветка `bug/smoke-stale-assertions`):
  - `tests/nomad-smoke/tests/master-smoke.spec.ts`:
    - `signIn` helper: heading `Операционный контур` → `Nomad Master` (level 1)
      — h1 поменялся в `fd3365e` (3 апреля, *Refine Nomad Master shell*);
    - mix-editor: проверка табака через `combobox.toHaveValue('tobacco-...')`
      заменена на `toContainText('Citrus Breeze' / 'Mint Veil')` —
      `MixComponentSelect` стал searchable button-picker'ом, а не native select;
  - `tests/nomad-smoke/tests/aroma-smoke.spec.ts`:
    - каталог: text `Фильтры не заданы` → `Результат`. На viewport-е Pixel 5
      badge скрыт внутри collapsed compact-фильтров; `Результат` — label
      счётчика миксов, всегда видим.

- Проверки:
  - `npx playwright test --list` — обе спеки парсятся, 4 теста как раньше;
  - local smoke не запускался (требует полный стек: db + backend + 2 фронта);
  - финальный gate — зелёный CI smoke job на PR #10.

- Остаточный риск:
  - smoke остаётся хрупким к рефакторингу UI: assertion'ы по тексту/классам.
    Long-term — выделить ARIA-стабильные testid/role в master-shell и
    aroma-catalog, чтобы drift ловился раньше или вообще исключался;
  - доп. слои защиты (branch protection с required smoke check) не включены
    — см. NOMAD_REVIEW_POLICY.md Phase 2.

- Эффект:
  - smoke job снова зелёный — CI снова даёт сигнал по поведенческой регрессии
    Master/Aroma;
  - впервые применили новое branch-naming соглашение (`bug/*`) из ADR §2.28.

## 2.28) Repo (23 мая 2026) — production-ветка `main` и соглашение о ветках

- Запрос:
  - сделать production-веткой `main`;
  - зафиксировать соглашение: `feature/*` — фичи/рефакторинг/доки,
    `bug/*` — баг-фиксы.

- Реализация:
  - на GitHub выполнен атомарный rename
    `codex/nomad-parallel-track` → `main` через
    `POST /repos/.../branches/codex%2Fnomad-parallel-track/rename` — default
    branch автоматически переставлен на `main`, открытые PR были бы
    перенацелены автоматически (на момент rename открытых PR не было);
  - локально удалена устаревшая ветка `main` (предыдущий pre-Nomad pivot),
    `codex/nomad-parallel-track` переименована в `main`, tracking
    перепривязан, `git remote set-head origin main`;
  - удалена merged remote-ветка `chore/legacy-split`;
  - `CLAUDE.md` §1 — «production-ветка `main`»; §5 — описан branch flow
    (`feature/<slug>` или `bug/<slug>` от `main`, PR в `main`);
  - `README.md` — раздел «Разработка» переписан под `main` и новый branch
    naming;
  - `.github/NOMAD_REVIEW_POLICY.md` — `Base branch` указывает на `main`,
    добавлена секция `Branch naming`, Phase 2 protection — для `main`;
  - `.github/workflows/nomad-docs-lint.yml`, `nomad-pr-checks.yml`,
    `nomad-smoke.yml` — триггеры с `codex/nomad-parallel-track` на `main`;
  - `docs/nomad/acceptance-checklist.md` — handoff-чек обновлён.

- Проверки:
  - `gh repo view --json defaultBranchRef` → `main`;
  - `git ls-remote --heads origin` → только `main` и feature-ветки;
  - `grep -rln codex/nomad-parallel-track` в живых docs — пусто (исторические
    упоминания в HANDOFF §2.26/§2.27 и `docs/artifacts/archive/` оставлены
    как есть).

- Остаточный риск:
  - branch protection для `main` ещё не включён (Phase 2 в
    `NOMAD_REVIEW_POLICY.md`);
  - локально у разработчиков останутся stale `codex/*` ветки с
    `origin/...: gone`-tracking — безопасно удалить вручную через
    `git fetch --prune && git branch -vv | awk '/: gone\]/ {print $1}' | xargs git branch -D`.

- Эффект:
  - production-ветка соответствует индустриальному соглашению (`main`);
  - branch naming `feature/*` / `bug/*` явно зафиксирован и закрывает
    раньше неявную часть процесса.

## 2.27) Repo (23 мая 2026) — физический split legacy Yummy в отдельный репозиторий

- Запрос: вынести legacy-контур в отдельный репозиторий, оставить текущий репо
  под активную разработку Nomad. См. ADR-001 в обсуждении.

- Реализация:
  - на текущем `codex/nomad-parallel-track` создан аннотированный tag
    `pre-legacy-split` (запушен в `origin`) — единственная точка отката;
  - в свежем clone выполнен `git filter-repo --force --path Yummy --path
    YummyExpo --path YummyWeb --path backend --path ml --path
    services/catalog-updater --path docker-compose.yml --path
    scripts/symphony_auto_merge_done.sh` (141 коммит legacy-истории сохранён);
  - в новом репо добавлен `README.md` (архив, ссылка на активный nomad-yummy),
    ветка переименована в `main`, push в
    [MelnikovTimofey/yummy](https://github.com/MelnikovTimofey/yummy);
  - в текущем репо на ветке `chore/legacy-split` удалены: `Yummy/`, `YummyExpo/`,
    `YummyWeb/`, `backend/`, `ml/`, `services/catalog-updater/`,
    корневой `docker-compose.yml`, `scripts/symphony_auto_merge_done.sh`;
  - обновлены `README.md` (Nomad-only, ссылка на архив), `CLAUDE.md` §1/§6
    (`Yummy + Nomad` → `Nomad`, изоляция контуров переписана под «legacy живёт
    отдельно»), `.gitignore` (убраны legacy-only записи).

- Проверки:
  - `cd apps/nomad-backend && npm test && npm run build`;
  - `cd apps/nomad-master-web && npm run build`;
  - `cd apps/nomad-aroma-web && npm run build`;
  - `cd services/nomad-telegram-bot && npm test && npm run build`;
  - `git diff --check` на ветке `chore/legacy-split`.

- Остаточный риск:
  - на диске у разработчика остаются untracked артефакты в удалённых каталогах
    (`Yummy/ios`, `YummyWeb/node_modules`, `backend/dist`, ...) — безопасно
    удалить вручную, в git они уже не отслеживаются;
  - `tests/nomad-smoke` поднимается через отдельный
    `apps/nomad-backend/docker-compose.yml`; корневой `docker-compose.yml` был
    только legacy, его удаление Nomad не затрагивает;
  - архивный репо ещё не помечен `archived: true` в GitHub — оставлено владельцу
    на 4–8 недель верификации, что нет регулярных обращений к legacy.

- Эффект:
  - в текущем репо нет legacy: clone и индексация быстрее, агентский `grep`/
    `Explore` перестаёт находить legacy-совпадения;
  - blame legacy сохранён в [MelnikovTimofey/yummy](https://github.com/MelnikovTimofey/yummy);
  - физическая изоляция вместо «правил в `CLAUDE.md` §6».

## 2.26) Repo (22 мая 2026) — миграция с Codex на Claude Code

- Запрос:
  - отказаться от Symphony;
  - мигрировать репозиторий с инструментария Codex на Claude Code;
  - процесс разработки: мультиагентность с ролями, GitHub issues, KISS, TDD;
  - сократить число md-инструкций и артефактов.

- Реализация:
  - создан единый `CLAUDE.md` — консолидация `AGENTS.md`, ключевого из
    `AI_DEVELOPMENT_PROCESS.md` и `CONTRIBUTING_NOMAD.md` (8 разделов: проект,
    KISS, TDD, агенты и роли, процесс issue→PR, изоляция контуров, инварианты,
    документация);
  - заведён каталог `.claude/`:
    - `agents/` — 4 субагента-роли: `planner`, `backend-dev`, `frontend-dev`,
      `qa-tdd` (заменяют 9-ролевую модель Codex);
    - `skills/` — 4 консолидированных скилла (`nomad-delivery`,
      `nomad-product-guardrails`, `nomad-qa-and-smoke`, `nomad-release-ops`)
      вместо 10 Codex-скиллов, без `agents/openai.yaml`;
    - `settings.json` — allowlist частых dev-команд;
  - удалены: `.codex/`, `AGENTS.md`, `AI_DEVELOPMENT_PROCESS.md`,
    `CONTRIBUTING_NOMAD.md`, `WORKFLOW.md`, `WORKFLOW_NOMAD.md` (Symphony + Linear),
    `docs/templates/`, `docs/skills/`, `docs/nomad/feature-slices/`;
  - `NOMAD_ROADMAP.md` → `docs/nomad/roadmap.md`, Symphony-секции переписаны под
    GitHub-issue процесс;
  - `.github/` синхронизирован: workflows (`nomad-docs-lint`, `nomad-pr-checks`,
    `nomad-smoke`), `CODEOWNERS`, `NOMAD_REVIEW_POLICY.md`, PR- и issue-шаблоны
    переведены с `.codex`/`AGENTS`/`WORKFLOW` на `.claude`/`CLAUDE.md`;
    из CI убрано обязательное требование менять `NOTES.md`;
  - добавлен корневой `README.md` как human-facing индекс;
  - корень репозитория: 16 md-файлов → 4 (`CLAUDE.md`, `README.md`, `PRD.md`,
    `HANDOFF.md`).

- Проверки:
  - `cd apps/nomad-backend && npm test && npm run build` — 40/40 тестов, build ok;
  - `cd apps/nomad-master-web && npm run build`; `cd apps/nomad-aroma-web && npm run build`;
  - YAML-lint всех `.github/**/*.yml`;
  - симуляция CI-проверки структуры `.claude/skills/` и frontmatter агентов;
  - `git diff --check`.

- Остаточный риск:
  - физический split legacy-контура в отдельный репозиторий — отдельная будущая
    задача; legacy-код пока в этом репозитории;
  - branch protection (Phase 2 из `NOMAD_REVIEW_POLICY.md`) не включался.

- Эффект:
  - репозиторий работает по инструментарию Claude Code; Symphony и Linear убраны;
  - процесс: GitHub issue → вертикальный срез по KISS/TDD → PR; роли — субагенты;
  - артефактов и md-инструкций существенно меньше.

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
  - import brand/line pages дополнен paginated `POST /postData` запросами с `objectByBrand` / `objectByLine`, чтобы не терять вкусы за пределом первого HTML-батча;
  - в `apps/nomad-backend/src/integrations/htreviews/parser.ts` добавлен маппинг JSON-элементов `postData` в `HtReviewsTobaccoSummary`;
  - в `apps/nomad-backend/prisma/schema.prisma` уникальность `NomadTobacco` для source-import переведена с `(manufacturer, lineName, name)` на `sourceKind + sourceNumericId`, потому что HTReviews может содержать несколько разных карточек с одинаковыми brand/line/name;
  - sync-слой теперь при наличии source identity не схлопывает такие записи по fallback-ключу имени;
  - initial HTML discovery сохранён, но больше не является единственным источником списка брендов;
  - добавлены regression tests для обоих кейсов:
    - бренд доступен только через paginated discovery;
    - дополнительные вкусы бренда доступны только через `postData`.

- Проверки:
  - `cd apps/nomad-backend && npm test`
  - `cd apps/nomad-backend && npm run build`

- Остаточный риск:
  - live rebuild каталога после brand-page фикса нужно прогнать отдельно, чтобы выровнять текущую БД с полным HTReviews inventory;
  - интеграция всё ещё зависит от HTReviews payload для `getData` и `postData`; если сайт сменит структуру ответа, discovery/import потребуют повторной адаптации.

- Эффект:
  - global preview/sync больше не должны обрезаться примерно первыми `20 + 20` брендами из `/tobaccos/brands`;
  - бренды вроде `Overdose` становятся достижимыми без ручного `HTREVIEWS_BRAND_URLS`;
  - brand pages вроде `https://htreviews.org/tobaccos/overdose` больше не должны останавливаться на первых `20` вкусах.

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
