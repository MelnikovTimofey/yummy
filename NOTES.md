Обновление от 28 марта 2026 (nomad master: start slice 3 mix catalog and component editor):
- Проблема:
  - `Nomad Master` всё ещё держал миксы на примитивном CRUD: staff редактировал `componentIds` строкой, не видел rail membership и не мог работать с каталогом как с table-first операционным экраном;
  - backend уже хранил `proportion/sortOrder`, но staff contract не поднимал их наружу и не валидировал сумму долей;
  - mix filters по доступности и участию в рейлах отсутствовали, а inventory/rails обновления могли оставлять mix UI на устаревшем состоянии.
- Изменение:
  - `apps/nomad-backend/src/state.ts`, `apps/nomad-backend/src/app.ts`, `apps/nomad-backend/src/types.ts`, `apps/nomad-backend/src/content.test.ts`:
    - `GET /staff/mixes` расширен до list response с `filters`, `sort`, `meta`, `railMemberships`, `railCount`, `activeRailCount`;
    - create/update по миксам теперь принимают `components[]` с `tobaccoId`, `proportion`, `sortOrder`, при этом старый `componentIds` оставлен как fallback для безопасной совместимости;
    - добавлена строгая валидация суммы долей до `100%` и нормализация равного распределения без остатка `99%`;
    - исправлен общий helper фильтрации по selected values, чтобы server-side filters работали корректно и для inventory, и для mixes.
  - `apps/nomad-master-web/src/contracts.ts`, `apps/nomad-master-web/src/contracts.test.ts`:
    - добавлены типы и parser'ы для нового mix list contract;
    - добавлены query builder и filter toggle helpers для `Slice 3`.
  - `apps/nomad-master-web/src/components/mixes/mix-catalog-view.tsx`, `apps/nomad-master-web/src/App.tsx`, `apps/nomad-master-web/src/styles.css`:
    - mix catalog переведён в table-first экран с filters bar, server-driven sort и rail membership summary;
    - editor компонентов получил catalog-backed select, percent inputs, reorder, rebalance и явный total state;
    - после rail update UI перезагружает и `mixes`, а editor берёт полный список табаков из inventory catalog, а не из случайного текстового поля.
  - docs sync:
    - `apps/nomad-master-web/README.md`
    - `docs/nomad/feature-slices/README.md`
- Проверки:
  - `cd apps/nomad-backend && npm test`
  - `cd apps/nomad-backend && npm run build`
  - `cd apps/nomad-master-web && npm test`
  - `cd apps/nomad-master-web && npm run build`
- Эффект:
  - `Slice 3` перешёл из backlog в реальную поставку по contract и UI;
  - staff получил usable mix operations surface вместо string-based CRUD;
  - следующий безопасный шаг: browser/manual smoke для нового mix flow и затем переход к `Slice 4` по rail manager hardening.

Обновление от 28 марта 2026 (nomad master: start slice 2 inventory hardening with table-first ops):
- Проблема:
  - `Slice 2` по inventory operations оставался только backlog-планом, а сам интерфейс был card-first и непригоден для ежедневной операционной работы;
  - backend не умел server-side filters/sort и batch stock mutations, а staff не видел, какие миксы зависят от конкретного табака;
  - после inventory toggle frontend не синхронизировал связанный `mixes` state.
- Изменение:
  - `apps/nomad-backend/src/state.ts`, `apps/nomad-backend/src/app.ts`, `apps/nomad-backend/src/types.ts`, `apps/nomad-backend/src/inventory.test.ts`, `apps/nomad-backend/src/recommendations.ts`, `apps/nomad-backend/src/catalog.ts`:
    - inventory list contract расширен до `filters + sort + meta + dependentMixes`;
    - добавлен `POST /staff/inventory/tobaccos/batch` для `set-in-stock / set-out-of-stock`;
    - audit trail теперь покрывает batch inventory updates по каждой затронутой позиции;
    - `archive` остаётся explicit stop-signal до отдельного product-approved contract.
  - `apps/nomad-master-web/src/contracts.ts`, `apps/nomad-master-web/src/contracts.test.ts`:
    - добавлены inventory parsers, query builder и helper-утилиты для нового contract.
  - `apps/nomad-master-web/src/components/inventory/inventory-view.tsx`, `apps/nomad-master-web/src/App.tsx`, `apps/nomad-master-web/src/styles.css`:
    - inventory UI вынесен в отдельный component;
    - добавлены table-first layout, filter groups, bulk toolbar и quick path в dependent mixes;
    - после inventory mutation перезагружаются и `dashboard`, и `mixes`.
  - docs sync:
    - `docs/nomad/feature-slices/README.md`
    - `apps/nomad-master-web/README.md`
    - `Slice 2` отмечен как `in progress`, а не `done`, потому что `archive/delete` ещё ждёт human review.
- Проверки:
  - `cd apps/nomad-backend && npm test`
  - `cd apps/nomad-backend && npm run build`
  - `cd apps/nomad-master-web && npm test`
  - `cd apps/nomad-master-web && npm run build`
- Эффект:
  - `Nomad Master` получил usable inventory surface вместо MVP-карточек;
  - staff теперь видит dependent mixes и может массово менять наличие;
  - нерешённым остаётся только policy по `archive/delete`, а не базовая inventory usability.

Обновление от 28 марта 2026 (nomad master: complete slice 1 dashboard redesign under shadcn baseline):
- Проблема:
  - формально `Slice 1` уже считался завершённым по analytics contract, но сам dashboard ещё не был переделан по новым соглашениям;
  - `nomad-master-web` не использовал `shadcn/ui`, а дашборд оставался локальным монолитным экраном на старом card/grid слое;
  - backlog требовал выполнения slices по порядку, а значит следующим реальным шагом был не `Slice 2`, а закрытие visual/UI части `Slice 1`.
- Изменение:
  - `apps/nomad-master-web/package.json`, `package-lock.json`, `components.json`, `tsconfig.json`, `vite.config.ts`, `src/styles.css`:
    - добавлен `shadcn/ui` foundation для Vite-проекта;
    - подключены Tailwind v4, alias `@/*`, базовые design tokens и generated primitives.
  - добавлены UI-примитивы:
    - `apps/nomad-master-web/src/components/ui/button.tsx`
    - `apps/nomad-master-web/src/components/ui/card.tsx`
    - `apps/nomad-master-web/src/components/ui/badge.tsx`
    - `apps/nomad-master-web/src/components/ui/separator.tsx`
    - `apps/nomad-master-web/src/lib/utils.ts`
  - добавлен `apps/nomad-master-web/src/components/dashboard/dashboard-view.tsx`:
    - новый dashboard screen на `shadcn/ui` с premium HoReCa visual direction;
    - hero-блок, window toggles, action routing, inventory atlas, product analytics и ops watchlist.
  - `apps/nomad-master-web/src/App.tsx`:
    - старый dashboard markup заменён на новый `DashboardView`;
    - верхний summary strip тоже переведён на новый visual layer.
  - backlog/docs:
    - `docs/nomad/master-production-redesign.md`, `docs/nomad/feature-slices/README.md`, `apps/nomad-master-web/README.md` синхронизированы так, что `Slice 1` теперь действительно закрыт, а следующий незакрытый шаг — `Slice 2`.
- Проверки:
  - `cd apps/nomad-master-web && npm test`
  - `cd apps/nomad-master-web && npm run build`
  - `git diff --check`
- Эффект:
  - `Slice 1` больше не является только contract slice; теперь у него есть и production-ready visual layer;
  - следующий шаг по порядку действительно стал `Slice 2`, а не исправление старого долга по dashboard redesign.

Обновление от 28 марта 2026 (nomad master: formalize all redesign slices through nomad-feature issue shape):
- Проблема:
  - `Nomad Master production redesign` уже был разложен на `Slice 0-6` в одном markdown-документе, но сами slices ещё не существовали как отдельные issue-shaped артефакты;
  - из-за этого backlog было неудобно переносить в GitHub, назначать по одному bounded context и проверять на полноту полей `Constraints`, `Design / UX baseline`, `References`, `Checks`;
  - baseline flow уже был переведён на `nomad-feature.yml`, но весь пакет `Nomad Master` ещё не был оформлен в этом формате.
- Изменение:
  - добавлен каталог `docs/nomad/feature-slices/` как локальный backlog для issue body mirrors;
  - созданы отдельные markdown-документы для `Slice 0-6`, повторяющие поля `.github/ISSUE_TEMPLATE/nomad-feature.yml`:
    - `Primary scope`
    - `Problem`
    - `Success criteria`
    - `Active scope`
    - `Out of scope`
    - `Constraints`
    - `Design / UX baseline`
    - `References`
    - `Checks`
    - `Risk flags`
  - `docs/nomad/master-production-redesign.md`:
    - дополнен ссылкой на локальные issue-shaped mirrors.
- Проверки:
  - review структуры и полноты всех файлов в `docs/nomad/feature-slices/`
  - `git diff --check`
- Эффект:
  - весь backlog `Nomad Master` теперь оформлен по `nomad-feature.yml`, а не только описан как список slices;
  - каждый slice можно перенести в GitHub issue без повторного нормализующего прохода;
  - UI/redesign slices уже несут обязательный baseline по `shadcn/ui` и TIMELESS / TIS.

Обновление от 28 марта 2026 (nomad process: make nomad-feature issue template the default intake path):
- Проблема:
  - формально в репозитории уже были Nomad issue templates, но базовый flow всё ещё допускал старт feature-задач напрямую от локального brief;
  - из-за этого крупные Nomad slices можно было запускать без строгой issue-структуры;
  - для `Nomad Master` UI/redesign задач не был зафиксирован обязательный visual baseline, поэтому интерфейс рисковал скатываться в default Codex-generated стиль.
- Изменение:
  - `.github/ISSUE_TEMPLATE/nomad-feature.yml`:
    - объявлен базовым intake path для Nomad feature slices;
    - добавлены поля `Constraints`, `Design / UX baseline`, `References`, `Checks`;
    - добавлен redesign-specific risk flag для `apps/nomad-master-web`.
  - `CONTRIBUTING_NOMAD.md`, `WORKFLOW_NOMAD.md`, `.github/NOMAD_REVIEW_POLICY.md`:
    - синхронизированы с правилом, что feature slices по умолчанию начинаются с `nomad-feature.yml`;
    - локальный `ai-task-brief` оставлен только как fallback;
    - для `Nomad Master` UI slices зафиксированы обязательные visual inputs.
  - `docs/nomad/master-production-redesign.md`:
    - добавлен visual baseline: `shadcn/ui` где уместно и TIMELESS / TIS как benchmark.
- Проверки:
  - `ruby -e 'require \"yaml\"; YAML.load_file(\"/Users/admin/PycharmProjects/yummy/.github/ISSUE_TEMPLATE/nomad-feature.yml\"); puts \"OK\"'`
  - `git diff --check`
- Эффект:
  - Nomad feature work теперь должен стартовать от issue template, а не от свободного текста;
  - `Nomad Master` redesign получил формальный visual baseline для следующих slices.

Обновление от 28 марта 2026 (nomad master: implement slice 1 dashboard analytics contract):
- Проблема:
  - после фиксации `master-production-redesign` у `Nomad Master` всё ещё оставался примитивный dashboard:
    - только базовые KPI по inventory и `Покурить`;
    - без окна аналитики;
    - без breakdown по производителям и вкусовым атрибутам;
    - без разведения `product metrics` и `ops metrics`;
    - без сигналов по blocked mixes и health rail-контуров.
- Изменение:
  - `apps/nomad-backend/src/state.ts`, `apps/nomad-backend/src/app.ts`, `apps/nomad-backend/src/types.ts`:
    - `GET /staff/dashboard/summary` расширен до нового nested payload;
    - добавлено окно `7d | 14d | 30d`;
    - добавлены inventory breakdowns, product analytics, rating distribution, daily activity и ops signals;
    - тренд по дням приведён к timezone-stable local day keys.
  - `apps/nomad-backend/src/inventory.test.ts`:
    - обновлены contract tests для нового dashboard summary.
  - `apps/nomad-master-web/src/contracts.ts`, `apps/nomad-master-web/src/contracts.test.ts`:
    - расширен parser `DashboardSummary`;
    - добавлены поддержка dashboard windows и nested dashboard sections.
  - `apps/nomad-master-web/src/App.tsx`, `apps/nomad-master-web/src/styles.css`:
    - dashboard переведён в production-oriented layout;
    - добавлены window toggles, breakdown cards, product/ops blocks и daily trend;
    - summary автоматически перезагружается после inventory/mix/rail мутаций.
  - `apps/nomad-master-web/README.md`:
    - добавлено описание реализованного `Slice 1`.
- Проверки:
  - `cd apps/nomad-backend && npm test`
  - `cd apps/nomad-backend && npm run build`
  - `cd apps/nomad-master-web && npm test`
  - `cd apps/nomad-master-web && npm run build`
- Эффект:
  - `Nomad Master` получил первый production-ready analytics slice;
  - следующий безопасный шаг теперь `Slice 2` по inventory table и bulk operations.

Обновление от 28 марта 2026 (nomad master: fix production redesign contract before broad rewrite):
- Проблема:
  - `Nomad Master` уже покрывает базовые staff/admin сценарии, но остаётся сырым MVP:
    - dashboard даёт только минимальную сводку;
    - inventory, mixes и rails работают как card-first CRUD, а не как production-ready operational tools;
    - access/Telegram flow не совпадает с целевым упрощённым admin-сценарием;
    - frontend и backend уже монолитны настолько, что большой rewrite без contract-first этапа создаст конфликтующие write scopes.
- Изменение:
  - добавлен `docs/nomad/master-production-redesign.md`:
    - зафиксированы текущие ограничения frontend/backend;
    - описан целевой результат по `dashboard`, `inventory`, `mixes`, `rails`, `access`;
    - redesign разложен на `Slice 0-6` с явными human-review checkpoints;
    - определены agent roles, non-overlapping write scopes и verification path.
  - `NOMAD_IMPLEMENTATION_PLAN.md`:
    - добавлена `Master production redesign note` с правилом не запускать параллельную реализацию без slice-level contracts.
  - `NOMAD_ROADMAP.md`:
    - уточнены приоритеты по `Master Operations` и `Analytics And Rails`;
    - добавлена ссылка на новый execution contract.
  - `apps/nomad-master-web/README.md`:
    - текущая стадия переопределена как рабочий MVP, а не завершённый production-hardening.
- Проверки:
  - review markdown-структуры и согласованности с `AGENTS.md`, `AI_DEVELOPMENT_PROCESS.md`, `WORKFLOW_NOMAD.md`
  - `git diff --check`
- Эффект:
  - дальнейшее масштабное преобразование `Nomad Master` теперь можно вести по поэтапному contract-first сценарию;
  - запуск нескольких агентов больше не требует придумывать scope и stop conditions на лету.

Обновление от 28 марта 2026 (skills: add guided Nomad task intake skill):
- Проблема:
  - в репозитории уже существовали `CONTRIBUTING_NOMAD.md` и `docs/templates/ai-task-brief.md`, но не было отдельного repo-specific skill для guided task intake;
  - из-за этого формирование brief по шаблону зависело от ручной дисциплины и не вызывалось как отдельный reusable workflow.
- Изменение:
  - добавлен `.codex/skills/nomad-task-intake`:
    - `SKILL.md` задаёт workflow для кратких intake-вопросов, safe defaults и stop condition на этапе brief formation;
    - `agents/openai.yaml` добавляет UI metadata;
    - `references/intake-checklist.md` фиксирует field order, escalation cases и default checks.
  - `CONTRIBUTING_NOMAD.md`:
    - добавлена явная ссылка на `$nomad-task-intake` как на способ собрать task brief через guided intake.
  - `AI_DEVELOPMENT_PROCESS.md`:
    - `nomad-task-intake` добавлен в минимальный набор repo-скиллов;
    - `AI Lead / Integrator` теперь обязан использовать intake skill вместе с repo guard и docs/handoff discipline.
- Проверки:
  - `rg -n --glob '!.github/workflows/nomad-docs-lint.yml' "TODO|Structuring This Skill|Resources \\(optional\\)" .codex/skills .github docs CONTRIBUTING_NOMAD.md`
  - `git diff --check`
- Эффект:
  - guided task intake теперь существует как отдельный repo-specific workflow;
  - задачу можно формировать через вызов skill, а не только через ручное заполнение markdown template.

Обновление от 28 марта 2026 (nomad: add solo-agent enablement, thin smoke suite, and accessibility review skill):
- Проблема:
  - Nomad governance и repo-specific skills уже существовали, но для одного оператора всё ещё не хватало reproducible local bootstrap, формального task intake, handoff template и репозиторного browser smoke;
  - из-за этого local startup оставался в формате “вспомнить нужные команды”, а UI verification жила в ручных договорённостях и Playwright CLI артефактах вне отдельного Nomad smoke package;
  - accessibility-review для Nomad UI не была оформлена как отдельный reusable skill.
- Изменение:
  - добавлен `CONTRIBUTING_NOMAD.md`:
    - зафиксирован solo-agent operating flow для одного `AI Lead / Integrator`;
    - описаны active Nomad scope, branch policy, canonical local ports, dev credentials и verification baseline.
  - добавлены templates:
    - `docs/templates/ai-task-brief.md`
    - `docs/templates/agent-handoff.md`
  - добавлен `scripts/nomad/bootstrap-local.sh`:
    - ставит зависимости в Nomad-пакетах;
    - поднимает local Postgres;
    - запускает `prisma:generate`, `prisma:dbpush -- --force-reset`, `prisma:seed`;
    - сам подставляет default `DATABASE_URL` для Prisma CLI, чтобы bootstrap не требовал ручного env export.
  - добавлен изолированный smoke package `tests/nomad-smoke/`:
    - `package.json` с `@playwright/test`;
    - `playwright.config.ts`;
    - `tests/aroma-smoke.spec.ts`;
    - `tests/master-smoke.spec.ts`.
  - добавлен workflow `.github/workflows/nomad-smoke.yml`:
    - path-filtered Nomad smoke для PR в `codex/nomad-parallel-track`;
    - локальный stack `backend + aroma + master`;
    - upload artifacts в `output/playwright/nomad-quality`.
  - добавлен skill `.codex/skills/nomad-accessibility-review`:
    - отдельный checklist для focus order, keyboard reachability, contrast, readable copy, form semantics и role-sensitive UI.
  - добавлен `docs/skills/forward-testing.md` с protocol для валидации repo-specific skills на трёх классах задач.
  - синхронизированы process/governance docs:
    - `AI_DEVELOPMENT_PROCESS.md`
    - `WORKFLOW_NOMAD.md`
    - `.github/NOMAD_REVIEW_POLICY.md`
    - `.github/CODEOWNERS`
    - `.github/workflows/nomad-pr-checks.yml`
    - `.github/workflows/nomad-docs-lint.yml`
- Проверки:
  - `git diff --check`
  - `ruby -e 'require "yaml"; Dir[".github/**/*.yml"].sort.each { |file| YAML.load_file(file); puts "OK #{file}" }'`
  - `bash -n scripts/nomad/bootstrap-local.sh`
  - `rg -n --glob '!.github/workflows/nomad-docs-lint.yml' "TODO|Structuring This Skill|Resources \\(optional\\)" .codex/skills .github docs CONTRIBUTING_NOMAD.md`
  - `cd tests/nomad-smoke && npx playwright test --list`
  - `./scripts/nomad/bootstrap-local.sh`
  - `cd tests/nomad-smoke && npm run smoke`
  - `cd apps/nomad-backend && npm test`
  - `cd apps/nomad-backend && npm run build`
  - `cd apps/nomad-master-web && npm test`
  - `cd apps/nomad-master-web && npm run build`
  - `cd apps/nomad-aroma-web && npm run build`
- Эффект:
  - у Nomad появился полноценный solo-agent baseline для одного оператора без ручного поиска startup и handoff-практик;
  - browser smoke теперь живёт в отдельном репозиторном Nomad suite, а не только в ad-hoc CLI smoke;
  - accessibility review и forward-testing skills получили собственный операционный слой.

Обновление от 28 марта 2026 (github: add Nomad-only GitHub governance layer):
- Проблема:
  - в репозитории уже были локальные Nomad workflow и AI process docs, но не было GitHub-layer для Nomad issues, PR review и CI;
  - из-за этого Nomad-задачи не имели формализованных issue templates, PR shape, CODEOWNERS, labels source of truth и Nomad-only Actions;
  - review policy существовала только в repo docs и не была вынесена в `.github/` как отдельный operating слой.
- Изменение:
  - добавлен `.github/` Nomad-first слой:
    - `ISSUE_TEMPLATE/nomad-feature.yml`
    - `ISSUE_TEMPLATE/nomad-bug.yml`
    - `ISSUE_TEMPLATE/nomad-ops.yml`
    - `pull_request_template.md`
    - `CODEOWNERS`
    - `labels.md`
    - `NOMAD_REVIEW_POLICY.md`
  - добавлены GitHub Actions:
    - `.github/workflows/nomad-pr-checks.yml`
      - path-filtered Nomad builds/tests;
      - `nomad-docs-check` для process/workflow PR;
      - auto-labeling по доступным Nomad labels и auto-flag `risk:human-review` для risk paths.
    - `.github/workflows/nomad-docs-lint.yml`
      - проверка YAML syntax;
      - проверка структуры `.codex/skills/*`;
      - запрет placeholder `TODO`;
      - `git diff --check`.
  - `WORKFLOW_NOMAD.md`:
    - добавлена обязательная ссылка на `.github/NOMAD_REVIEW_POLICY.md` для задач по Nomad GitHub governance.
  - `AI_DEVELOPMENT_PROCESS.md`:
    - добавлен раздел `GitHub Governance` с Nomad PR target, templates и policy docs.
- Проверки:
  - `git diff --check`
  - `ruby -e 'require "yaml"; Dir[".github/**/*.yml"].sort.each { |file| YAML.load_file(file); puts "OK #{file}" }'`
  - ручной review `.github/` и workflow conditions
- Эффект:
  - Nomad получил отдельный GitHub operating layer без изменения legacy governance;
  - Nomad PR review и CI теперь можно развивать поэтапно от templates и checks к branch protection;
  - repo docs и GitHub policy перестали жить в разных логических слоях.

Обновление от 28 марта 2026 (skills: add visual review skill for Nomad UI consistency and style):
- Проблема:
  - в repo-specific skill layer уже были delivery и product guard skills, но не было отдельного review skill для визуальной непротиворечивости UI;
  - из-за этого visual polish и style-review оставались размазанными между frontend, QA и общими замечаниями без явного checklist-а.
- Изменение:
  - добавлен `.codex/skills/nomad-ui-visual-review`:
    - `SKILL.md` описывает trigger conditions, review workflow, review axes и reporting rules;
    - `references/visual-checklist.md` фиксирует tone map для `Арома Ателье` и `Мастера`, а также checklist по rhythm, typography, palette, components и states.
  - `AI_DEVELOPMENT_PROCESS.md`:
    - `nomad-ui-visual-review` добавлен в рекомендуемый набор repo-скиллов;
    - для `Design / UX Agent` зафиксирована связка `figma` + `nomad-ui-visual-review`;
    - вопрос по отдельному `nomad-design-to-code` уточнён как отдельное решение поверх этой связки.
- Проверки:
  - `rg -n "TODO|Structuring This Skill|Resources \\(optional\\)" .codex/skills/nomad-ui-visual-review`
  - `git diff --check`
  - ручной review `SKILL.md` и `references/visual-checklist.md`
- Эффект:
  - в репозитории появился отдельный skill для визуального QA и style-consistency review;
  - visual review теперь можно выполнять по явному checklist-у, а не по вкусовым комментариям.

Обновление от 28 марта 2026 (skills: add second repo-specific skill package for Nomad product, frontend, and release ops):
- Проблема:
  - после первого skill bootstrap в репозитории всё ещё не хватало локальных workflows для продуктовых инвариантов Nomad, двух frontend-контуров и release/runtime операций;
  - из-за этого `Арома Ателье`, `Мастер` и ops-задачи всё ещё оставались слишком зависимыми от общего контекста вместо явных repo-specific skills.
- Изменение:
  - добавлен второй пакет skills в `.codex/skills/`:
    - `nomad-product-guardrails`
    - `nomad-aroma-web-delivery`
    - `nomad-master-web-delivery`
    - `nomad-release-ops`
  - для каждого скилла созданы:
    - `SKILL.md` с trigger conditions, workflow, required outputs и stop conditions;
    - `agents/openai.yaml`;
    - reference-файл с invariants, frontend checklist или release checklist.
  - `AI_DEVELOPMENT_PROCESS.md`:
    - bootstrap skill package расширен до product, frontend и ops-слоя;
    - следующим осознанным шагом оставлен вопрос о необходимости отдельного `nomad-design-to-code`.
- Проверки:
  - `rg -n "TODO|Structuring This Skill|Resources \\(optional\\)" .codex/skills`
  - `git diff --check`
  - ручной review структуры и контента второго skill package
- Эффект:
  - Nomad-контур получил локальные repo-specific skills почти для всего полного delivery loop;
  - незакрытым остаётся только вопрос, нужен ли отдельный design-to-code wrapper поверх platform `figma`.

Обновление от 28 марта 2026 (skills: add repo-specific skill skeletons for AI delivery):
- Проблема:
  - operating model уже определял рекомендуемый набор repo-specific skills, но в репозитории ещё не было самих skill skeletons;
  - из-за этого роли `AI Lead`, backend, QA и docs/handoff оставались без локального reusable workflow-слоя.
- Изменение:
  - добавлены skeleton’ы в `.codex/skills/`:
    - `yummy-repo-guard`
    - `nomad-backend-delivery`
    - `nomad-qa-and-smoke`
    - `repo-docs-and-handoff`
  - для каждого скилла созданы:
    - `SKILL.md` c trigger conditions, workflow, required outputs и stop conditions;
    - `agents/openai.yaml` c UI metadata;
    - reference-файл с checklist/matrix для короткого основного skill body.
  - `AI_DEVELOPMENT_PROCESS.md` и `AGENTS.md`:
    - синхронизированы с правилом, что repo-specific skills живут в `.codex/skills/`;
    - стартовый пакет skills отмечен как созданный bootstrap layer.
- Проверки:
  - `rg -n "TODO" .codex/skills`
  - `git diff --check`
  - ручной review структуры `.codex/skills/*`
- Эффект:
  - в репозитории появился первый локальный пакет skills для полного AI delivery loop;
  - следующий этап можно вести уже не от пустых шаблонов, а от согласованных skeleton’ов.

Обновление от 28 марта 2026 (docs: formalize AI development operating model and skill lifecycle):
- Проблема:
  - в репозитории уже были зафиксированы отдельные правила для `Nomad`, `Symphony` и vertical slices, но не было единого source of truth по модели `leader + specialists`;
  - отсутствовал формальный процесс, который определяет роли агентов, contract-first декомпозицию, merge responsibility и lifecycle repo-specific skills;
  - из-за этого multi-agent и skill-инициативы рисковали развиваться ситуативно и по-разному трактоваться в legacy и Nomad контурах.
- Изменение:
  - добавлен `AI_DEVELOPMENT_PROCESS.md`:
    - зафиксированы operating model, роли агентов, контракт запуска подзадачи, delivery loop, merge policy и система скиллов;
    - определён минимальный набор рекомендуемых repo-specific skills для полного цикла разработки.
  - `AGENTS.md`:
    - добавлены обязательные правила для владельца-интегратора, безопасного multi-agent запуска и lifecycle repo-specific skills.
  - `WORKFLOW.md`, `WORKFLOW_NOMAD.md`:
    - оба workflow теперь явно ссылаются на `AI_DEVELOPMENT_PROCESS.md`, если меняется operating model или skill lifecycle.
- Проверки:
  - review markdown-структуры и согласованности правил между `AI_DEVELOPMENT_PROCESS.md`, `AGENTS.md`, `WORKFLOW.md`, `WORKFLOW_NOMAD.md`
- Эффект:
  - в репозитории появился единый операционный документ по AI-разработке;
  - multi-agent работа стала завязана на явного интегратора и write scopes;
  - развитие скиллов переведено из ad-hoc режима в управляемый lifecycle.

Обновление от 23 марта 2026 (nomad visual cleanup for brand, cta and checkbox):
- Проблема:
  - после `Nomad Lounge` visual pass brand-icon `n` в шапке выглядел лишним;
  - primary CTA оставался слишком ярко-жёлтым относительно остального интерфейса;
  - внутренний маркер кастомного checkbox визуально сидел не по центру.
- Изменение:
  - `apps/nomad-aroma-web/src/App.tsx`:
    - из brand-shell удалена отдельная иконка `n`, оставлен только wordmark `nomad`.
  - `apps/nomad-aroma-web/src/styles.css`:
    - primary buttons переведены в более спокойный bronze-tone;
    - checkbox marker переведён на абсолютное центрирование;
    - spacing brand-wrap подчищен под wordmark-only header.
- Проверки:
  - `cd apps/nomad-aroma-web && npm run build`
  - ручной browser smoke на `http://localhost:5175`
- Эффект:
  - шапка стала чище;
  - primary CTA лучше сочетается с `Nomad Lounge` палитрой;
  - checkbox выглядит аккуратнее в access-flow.

Обновление от 23 марта 2026 (nomad lounge visual branding pass for aroma atelier):
- Проблема:
  - после выравнивания механик под `Yami Web` `Арома Ателье` всё ещё ощущалось визуально нейтральным и не транслировало атмосферу `Nomad Lounge`;
  - шапка, карточки и интро не использовали фирменную бордовую палитру и тёплый свет интерьера.
- Изменение:
  - `apps/nomad-aroma-web/src/styles.css`:
    - базовая тема переведена в бордово-янтарную палитру с более глубокими surface-градиентами;
    - topbar, phone shell, intro, modal и карточки получили фирменный `Nomad`-контраст и более lounge-подачу;
    - заголовки, rail names и wordmark переведены на serif-display стек.
  - `apps/nomad-aroma-web/src/App.tsx`:
    - brand обновлён под `nomad` wordmark;
    - rail tags смягчены до `Выбор гостей / Редакция / Мастера`;
    - tonal palette карточек и инфографики переведена в burgundy / amber гамму.
  - `apps/nomad-aroma-web/README.md`:
    - README синхронизирован с новым `Nomad Lounge` visual layer.
- Проверки:
  - `cd apps/nomad-aroma-web && npm run build`
  - ручной browser smoke на `http://localhost:5175`
- Эффект:
  - `Арома Ателье` стало визуально ближе к реальному `Nomad Lounge`;
  - интерфейс сохранил механику `Yami Web`, но получил собственный lounge-характер.

Обновление от 23 марта 2026 (live intro sync for aroma onboarding cards):
- Проблема:
  - в живом `Nomad` backend старые intro-карточки про `18+` и `код доступа` оставались в БД даже после обновления seed-контента в исходниках;
  - из-за этого frontend продолжал показывать устаревший сценарий знакомства;
  - финальной welcome-карточке не хватало явного приглашения перейти в `Арома Ателье`.
- Изменение:
  - `apps/nomad-backend/src/state.ts`:
    - добавлена `syncIntroCards()`, которая при чтении intro-карточек удаляет устаревшие записи, добавляет недостающие и обновляет тексты без полного сброса Nomad-данных;
    - финальная карточка переписана в формате `Добро пожаловать в Арома Ателье`.
  - `apps/nomad-backend/src/content.test.ts`:
    - тест intro обновлён под новый продуктовый порядок карточек.
  - `apps/nomad-aroma-web/README.md`:
    - README синхронизирован с актуальным составом intro.
- Проверки:
  - `cd apps/nomad-backend && npm test`
  - `cd apps/nomad-backend && npm run build`
  - `curl -s http://localhost:3021/guest/intro/cards | jq`
- Эффект:
  - backend больше не держит устаревшие intro-шаги в рантайме;
  - знакомство соответствует реальному guest flow после ввода кода;
  - финал интро заканчивается явным welcome-приглашением.

Обновление от 23 марта 2026 (aroma intro copy and modal action placement pass):
- Проблема:
  - в intro оставались карточки про уже пройденные шаги `18+` и `код доступа`, хотя знакомство открывается после успешного ввода кода;
  - CTA `Выбрать микс` находился слишком низко в modal карточке;
  - product naming статистического рейла всё ещё требовал смягчения;
  - после `Найти` мобильные фильтры каталога оставались раскрытыми.
- Изменение:
  - `apps/nomad-backend/src/state.ts`:
    - intro сокращён до продуктовых карточек про предпочтения, витрину, каталог и финальное приглашение в `Арома Ателье`;
    - statistical rail переименован в `Больше всего выбирают`.
  - `apps/nomad-aroma-web/src/App.tsx`, `apps/nomad-aroma-web/src/styles.css`:
    - `Выбрать микс` перенесён в верх modal рядом с `Закрыть`;
    - нижний отдельный блок `Выбор` удалён;
    - `applyCatalogFilters()` теперь сворачивает мобильные фильтры после `Найти`.
- Проверки:
  - `cd apps/nomad-aroma-web && npm run build`
  - `cd apps/nomad-backend && npm run build`
- Эффект:
  - intro стал логичнее по месту в сценарии;
  - основной CTA в карточке микса теперь находится там, где его ожидаешь;
  - мобильный каталог ведёт себя компактнее после применения фильтров.

Обновление от 23 марта 2026 (aroma flow polish: fullscreen intro, chosen mix shell and mobile catalog action row):
- Проблема:
  - после detail-polish интро всё ещё показывало служебный верхний блок и меню, хотя по продуктовой логике знакомство должно открываться один раз после ввода кода и занимать весь экран;
  - выбранный микс жил внутри scroll-области и терялся при переходах;
  - в modal карточке снова требовалось развести аналитику открытия карточки и явный выбор микса;
  - в мобильном каталоге CTA `Найти` было легко потерять внутри длинной формы фильтров.
- Изменение:
  - `apps/nomad-aroma-web/src/App.tsx`:
    - topbar скрывается на этапе `intro`;
    - intro переведён в полноэкранный режим без служебного summary-блока;
    - каждое открытие карточки микса теперь регистрируется как analytics interest event;
    - явный выбор возвращён отдельной кнопкой `Выбрать микс`;
    - `Выбранный микс` вынесен в отдельную закреплённую панель под меню, вне scroll-контента;
    - rail tag перенесён вправо от названия рейла;
    - в мобильном каталоге `Найти` вынесена в верхний action-row рядом с toggle фильтров.
  - `apps/nomad-aroma-web/src/styles.css`:
    - phone shell переведён на flex-layout ради закреплённой панели выбранного микса;
    - intro получил fullscreen spacing и bottom controls bar;
    - мобильный каталог получил inline submit control.
  - `apps/nomad-backend/src/state.ts`:
    - статистический rail переименован в более продуктовый `Частые миксы`.
  - `apps/nomad-aroma-web/README.md`:
    - README обновлён под fullscreen intro и chosen mix shell.
- Проверки:
  - `cd apps/nomad-aroma-web && npm run build`
  - `cd apps/nomad-backend && npm run build`
  - ручной browser smoke на `http://localhost:5175`
  - подтверждено:
    - fullscreen intro без меню;
    - выбор микса через отдельную кнопку;
    - sticky `Выбранный микс` под меню;
    - видимая кнопка `Найти` в каталоге.
- Эффект:
  - flow знакомства стал ближе к ожидаемому one-shot onboarding;
  - выбранный микс теперь остаётся заметным на всём гостевом пути;
  - каталог перестал прятать главный CTA на мобильном.

Обновление от 23 марта 2026 (aroma detail polish: checkbox, modal infographics and rail tags pass):
- Проблема:
  - после `Yami Web Alignment` в `Арома Ателье` оставались UX-шероховатости: 18+ checkbox выглядел не в ритме `Yami Web`, summary выбранных вкусов и профилей смешивался в один список, а modal карточка микса перегружалась лишним CTA `Выбрать и показать мастеру` и отдельной кнопкой сохранения оценки;
  - rail headers на витрине всё ещё читались слишком технично, особенно для статистического рейла.
- Изменение:
  - `apps/nomad-aroma-web/src/App.tsx`:
    - чекбокс `18+` переведён на кастомную подачу вместо голого browser control;
    - onboarding-summary разделён на отдельные группы `Профили` и `Вкусы`, а вводный текст сокращён;
    - modal карточка микса теперь автоматически добавляет микс в карточку для мастера при открытии;
    - оценка сохраняется сразу по нажатию на балл без отдельной кнопки;
    - в modal добавлена инфографика по табакам, вкусам и профилям;
    - rail type labels переведены в продуктовую подачу `Аналитика / Редакторская подборка / От мастеров`.
  - `apps/nomad-aroma-web/src/styles.css`:
    - добавлены кастомный checkbox, компактный selection summary и ratio-bars в стиле `Yami Web`;
    - усилены отступы и ритм в блоке `О миксе`.
  - `apps/nomad-backend/src/state.ts`:
    - статистический системный рейл переименован из `Статистический топ` в `По выбору гостей`.
  - `apps/nomad-aroma-web/README.md`:
    - README синхронизирован с авто-выбором микса и rating-by-tap.
- Проверки:
  - `cd apps/nomad-backend && npm run build`
  - `cd apps/nomad-aroma-web && npm run build`
  - ручной browser smoke на `http://localhost:5175`
  - подтверждено:
    - новый вид checkbox на access screen;
    - раздельный summary `Профили / Вкусы` в onboarding;
    - modal с авто-добавлением в карточку для мастера;
    - сохранение оценки по одному нажатию;
    - отображение инфографики внутри карточки микса.
- Эффект:
  - `Арома Ателье` стало ближе к UX-ритму `Yami Web` уже в деталях взаимодействия;
  - modal карточка стала проще и логичнее для гостя;
  - витрина читает типы рейлов более продуктово, без лишней технической подачи.

Обновление от 23 марта 2026 (aroma yami alignment: storefront, rails and catalog mechanics pass):
- Проблема:
  - после `Aroma Polish` и `UX Hardening` `Арома Ателье` всё ещё ощущалось как отдельный экспериментальный UI, а не как Nomad-вариант базового `Yami Web`;
  - рекомендации, витрина и каталог не повторяли ключевую механику `Yami Web`: карточечные списки, product-copy для рейлов, отдельный экран рейла и модальное открытие карточки микса;
  - в потоке оставался старый хвост от access-сообщения, который продолжал отображаться уже после входа в продуктовый сценарий.
- Изменение:
  - `apps/nomad-backend/src/catalog.ts`, `apps/nomad-backend/src/state.ts`, `apps/nomad-backend/src/recommendations.ts`, `apps/nomad-backend/src/types.ts`:
    - расширен демо-каталог табаков, миксов, вкусов и `flavorProfiles`;
    - intro и витрина переписаны в более продуктовой подаче;
    - mix payload расширен `createdAt` и `proportion`, чтобы карточки и модалка могли выглядеть ближе к `Yami Web`.
  - `apps/nomad-aroma-web/src/App.tsx`:
    - весь guest flow перестроен под механику `код -> знакомство -> выбор вкусов -> подбор -> витрина -> каталог`;
    - intro сделан в формате горизонтально листаемых карточек;
    - рекомендации и каталог переведены на Yami-подобные сетки карточек;
    - карточка микса теперь открывается в modal overlay на текущем экране;
    - витрина получила продуктовые rail-метки `По выбору гостей`, `Готовая подборка`, `От наших мастеров`;
    - отдельный экран рейла работает как список карточек внутри конкретной подборки;
    - каталог получил фильтры по профилям вкуса, вкусам, брендам, табакам и сортировке;
    - удалён постоянный `access`-hint, который торчал внизу всех поздних экранов.
  - `apps/nomad-aroma-web/src/styles.css`:
    - стили переписаны ближе к shell/cards/filters из базового `Yami Web`, но без legacy-функций вроде избранного.
  - `apps/nomad-aroma-web/README.md`:
    - стадия обновлена под `Yami Web Alignment`.
- Проверки:
  - `cd apps/nomad-backend && npm test -- --test-name-pattern="guest intro|guest catalog|guest home rails|recommendations"`
  - `cd apps/nomad-backend && npm run build`
  - `cd apps/nomad-aroma-web && npm run build`
  - ручной browser smoke на `http://localhost:5175` в viewport `390x844`
  - подтверждены сценарии:
    - `код -> знакомство -> онбординг -> подбор`;
    - модальное открытие карточки микса без нижнего догруза страницы;
    - выбор микса для мастера;
    - переходы `Подбор -> Витрина -> рейл -> Каталог`.
  - сохранены артефакты:
    - `output/playwright/nomad-quality/aroma-recommendations-yami-mobile.png`
    - `output/playwright/nomad-quality/aroma-recommendation-modal-yami-mobile.png`
    - `output/playwright/nomad-quality/aroma-showcase-yami-mobile.png`
    - `output/playwright/nomad-quality/aroma-catalog-yami-mobile.png`
- Эффект:
  - `Арома Ателье` стало заметно ближе к UX-механике и визуальному ритму базового `Yami Web`;
  - продуктовый поток читается как `подбор + витрина + каталог`, а не как набор технических экранов;
  - Nomad baseline не затронут вне собственного параллельного контура.

Обновление от 23 марта 2026 (aroma ux hardening: resilient guest states and mobile handoff pass):
- Проблема:
  - после `Aroma Polish` основной guest flow выглядел хорошо визуально, но async-state UX оставался слишком техническим;
  - загрузки, пустые сценарии и ошибки на этапах `знакомство`, `онбординг`, `рекомендации`, `главная`, `каталог` показывались как короткие строки без action path;
  - на мобильном выбранный микс было легко потерять в длинном скролле до нижней карточки для мастера.
- Изменение:
  - `apps/nomad-aroma-web/src/App.tsx`:
    - добавлен универсальный `StatePanel` для `loading / error / empty`;
    - введены retry-пути для intro, onboarding options, recommendations, home rails и catalog;
    - рекомендации переведены на общий `loadRecommendations()` path для submit и повторной попытки;
    - каталог получил summary активных фильтров и кнопку применения фильтров из онбординга;
    - добавлен sticky `selected mix dock` c быстрым переходом к карточке мастера и reset-экшеном.
  - `apps/nomad-aroma-web/src/styles.css`:
    - добавлены стили для state panels, filter summary и sticky selected mix dock;
    - mobile layout усилен под компактный handoff-блок и full-width CTA в узком viewport.
  - `apps/nomad-aroma-web/README.md`:
    - стадия обновлена под `UX Hardening`.
- Проверки:
  - `cd apps/nomad-aroma-web && npm run build`
  - ручной browser smoke на `http://localhost:5175` в mobile viewport `390x844`
  - сохранены артефакты:
    - `output/playwright/nomad-quality/aroma-recommendations-mobile.png`
    - `output/playwright/nomad-quality/aroma-selected-mix-dock-mobile.png`
    - `output/playwright/nomad-quality/aroma-selected-mix-card-mobile.png`
- Эффект:
  - guest flow стал устойчивее при сбоях и пустых ответах backend;
  - у пользователя появился явный retry/next-step вместо тупиковых сообщений;
  - выбранный микс на мобильном теперь лучше работает как быстрый handoff к карточке для мастера.

Обновление от 23 марта 2026 (master polish: operational console pass for Nomad staff UI):
- Проблема:
  - `Мастер` уже был функционально полным, но визуально оставался набором однотипных карточек без чёткой operational hierarchy;
  - KPI, табы, editor panels и admin-only секции выглядели слишком одинаково и не создавали ощущения staff/admin console.
- Изменение:
  - `apps/nomad-master-web/src/App.tsx`:
    - hero расширен до более явного control-room header;
    - workspace navigation получила route-подачу с kicker-слоями;
    - section heads переведены с raw API-маркировки на product/operational labels;
    - access-блок получил более явную роль и admin/staff framing.
  - `apps/nomad-master-web/src/styles.css`:
    - выполнен полный visual pass в той же Nomad brand-system, но в более operational ритме;
    - усилены KPI cards, workspace tabs, manager layouts, editor cards, forms и access-panels;
    - улучшена mobile/tablet адаптация для рабочей панели.
  - `apps/nomad-master-web/README.md`:
    - стадия обновлена под `Master Polish`.
- Проверки:
  - `cd apps/nomad-master-web && npm run build`
  - ручной browser smoke на `http://127.0.0.1:4276` через Playwright CLI с login + inventory tab.
- Эффект:
  - `Мастер` теперь ощущается как staff/admin console, а не просто CRUD-набор;
  - KPI, рабочие разделы и manager/editor зоны читаются заметно лучше;
  - visual language Nomad теперь консистентна между `Арома Ателье` и `Мастер`.

Обновление от 23 марта 2026 (aroma polish: premium guest UI pass for Nomad):
- Проблема:
  - `Арома Ателье` уже было функционально полным, но визуально оставалось на уровне MVP-карточек;
  - guest flow выглядел слишком технически: stage navigation конкурировала с hero, selected mix давил на сценарий, а states и карточки были почти одного визуального веса.
- Изменение:
  - `apps/nomad-aroma-web/src/App.tsx`:
    - введены stage-specific hero mood states;
    - переработана навигация в формат guest journey;
    - selected mix превращён в более выразительную карточку для показа мастеру;
    - mix cards получили variant-подачу для `recommendation`, `rail`, `catalog`;
    - онбординг получил summary по выбранным профилям и вкусам;
    - из публичного guest UI убраны dev-like строки про `API`.
  - `apps/nomad-aroma-web/src/styles.css`:
    - сделан полноценный design pass в тёплой lounge-палитре Nomad;
    - усилена типографика, фон, surface system, chips/pills/statuses;
    - добавлены спокойные motion-эффекты и более плотная mobile adaptation.
  - `apps/nomad-aroma-web/README.md`:
    - стадия обновлена под `Aroma Polish`.
- Проверки:
  - `cd apps/nomad-aroma-web && npm run build`
  - ручной browser smoke на `http://127.0.0.1:4176` через Playwright CLI с артефактами в `output/playwright/nomad-quality`.
- Эффект:
  - Aroma теперь выглядит как самостоятельный lounge-facing продукт, а не как utility MVP;
  - сценарные этапы визуально различимы;
  - карточка выбранного микса стала ближе к реальному handoff экрану для мастера.

Обновление от 23 марта 2026 (quality and hardening: audit trail and manual smoke baseline for Nomad):
- Проблема:
  - Nomad staff-contour уже имел CRUD и automation, но не было persisted audit trail для staff-sensitive действий;
  - не было зафиксированного acceptance baseline и ручного browser smoke поверх реальных Nomad-сценариев;
  - в dev-smoke всплыл лишний шум: `404 /favicon.ico`.
- Изменение:
  - `apps/nomad-backend/prisma/schema.prisma`:
    - добавлена модель `NomadAuditEvent`.
  - `apps/nomad-backend/src/audit.ts`:
    - вынесены `recordAuditEvent()` и `listAuditEvents()`.
  - `apps/nomad-backend/src/app.ts`:
    - staff-sensitive mutations теперь пишут audit events;
    - добавлен admin-only endpoint `GET /staff/audit/events`.
  - `apps/nomad-master-web/src/App.tsx`, `contracts.ts`:
    - добавлен admin-only журнал последних staff-операций в разделе `Доступ`.
  - `apps/nomad-master-web/index.html`, `apps/nomad-aroma-web/index.html`:
    - подключён `favicon.svg` для устранения `404 /favicon.ico`.
  - `apps/nomad-master-web/src/App.tsx`:
    - password field в staff account editor получил `autocomplete="new-password"`.
  - `NOMAD_ACCEPTANCE_CHECKLIST.md`:
    - добавлен чеклист release/pilot acceptance для Nomad.
  - `output/playwright/nomad-quality`:
    - сохранены CLI-based smoke artifacts для `Арома Ателье` и `Мастера`.
- Проверки:
  - `cd apps/nomad-backend && npm run prisma:generate`
  - `cd apps/nomad-backend && DATABASE_URL=postgresql://nomad:nomad@127.0.0.1:5433/nomad?schema=public npm run prisma:dbpush`
  - `cd apps/nomad-backend && DATABASE_URL=postgresql://nomad:nomad@127.0.0.1:5433/nomad?schema=public npm test -- --test-name-pattern="audit|telegram automation state|staff-sensitive"`
  - `cd apps/nomad-backend && npm run build`
  - `cd apps/nomad-master-web && npm test -- --test-name-pattern="audit|Audit|telegram automation state|staff-sensitive"`
  - `cd apps/nomad-master-web && npm run build`
  - ручной smoke через Playwright CLI для guest и staff сценариев.
- Эффект:
  - staff-изменения теперь трассируются и видны в `Мастере`;
  - у Nomad появился формальный acceptance baseline;
  - dev-smoke больше не засоряется отсутствующим favicon.

Обновление от 22 марта 2026 (fix: align Nomad inventory toggle response contract):
- Проблема:
  - toggle наличия в `Мастер` падал с `Cannot read properties of undefined (reading 'id')`.
- Причина:
  - frontend ожидал ответ `PATCH /staff/inventory/tobaccos/:id` как `{ item: ... }`;
  - backend возвращал сырой объект табака без обёртки `item`.
- Изменение:
  - `apps/nomad-backend/src/app.ts`:
    - `PATCH /staff/inventory/tobaccos/:id` теперь возвращает `{ item: updated }`.
  - `apps/nomad-backend/src/inventory.test.ts`:
    - тест обновлён и теперь явно фиксирует форму ответа `PATCH`.
- Эффект:
  - toggle наличия снова работает;
  - контракт ответа защищён тестом от повторной регрессии.

Обновление от 22 марта 2026 (phase 3: inventory, smoke CTA and dashboard for Nomad backend):
- Проблема:
  - после Phase 2 backend умел только access + onboarding/recommendations;
  - не было живого in-memory inventory state, события `Покурить` и staff dashboard summary;
  - рекомендации не могли реагировать на изменение наличия в runtime.
- Изменение:
  - `apps/nomad-backend/src/state.ts`:
    - добавлен in-memory state для табаков и smoke CTA events;
    - реализованы reset/update helpers для тестов и runtime.
  - `apps/nomad-backend/src/recommendations.ts`:
    - рекомендации теперь опираются на текущий inventory state;
    - `getOnboardingOptions` и `getInStockMixes` используют live stock state.
  - `apps/nomad-backend/src/app.ts`:
    - добавлены `POST /guest/events/smoke-cta`;
    - добавлены `GET /staff/inventory/tobaccos`;
    - добавлены `PATCH /staff/inventory/tobaccos/:id`;
    - добавлен `GET /staff/dashboard/summary`;
    - staff endpoints требуют bearer token.
  - `apps/nomad-backend/src/inventory.test.ts`:
    - добавлены backend tests для inventory mutation;
    - проверяется, что после смены `inStock` рекомендации меняются;
    - проверяется `smoke CTA` tracking и dashboard summary.
  - `apps/nomad-backend/README.md`:
    - обновлён список endpoint’ов и стадия backend.
- Эффект:
  - Nomad backend теперь способен реагировать на runtime inventory changes;
  - появилась минимальная аналитика выбора миксов;
  - backend контур готов к следующему frontend/staff slice без ручного SQL/Prisma.

Обновление от 22 марта 2026 (phase 2: TDD-backed onboarding and recommendations for Nomad):
- Проблема:
  - после Phase 1 guest-flow останавливался сразу после подтверждения daily code;
  - отсутствовали онбординг, рекомендации и бизнес-логика, учитывающая наличие табаков;
  - новый шаг требовалось делать по принципу test-driven development.
- Изменение:
  - `apps/nomad-backend/package.json`:
    - добавлен script `npm test` на базе `tsx --test`.
  - `apps/nomad-backend/src/catalog.ts`:
    - добавлен in-memory demo catalog табаков и миксов.
  - `apps/nomad-backend/src/recommendations.ts`:
    - выделена testable rule-based recommendation logic;
    - выдача фильтруется по `in stock` компонентам;
    - score учитывает совпадения по `flavorProfiles`, `flavors`, а также popularity/rating bonus.
  - `apps/nomad-backend/src/recommendations.test.ts`:
    - добавлены тесты для:
      - onboarding options;
      - availability filter;
      - ranking logic;
      - endpoint `/guest/onboarding/recommendations` через `app.inject`.
  - `apps/nomad-backend/src/app.ts`:
    - добавлены `GET /guest/onboarding/options` и `POST /guest/onboarding/recommendations`;
    - `meta` расширен до Phase 2 scope.
  - `apps/nomad-aroma-web/src/App.tsx`:
    - после daily code теперь открывается реальный onboarding;
    - варианты онбординга загружаются с backend;
    - реализован выбор профилей и вкусов;
    - после submit показывается список рекомендаций;
    - на `Покурить` открывается карточка выбранного микса для показа мастеру.
  - `apps/nomad-aroma-web/src/styles.css`:
    - добавлены стили для onboarding chips, recommendation cards и chosen-mix view.
  - `apps/nomad-backend/README.md`, `apps/nomad-aroma-web/README.md`:
    - обновлены под Phase 2.
- Эффект:
  - Nomad получил первый полезный e2e flow `18+ -> код -> онбординг -> рекомендации -> выбранный микс`;
  - backend recommendation logic теперь покрыта тестами;
  - рекомендации уже учитывают наличие табаков, пусть пока и на in-memory каталоге.

Обновление от 22 марта 2026 (phase 1: guest access and staff auth slice for Nomad):
- Проблема:
  - Nomad scaffold не имел рабочего access slice, который могли бы использовать frontend-агенты;
  - без этого Phase 1 оставался только на уровне каркаса.
- Изменение:
  - `apps/nomad-backend` получил минимальный end-to-end access backend:
    - `POST /guest/access-code/verify`
    - `POST /staff/auth/login`
    - `GET /staff/auth/me`
    - stateless bearer token на `crypto` без новых зависимостей;
    - env-backed guest code и credentials для `admin` / `nomad`.
  - `apps/nomad-aroma-web` получил живой guest flow:
    - `18+` gate;
    - ввод daily code;
    - success shell после подтверждения кода;
    - локальное сохранение состояния сессии в браузере.
  - `apps/nomad-master-web` получил staff login flow:
    - логин/пароль;
    - хранение bearer token;
    - проверка `/staff/auth/me`;
    - shell после успешного входа.
  - проверка:
    - `cd apps/nomad-backend && npm run build`
    - `cd apps/nomad-aroma-web && npm run build`
    - `cd apps/nomad-master-web && npm run build`
- Эффект:
  - Phase 1 теперь можно использовать как реальный стартовый контракт для следующих Nomad-задач;
  - фронтенд-агенты получили конкретные endpoint-ответы;
  - backend остался простым и не потребовал Prisma или новых библиотек.

Обновление от 22 марта 2026 (scaffold: add isolated Nomad apps and dedicated Symphony workflow):
- Проблема:
  - у Nomad parallel track была только документная рамка, но не было реальных каталогов приложений и отдельного workflow для Symphony;
  - из-за этого следующий шаг разработки всё ещё рисковал свалиться в legacy `YummyWeb` / `backend`.
- Изменение:
  - созданы отдельные Nomad scaffold-каталоги:
    - `apps/nomad-aroma-web`
    - `apps/nomad-master-web`
    - `apps/nomad-backend`
    - `services/nomad-telegram-bot`
  - в каждом контуре добавлены базовые файлы:
    - `README.md`
    - `package.json`
    - `tsconfig.json`
    - `.env.example`
    - базовые entrypoints / placeholder UI или server bootstrap.
  - добавлен `WORKFLOW_NOMAD.md`:
    - base branch по умолчанию `codex/nomad-parallel-track`;
    - active scope ограничен `apps/nomad-*` и вторично `services/nomad-telegram-bot`;
    - auto-merge hook отсутствует;
    - default final state для Nomad-задач — `Human Review`, пока контур не стабилизирован.
  - `AGENTS.md` и `NOMAD_PARALLEL_EXECUTION_PLAN.md` синхронизированы с появлением `WORKFLOW_NOMAD.md`.
- Эффект:
  - Nomad получил реальный изолированный стартовый каркас;
  - Symphony теперь можно подключать отдельно от legacy workflow;
  - следующий feature slice можно делать уже внутри Nomad-каталогов без расползания по старому продукту.

Обновление от 22 марта 2026 (docs: switch Nomad work to parallel-track branch and isolated contour):
- Проблема:
  - предыдущий документный baseline трактовал Nomad как прямой pivot текущего проекта;
  - фактическое решение изменилось: legacy `Yummy` нужно сохранить в текущем виде, а Nomad развивать параллельно.
- Изменение:
  - создана отдельная ветка разработки `codex/nomad-parallel-track`;
  - `AGENTS.md` переведён в dual-track режим:
    - legacy `Yummy` зафиксирован как стабильный контур;
    - Nomad описан как параллельный контур в отдельных каталогах;
    - запрещено молча repurpose-ить `YummyWeb/` и `backend/` под Nomad;
    - добавлены правила по использованию multi-agent и ограничение на использование текущего `WORKFLOW.md` для Nomad.
  - `NOMAD_IMPLEMENTATION_PLAN.md` синхронизирован с новым решением:
    - рекомендация изменена с прямого переиспользования `backend + YummyWeb` на parallel-track архитектуру;
    - Nomad backend/frontend теперь описаны как отдельные приложения.
  - добавлен `NOMAD_PARALLEL_EXECUTION_PLAN.md`:
    - branch strategy;
    - целевая структура каталогов;
    - фазы реализации;
    - правила multi-agent работы;
    - критерии, когда реально нужен Symphony и каким должен быть отдельный Nomad workflow.
- Эффект:
  - Nomad теперь проектируется как изолированный parallel track;
  - legacy-контур не считается целью для переезда или скрытого рефакторинга;
  - дальнейшие Nomad-задачи можно брать без риска сломать текущий продукт.

Обновление от 22 марта 2026 (docs: pivot project baseline to Nomad Aroma Atelier + Master):
- Проблема:
  - текущий `PRD.md` и часть agent-контекста были описаны под старый user-centric сценарий с `magic-link`, `избранным`, `сессиями` и ML-рекомендациями;
  - новый продуктовый запрос для Nomad требует другой baseline: guest web без авторизации, daily code, age gate, backoffice `Мастер` и Telegram-бот.
- Изменение:
  - `PRD.md` полностью переписан под новый продуктовый сценарий:
    - `Арома Ателье` как гостевой mobile web;
    - `Мастер` как staff/admin web;
    - типы рейлов `statistical` / `prepared` / `curated`;
    - `Покурить` зафиксирован как аналитическое событие, а не smoking-session;
    - подтверждены age gate, daily code, ratings и учёт inventory в рекомендациях.
  - добавлен `NOMAD_IMPLEMENTATION_PLAN.md`:
    - discovery brief по новой модели;
    - сравнение архитектурных опций;
    - рекомендация оставить модульный монолит + отдельный bot worker;
    - AI delivery workflow по вертикальным slices.
  - `AGENTS.md` обновлён:
    - зафиксирован текущий Nomad-режим;
    - добавлены правила AI-разработки для перехода от документов к schema/API/UI.
- Эффект:
  - у проекта появился единый целевой baseline под Nomad;
  - следующие агентные задачи можно декомпозировать без конфликта со старым PRD;
  - legacy-функции вроде `favorites`, `sessions` и `magic-link` теперь явно считаются техническим долгом, а не целевой моделью продукта.

Обновление от 22 марта 2026 (fix: remove scroll from desktop top menu):
- Проблема:
  - в верхнем меню шапки навигация рендерилась как scroll-контейнер, из-за чего справа появлялся заметный scrollbar прямо внутри меню;
  - это визуально ломало desktop/tablet-header при обычном наборе вкладок `Главная`, `Каталог`, `Избранное`, `Сессии`.
- Изменение:
  - `YummyWeb/src/ui-kit/AppTabs.tsx`:
    - из `TabsList` убран `overflow-auto` для верхних вкладок.
  - `YummyWeb/src/ui/styles.css`:
    - `.topbar-nav` больше не является scroll-контейнером;
    - `.topbar-tabs` и `.topbar-tabs-list` растягиваются по доступной ширине без внутреннего скролла.
- Эффект:
  - в шапке больше не показывается scrollbar;
  - mobile-навигация через `select` не затронута.

Обновление от 22 марта 2026 (fix: remove favorite without empty JSON body):
- Проблема:
  - при клике на сердечко для удаления микса из избранного фронтенд отправлял `DELETE /favorites/:mixId` с заголовком `Content-Type: application/json`, но без тела;
  - Fastify отвечал `400 FST_ERR_CTP_EMPTY_JSON_BODY`, потому что пустой JSON body при таком заголовке считается невалидным.
- Изменение:
  - `YummyWeb/src/shared/apiClient.ts`:
    - общий `request()` больше не ставит `Content-Type: application/json` для запросов без `body`;
    - JSON сериализуется только когда тело действительно передано.
- Эффект:
  - удаление из избранного снова работает;
  - заодно исправлено то же поведение для других `DELETE`/`GET` запросов без тела, которые шли через тот же API-клиент.

Обновление от 22 марта 2026 (docs: import HOO-5 baseline verification gate into current Symphony workflow):
- В `WORKFLOW.md` секция `Checks before handoff` приведена к явному baseline verification gate для active scope.
- Зафиксированы быстрые routine-команды:
  - `cd YummyWeb && npm run build`
  - `cd backend && npm run build`
  - `cd services/catalog-updater && npm run build`
- Добавлено правило: если задача затрагивает несколько subproject в active scope, нужно прогонять build для каждого затронутого проекта.
- UI-эскалация исправлена на существующий script `cd YummyWeb && npm run e2e:smoke:chromium`.
- Отдельно зафиксировано, что остаётся manual:
  - browser smoke без готового Playwright-окружения;
  - backend behavior beyond build без существующих automated tests;
  - catalog refresh/parser/integration behavior beyond build без существующих automated tests.
- Причина:
  - в `main` отсутствовала merged-версия `HOO-5`, хотя задача была завершена в tracker;
  - baseline gate нужен как минимальный и воспроизводимый набор проверок перед маленькими Symphony-изменениями.

Обновление от 22 марта 2026 (ops: auto-merge `Done` Symphony tasks into `main`):
- В `WORKFLOW.md` добавлен `hooks.after_run`, который вызывает `scripts/symphony_auto_merge_done.sh`.
- `hooks.after_create` теперь дополнительно:
  - сохраняет исходный путь репозитория в `git config symphony.repoSource`;
  - сохраняет целевую базовую ветку в `git config symphony.baseBranch`;
  - явно переводит fresh workspace на issue-ветку с именем каталога (`HOO-123` и т.д.).
- Новый `scripts/symphony_auto_merge_done.sh` делает следующее:
  - определяет текущий issue по имени workspace;
  - запрашивает состояние issue в Linear;
  - если issue в `Done`, пытается автоматически вмержить branch issue-workspace в `main` исходного репозитория;
  - если merge блокируется из-за dirty target repo, конфликта или неверной target branch, переводит issue обратно в `Human Review` и оставляет комментарий в Linear.
- Ограничения:
  - авто-merge работает только при наличии `LINEAR_API_KEY`;
  - target repo должен быть чистым и стоять на `main`;
  - если preconditions не выполнены, задача не должна считаться тихо слитой.
- Причина:
  - `Done` без переноса коммитов из issue-workspace в основной репозиторий оставлял фактическое расхождение между tracker state и реальным состоянием `main`.

Обновление от 17 марта 2026 (docs: обязать Symphony делать явные Linear status transitions):
- В `WORKFLOW.md` дополнен `Status transition protocol`:
  - агент теперь обязан переводить задачу `Todo` -> `In Progress` в начале работы;
  - после завершения обязан переводить задачу либо в `Human Review`, либо в `Done` по критериям риска;
  - оставлять завершённую задачу в `Todo` или `In Progress` больше нельзя.
- Добавлены явные инструкции для `linear_graphql`:
  - сначала запросить `stateId` через `issue -> team -> states`;
  - затем выполнить `issueUpdate` с нужным `stateId`.
- Причина:
  - без этого Symphony продолжал делать новые turn'ы по уже выполненной задаче, если issue оставалась в активном состоянии.

Обновление от 17 марта 2026 (docs: уточнить Symphony policy для `Human Review`):
- В `WORKFLOW.md` изменён протокол статусов:
  - `Todo` -> `In Progress` при старте;
  - `Human Review` теперь не является default handoff;
  - в `Human Review` задача должна уходить только для критичных изменений, требующих явного человеческого ревью;
  - для небольших безопасных задач после релевантных проверок допустим прямой переход в `Done`.
- Критичные изменения для `Human Review` зафиксированы явно:
  - архитектура, schema/migration, auth/security, env changes, new dependencies, public API changes, large UI/product changes, incomplete verification, unresolved ambiguity.
- Причина:
  - это лучше соответствует реальному процессу команды: ручное ревью нужно не для каждой мелкой задачи, а для рисковых изменений.

Обновление от 17 марта 2026 (docs: перевести Symphony workflow в ASCII из-за бага `symphony_elixir`):
- Проблема:
  - reference implementation `openai/symphony` (`symphony_elixir`) падала на `Jason.EncodeError` при запуске задач, если prompt из `WORKFLOW.md` и issue description содержал кириллицу;
  - ошибка воспроизводилась сразу на `HOO-5` при сериализации сообщения в Codex App Server.
- Изменение:
  - `WORKFLOW.md` переведён в ASCII-only английский текст;
  - продуктовые и репозиторные инварианты сохранены, включая требование оставлять UI и `README.md` на русском языке.
- Причина:
  - это workaround для текущего ограничения reference implementation, а не изменение продуктовых требований.
- Проверка:
  - локальные логи `symphony_elixir` подтвердили, что исходная ошибка была связана именно с кириллицей в prompt.

Обновление от 17 марта 2026 (docs: починить Linear settings в Symphony workflow):
- В `WORKFLOW.md` исправлена конфигурация `tracker`:
  - удалён зашитый `LINEAR` API key из репозитория;
  - `api_key` возвращён к безопасной схеме через переменную окружения `$LINEAR_API_KEY`;
  - `project_slug` подтверждён для проекта `Noman Yummy` как `noman-yummy-f37a4787dbf5`.
- Причина:
  - хранить секрет в tracked-файле небезопасно;
  - для Symphony нужен корректный project slug, а не произвольный URL-фрагмент.
- Проверка:
  - через Linear API подтверждён доступ к проекту `Noman Yummy` и его project URL.

Обновление от 17 марта 2026 (docs: добавить Symphony workflow для управляемого agent flow):
- Добавлен корневой `WORKFLOW.md` для [openai/symphony](https://github.com/openai/symphony).
- Что настроено:
  - `Linear` как tracker через переменные `LINEAR_API_KEY` и `LINEAR_PROJECT_SLUG`;
  - изолированные workspace в `~/codex-workspaces/yummy-symphony`;
  - `after_create` clone из `SOURCE_REPO_URL` с fallback на локальный путь репозитория;
  - `codex app-server` как исполнитель;
  - последовательное выполнение задач (`max_concurrent_agents: 1`) и handoff только в `Human Review`.
- Репозиторные ограничения перенесены в workflow:
  - приоритет активного контура `YummyWeb` / `backend` / `services/catalog-updater`;
  - запрет на лишнее усложнение архитектуры и новые зависимости без обоснования;
  - обязательные релевантные проверки перед handoff;
  - обновление `NOTES.md` / `HANDOFF.md` при изменении операционного контура.
- Проверка:
  - вручную проверена структура `WORKFLOW.md` и соответствие текущим правилам `AGENTS.md`.

## Этот файл для человека

Обновление от 13 марта 2026 (docker bootstrap fix):
- Проблема:
  - стандартный `docker compose up -d` поднимал backend/web на пустой БД без миграций и сидов;
  - `backend-seed` отдельно падал с `Seed file not found: /app/seed/tobaccos.json`.
- Изменение:
  - `docker-compose.yml`:
    - `backend-migrate` и `backend-seed` переведены в стандартный startup flow без profile `setup`;
    - `backend` и `catalog-updater` теперь ждут успешного завершения `backend-seed`.
  - `backend/Dockerfile`:
    - каталог `seed/` копируется в build stage и runtime image.
  - `services/catalog-updater/Dockerfile`:
    - в runtime image добавлен сгенерированный Prisma client из backend schema, чтобы `catalog-updater` не падал на `@prisma/client did not initialize yet`.
  - `backend/README.md`, `YummyWeb/README.md`:
    - инструкции упрощены до обычного `docker compose up -d`.
- Проверка:
  - `docker compose --profile setup up backend-migrate backend-seed` на текущем окружении:
    - миграции применились;
    - до фикса seed падал из-за отсутствующего `/app/seed/`.

Обновление от 9 марта 2026 (fix: убрать double-tap на mobile-кнопках из-за hover state):
- Проблема:
  - на iPhone часть кнопок в интерфейсе сначала получала визуальный фокус/hover, а действие срабатывало только со второго тапа.
- Причина:
  - базовые UI-кнопки и close-кнопки модалок использовали прямые `hover:`-стили;
  - Safari на touch-устройствах мог сначала активировать hover-состояние, а не само действие.
- Изменение:
  - `YummyWeb/src/components/ui/button.tsx`:
    - hover-утилиты заменены на собственные классы `ui-hover-*`;
    - добавлен `touch-manipulation` в базовый button-класс.
  - `YummyWeb/src/components/ui/dialog.tsx`
    и `YummyWeb/src/components/ui/sheet.tsx`:
    - close-кнопки переведены с `hover:opacity-100` на класс `dialog-close-btn`.
  - `YummyWeb/src/ui/styles.css`:
    - hover-поведение для `ui-hover-*`, `dialog-close-btn`, `profile-menu-item`, `mix-action-btn`, `home-action-btn`, `rail-nav-btn` ограничено через `@media (hover: hover)`;
    - для `button` и `[role="button"]` добавлены `touch-action: manipulation` и `-webkit-tap-highlight-color: transparent`.
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`.

Обновление от 9 марта 2026 (fix: поднять теги и вкусовые фильтры выше брендов и табаков в каталоге):
- Запрос:
  - на desktop и mobile блоки поиска по тегам/профилям/вкусам должны быть выше фильтров по производителям и табакам.
- Изменение:
  - `YummyWeb/src/ui/CatalogScreen.tsx`:
    - внутри `catalog-advanced-filters` после `Сортировка` и `Мин. оценка` порядок блоков изменён на:
      - `Теги`
      - `Профили вкуса`
      - `Вкусы`
      - `Производитель`
      - `Табак`
    - общий JSX используется и в desktop, и в mobile, поэтому изменение применяется сразу в обеих версиях.
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`.

Обновление от 9 марта 2026 (fix: mobile filters in `Мои миксы` aligned with catalog pattern):
- Запрос:
  - в разделе `Мои миксы` нужны такие же mobile-фильтры, как в `Каталоге` и `Избранном`.
- Изменение:
  - `YummyWeb/src/ui/MixesScreen.tsx`:
    - добавлен compact mobile-режим фильтров;
    - для mobile список переведён на схему `черновик -> применить`;
    - добавлены:
      - `mixes-filters-toggle`
      - `mixes-advanced-filters`
      - sticky `mixes-submit-sticky`
    - inline-кнопка `Найти` на compact-width скрыта, вместо неё используется нижняя sticky CTA;
    - desktop-сценарий сохранён: applied-state автоматически синхронизируется с выбранными фильтрами.
- Проверка:
  - `cd YummyWeb && npm run build` — `OK`;
  - проверка через skill `playwright` на viewport `393x852`:
    - экран `Мои миксы` открывается из меню профиля;
    - фильтры свёрнуты по умолчанию;
    - sticky `Найти` видна;
    - артефакт: `output/playwright/mobile-wave1/after/mixes-mobile-compact-filters.png`.

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

Обновление от 22 марта 2026 (Nomad — смена CTA `Покурить` на `Выбрать`):
- `apps/nomad-aroma-web/src/App.tsx`:
  - user-facing текст кнопки рекомендации изменён с `Покурить` на `Выбрать`;
  - сопутствующие сообщения об аналитическом событии тоже приведены к `Выбрать`.
- `apps/nomad-master-web/src/App.tsx`:
  - подписи dashboard со статистикой нажатий обновлены на `Нажатия Выбрать`.
- `apps/nomad-aroma-web/README.md`:
  - описание guest CTA синхронизировано с новым названием.

Проверка:
- `cd apps/nomad-aroma-web && npm run build` — `OK`.
- `cd apps/nomad-master-web && npm run build` — `OK`.

Обновление от 22 марта 2026 (Nomad — Phase 4 content rails):
- `apps/nomad-backend/src/app.ts`, `state.ts`, `types.ts`, `recommendations.ts`:
  - добавлены guest endpoints для `знакомства`, `главной с рейлами`, `каталога миксов` и `оценки`;
  - добавлены staff endpoints для менеджера миксов и менеджера рейлов;
  - статистический рейл теперь строится по `Выбрать` + `avgRating`.
- `apps/nomad-aroma-web/src/App.tsx`, `styles.css`:
  - после доступа гость проходит через `знакомство -> онбординг -> рекомендации -> главную -> каталог`;
  - добавлены выбор микса из разных источников и оценка `1..5`;
  - исправлен разбор backend-ответа по rating, чтобы средняя оценка обновлялась в карточке.
- `apps/nomad-master-web/src/App.tsx`, `contracts.ts`, `styles.css`:
  - staff shell расширен до вкладок `Дашборд`, `Инвентаризация`, `Миксы`, `Рейлы`;
  - добавлены MVP-формы создания и редактирования миксов и рейлов.
- `apps/nomad-*/README.md`:
  - документация синхронизирована с новым Phase 4 состоянием.

Проверка:
- `cd apps/nomad-backend && npm test` — `OK`.
- `cd apps/nomad-backend && npm run build` — `OK`.
- `cd apps/nomad-aroma-web && npm run build` — `OK`.
- `cd apps/nomad-master-web && npm test` — `OK`.
- `cd apps/nomad-master-web && npm run build` — `OK`.

Обновление от 22 марта 2026 (Nomad — перевод backend на хранилище):
- `apps/nomad-backend` переведён с in-memory state на `Prisma + SQLite`.
- Добавлены:
  - `apps/nomad-backend/prisma/schema.prisma`,
  - `apps/nomad-backend/prisma/seed.ts`,
  - `apps/nomad-backend/src/db.ts`.
- `apps/nomad-backend/src/state.ts`:
  - весь runtime state перенесён на persistence-слой Prisma;
  - добавлены bootstrap/reset функции для наполнения Nomad storage.
- `apps/nomad-backend/src/app.ts`, `recommendations.ts`, `*.test.ts`:
  - backend и тесты переведены на async persistence API;
  - тестовый прогон сделан последовательным, чтобы SQLite-файл не конфликтовал между test workers.
- `.gitignore`:
  - добавлен ignore для локального `apps/nomad-backend/prisma/*.db`.

Проверка:
- `cd apps/nomad-backend && npm run prisma:generate` — `OK`.
- `cd apps/nomad-backend && npm run prisma:dbpush -- --force-reset` — `OK`.
- `cd apps/nomad-backend && npm run prisma:seed` — `OK`.
- `cd apps/nomad-backend && npm test` — `OK`.
- `cd apps/nomad-backend && npm run build` — `OK`.
- `cd apps/nomad-aroma-web && npm run build` — `OK`.
- `cd apps/nomad-master-web && npm run build` — `OK`.

Обновление от 22 марта 2026 (Nomad — перевод Prisma-контура на отдельный Postgres):
- `apps/nomad-backend/prisma/schema.prisma`:
  - datasource переключён с `sqlite` на `postgresql`.
- `apps/nomad-backend/docker-compose.yml`:
  - добавлен отдельный локальный Postgres-контур Nomad на `5433`.
- `apps/nomad-backend/.env.example`, `src/db.ts`, `prisma/seed.ts`:
  - дефолтный `DATABASE_URL` переведён на `postgresql://nomad:nomad@127.0.0.1:5433/nomad?schema=public`.
- `apps/nomad-backend/package.json`:
  - добавлены `db:start` / `db:stop` для локального Postgres.
- `.gitignore`:
  - убран SQLite-specific ignore, так как Nomad runtime больше не использует file DB.

Проверка:
- `docker compose -f apps/nomad-backend/docker-compose.yml up -d db` — `OK`.
- `docker compose -f apps/nomad-backend/docker-compose.yml exec -T db pg_isready -U nomad -d nomad` — `OK`.
- `cd apps/nomad-backend && DATABASE_URL=postgresql://nomad:nomad@127.0.0.1:5433/nomad?schema=public npm run prisma:generate` — `OK`.
- `cd apps/nomad-backend && DATABASE_URL=postgresql://nomad:nomad@127.0.0.1:5433/nomad?schema=public npm run prisma:dbpush -- --force-reset` — `OK`.
- `cd apps/nomad-backend && DATABASE_URL=postgresql://nomad:nomad@127.0.0.1:5433/nomad?schema=public npm run prisma:seed` — `OK`.
- `cd apps/nomad-backend && npm test` — `OK`.
- `cd apps/nomad-backend && npm run build` — `OK`.
- `cd apps/nomad-aroma-web && npm run build` — `OK`.
- `cd apps/nomad-master-web && npm run build` — `OK`.

Обновление от 22 марта 2026 (Nomad — staff auth и daily code переведены из env в Postgres):
- `apps/nomad-backend/prisma/schema.prisma`:
  - добавлены модели `NomadStaffAccount` и `NomadDailyAccessCode`.
- `apps/nomad-backend/prisma/seed.ts` и `apps/nomad-backend/src/state.ts`:
  - reset/seed теперь создают persisted staff accounts и активный daily code;
  - стартовые данные живут в БД, а не в `.env`.
- `apps/nomad-backend/src/auth.ts`:
  - staff login теперь проверяется по записям `NomadStaffAccount`;
  - daily code верифицируется по активным окнам `NomadDailyAccessCode`;
  - секреты хранятся не в plaintext, а как `scrypt` hash + salt.
- `apps/nomad-backend/src/app.ts`:
  - `POST /guest/access-code/verify` и `POST /staff/auth/login` переключены на Postgres-backed источники данных.
- `apps/nomad-backend/src/auth.test.ts`:
  - добавлены прямые тесты на persisted guest access code и persisted staff auth.
- `apps/nomad-backend/.env.example`, `README.md`:
  - удалены переменные `NOMAD_GUEST_ACCESS_CODE`, `NOMAD_ADMIN_*`, `NOMAD_NOMAD_*`, `NOMAD_STAFF_DISPLAY_NAME` как runtime source of truth.

Проверка:
- `cd apps/nomad-backend && DATABASE_URL=postgresql://nomad:nomad@127.0.0.1:5433/nomad?schema=public npm run prisma:generate` — `OK`.
- `cd apps/nomad-backend && DATABASE_URL=postgresql://nomad:nomad@127.0.0.1:5433/nomad?schema=public npm run prisma:dbpush -- --force-reset` — `OK`.
- `cd apps/nomad-backend && DATABASE_URL=postgresql://nomad:nomad@127.0.0.1:5433/nomad?schema=public npm run prisma:seed` — `OK`.
- `cd apps/nomad-backend && npm test` — `OK`.
- `cd apps/nomad-backend && npm run build` — `OK`.

Обновление от 23 марта 2026 (Nomad — CRUD для daily codes и staff accounts в `Мастер`):
- `apps/nomad-backend/prisma/schema.prisma`, `prisma/seed.ts`, `src/state.ts`:
  - в persisted daily code добавлено явное поле `codeValue`, чтобы staff видел и редактировал текущий код без обращения к seed;
  - reset/seed продолжают поднимать стартовый код `NOMAD-2026` и staff accounts в Postgres.
- `apps/nomad-backend/src/auth.ts`:
  - `resolveStaffSession()` теперь валидирует bearer token против актуального состояния account в БД;
  - деактивация staff account сразу влияет на `GET /staff/auth/me`.
- `apps/nomad-backend/src/access.ts`, `src/app.ts`, `src/types.ts`, `src/access.test.ts`:
  - добавлены persisted CRUD endpoints:
    - `GET/POST/PATCH/DELETE /staff/access/daily-codes`,
    - `GET/POST/PATCH/DELETE /staff/access/accounts`;
  - daily codes доступны ролям `admin` и `nomad`;
  - staff accounts доступны только `admin`.
- `apps/nomad-master-web/src/App.tsx`, `contracts.ts`, `contracts.test.ts`, `styles.css`:
  - добавлена вкладка `Доступ`;
  - реализованы create/edit/delete формы для daily codes;
  - реализованы create/edit/delete формы для staff accounts;
  - для роли `nomad` staff accounts отображаются в forbidden-state, а daily codes остаются доступными.
- `apps/nomad-backend/README.md`, `apps/nomad-master-web/README.md`:
  - runbook и описание продукта синхронизированы с access-management slice.

Проверка:
- `cd apps/nomad-master-web && npm test` — `OK`.
- `cd apps/nomad-master-web && npm run build` — `OK`.
- `cd apps/nomad-backend && npm run build` — `OK`.
- `git diff --check` — `OK`.
- `cd apps/nomad-backend && DATABASE_URL=postgresql://nomad:nomad@127.0.0.1:5433/nomad?schema=public npm test`:
  - локально не воспроизведён в этой сессии, потому что Docker daemon оказался недоступен, а backend-тесты требуют живой Postgres на `5433`;
  - по итогам параллельной backend-ветки подагент прогнал `prisma generate/dbpush/seed`, `npm test` и `npm run build` успешно на том же access slice.

Обновление от 23 марта 2026 (Nomad — Telegram-бот и automation daily code):
- `apps/nomad-backend/src/daily-code.ts`, `src/access.ts`, `src/app.ts`, `src/config.ts`, `src/types.ts`:
  - добавлен automation слой для бота с `x-nomad-automation-key`;
  - появились endpoints:
    - `GET /automation/daily-code/current`,
    - `POST /automation/daily-code/ensure`,
    - `POST /automation/daily-code/rotate`;
  - `ensure` идемпотентно держит один актуальный code на текущее московское окно;
  - `rotate` деактивирует текущие активные коды окна и создаёт новый.
- `services/nomad-telegram-bot/src/*`:
  - bot service больше не ходит в backoffice CRUD через staff auth;
  - используется отдельный backend automation contract;
  - поддержаны команды `/start`, `/help`, `/code`, `/rotate`, `/whoami`;
  - добавлены allowlist/broadcast/rotate chat lists через env;
  - локальный state-файл защищает от повторной авторассылки после рестарта;
  - добавлены unit tests на time/storage helpers.
- `apps/nomad-backend/.env.example`, `apps/nomad-backend/README.md`, `services/nomad-telegram-bot/.env.example`, `services/nomad-telegram-bot/README.md`:
  - runbook синхронизирован под automation key, расписание и Telegram chat configuration.

Проверка:
- `cd services/nomad-telegram-bot && npm test` — `OK`.
- `cd services/nomad-telegram-bot && npm run build` — `OK`.
- `cd apps/nomad-backend && npm run build` — `OK`.
- backend integration tests против Postgres локально в этой сессии не повторялись из-за недоступного Docker daemon; access/automation backend build прошёл, а automation backend slice уже зафиксирован коммитом `a828a47`.

Обновление от 23 марта 2026 (Nomad — smoke-test Telegram и синхронизация automation worker):
- `services/nomad-telegram-bot/src/backend.ts`, `src/backend.test.ts`, `src/config.ts`:
  - backend client и тесты синхронизированы с реальным automation contract;
  - worker больше не опирается на устаревший staff-auth CRUD flow;
  - из bot config убраны неиспользуемые runtime-поля `backendAdminLogin`, `backendAdminPassword`, `codePrefix`, `codeLabelPrefix`.
- `services/nomad-telegram-bot/.env.example`, `services/nomad-telegram-bot/README.md`:
  - runbook обновлён под automation-only backend integration.
- Локально создан `services/nomad-telegram-bot/.env` с реальными значениями:
  - `TELEGRAM_BOT_TOKEN`;
  - `NOMAD_TELEGRAM_ALLOWED_CHAT_IDS=362223626`;
  - `NOMAD_TELEGRAM_BROADCAST_CHAT_IDS=362223626`;
  - `NOMAD_BACKEND_AUTOMATION_TOKEN=nomad-local-automation-key`.

Проверка:
- `docker compose -f apps/nomad-backend/docker-compose.yml up -d db` — `OK`.
- `cd apps/nomad-backend && DATABASE_URL=postgresql://nomad:nomad@127.0.0.1:5433/nomad?schema=public npm run prisma:dbpush -- --force-reset` — `OK`.
- `cd apps/nomad-backend && DATABASE_URL=postgresql://nomad:nomad@127.0.0.1:5433/nomad?schema=public npm run prisma:seed` — `OK`.
- `cd apps/nomad-backend && DATABASE_URL=postgresql://nomad:nomad@127.0.0.1:5433/nomad?schema=public npm test` — `OK`, `17/17`.
- `cd services/nomad-telegram-bot && npm test` — `OK`, `7/7`.
- `cd services/nomad-telegram-bot && npm run build` — `OK`.
- `curl -sS http://127.0.0.1:3021/health` — `OK`.
- `curl -sS -H 'x-nomad-automation-key: nomad-local-automation-key' http://127.0.0.1:3021/automation/daily-code/current` — `OK`.

Ограничение:
- реальный smoke-test доставки в Telegram не завершён из этой среды, потому что исходящие запросы к `https://api.telegram.org` стабильно падают по timeout;
- worker стартует до шага Telegram API и завершается на `fetch failed / UND_ERR_CONNECT_TIMEOUT`;
- проблема воспроизводится и напрямую через `curl -I https://api.telegram.org`, и через `curl https://api.telegram.org/bot.../getMe`.

Обновление от 23 марта 2026 (Nomad — Telegram provisioning из `Мастера` и backend-driven recipient lists):
- `apps/nomad-backend/prisma/schema.prisma`, `prisma/seed.ts`, `src/state.ts`:
  - добавлена модель `NomadTelegramRecipient`;
  - reset/seed теперь чистят persisted Telegram recipients вместе с остальным Nomad storage;
  - стартовый seed для recipients пока пустой.
- `apps/nomad-backend/src/access.ts`, `src/app.ts`, `src/types.ts`:
  - добавлены admin-only endpoints:
    - `GET/POST/PATCH/DELETE /staff/access/telegram-recipients`;
  - добавлен automation endpoint:
    - `GET /automation/telegram/recipients`;
  - backend группирует активные chat ids в `allowed`, `broadcast`, `rotate`.
- `apps/nomad-backend/src/access.test.ts`, `src/automation.test.ts`:
  - добавлены регрессии на CRUD Telegram recipients и automation grouping.
- `apps/nomad-master-web/src/contracts.ts`, `contracts.test.ts`, `App.tsx`:
  - добавлен новый access-блок для управления чатами Telegram;
  - UI позволяет создавать, редактировать, активировать и удалять чаты по типам `allowed`, `broadcast`, `rotate`;
  - user-facing интерфейс сохранён на русском.
- `services/nomad-telegram-bot/src/types.ts`, `src/backend.ts`, `src/backend.test.ts`, `src/config.ts`, `src/bot.ts`:
  - bot читает recipient lists из backend automation API;
  - по каждому scope остаётся fallback на `.env`, если backend-список пуст или endpoint недоступен;
  - `NOMAD_TELEGRAM_ROTATE_CHAT_IDS` снова учитывается как отдельный fallback-список для `/rotate`.
- `apps/nomad-backend/README.md`, `apps/nomad-master-web/README.md`, `services/nomad-telegram-bot/README.md`:
  - runbook синхронизирован с Telegram provisioning slice.

Проверка:
- `cd apps/nomad-backend && npm run prisma:generate` — `OK`.
- `cd apps/nomad-backend && DATABASE_URL=postgresql://nomad:nomad@127.0.0.1:5433/nomad?schema=public npm run prisma:dbpush` — `OK`.
- `cd apps/nomad-backend && npm test` — `OK`, `19/19`.
- `cd apps/nomad-backend && npm run build` — `OK`.
- `cd apps/nomad-master-web && npm test` — `OK`, `15/15`.
- `cd apps/nomad-master-web && npm run build` — `OK`.
- `cd services/nomad-telegram-bot && npm test` — `OK`, `8/8`.
- `cd services/nomad-telegram-bot && npm run build` — `OK`.

Обновление от 23 марта 2026 (Nomad — roadmap и Symphony batching):
- добавлен новый документ `NOMAD_ROADMAP.md`:
  - текущий статус Nomad;
  - направления работ;
  - приоритеты `must / should / later`;
  - рекомендуемые Symphony batches;
  - правила дробления задач и exit criteria.
- `WORKFLOW_NOMAD.md`:
  - теперь явно требует читать `NOMAD_ROADMAP.md` перед выбором приоритета;
  - фиксирует roadmap-driven execution и preferred batch order.
- `AGENTS.md`:
  - `NOMAD_ROADMAP.md` добавлен в список активных Nomad-контекстных документов.

Проверка:
- `git diff --check` — `OK`.

Обновление от 23 марта 2026 (Nomad — Release Foundation batch 1):
- Linear:
  - созданы issues:
    - `HOO-12` — managed runtime for Telegram bot;
    - `HOO-13` — production env matrix;
    - `HOO-14` — bootstrap admin path;
    - `HOO-15` — deployment smoke checklist.
- `apps/nomad-backend/scripts/bootstrap-admin.ts`, `apps/nomad-backend/package.json`, `apps/nomad-backend/README.md`:
  - добавлен отдельный production bootstrap path для первого admin;
  - команда `npm run bootstrap:admin` создаёт или обновляет admin-account без зависимости от dev seed credentials.
- `services/nomad-telegram-bot/ops/ecosystem.config.cjs`, `services/nomad-telegram-bot/ops/nomad-telegram-bot.service`, `services/nomad-telegram-bot/README.md`:
  - добавлены managed runtime templates для `pm2` и `systemd`;
  - runbook обновлён под production запуск.
- `NOMAD_ENV_MATRIX.md`:
  - зафиксирована env matrix для backend, обоих web-приложений и Telegram-бота;
  - отдельно выделены bootstrap-only и fallback-only переменные.
- `NOMAD_DEPLOYMENT_SMOKE_CHECKLIST.md`:
  - добавлен post-deploy smoke checklist для backend, guest web, master web и bot automation.

Проверка:
- `cd apps/nomad-backend && npm run build` — `OK`.
- `cd apps/nomad-backend && env DATABASE_URL=... NOMAD_BOOTSTRAP_ADMIN_LOGIN=nomad-admin NOMAD_BOOTSTRAP_ADMIN_NAME=\"Nomad Admin\" NOMAD_BOOTSTRAP_ADMIN_PASSWORD=temporary-admin-password npm run bootstrap:admin` — `OK`.
- `cd services/nomad-telegram-bot && npm run build` — `OK`.
- `git diff --check` — `OK`.

Обновление от 23 марта 2026 (Nomad — Telegram automation state и admin status panel):
- Linear:
  - создан `HOO-16` — persisted bot status and heartbeat;
  - создан `HOO-17` — admin panel for bot status.
- `apps/nomad-backend/prisma/schema.prisma`, `prisma/seed.ts`, `src/state.ts`:
  - добавлена persisted модель `NomadTelegramAutomationState`;
  - reset/seed очищают automation state вместе с остальными Nomad-данными.
- `apps/nomad-backend/src/access.ts`, `src/types.ts`, `src/app.ts`:
  - добавлены backend contracts и endpoints:
    - `GET /automation/telegram/state`
    - `POST /automation/telegram/state/report`
    - `GET /staff/access/telegram-automation-state`
  - backend хранит и отдаёт:
    - heartbeat;
    - last rotate;
    - last broadcast;
    - last error;
    - computed health `unknown / healthy / stale / error`.
- `apps/nomad-backend/src/automation.test.ts`, `src/access.test.ts`:
  - добавлены регрессии на automation state reporting и admin-only staff read endpoint.
- `services/nomad-telegram-bot/src/types.ts`, `src/backend.ts`, `src/backend.test.ts`, `src/bot.ts`:
  - bot client умеет читать и репортить automation state;
  - worker шлёт heartbeat раз в минуту;
  - worker фиксирует в backend успешные `broadcast` и `rotate`;
  - ошибки polling/scheduled broadcast отправляются в backend с throttling, чтобы не спамить state log.
- `apps/nomad-master-web/src/contracts.ts`, `contracts.test.ts`, `App.tsx`, `styles.css`:
  - в разделе `Доступ` появился admin-only обзор Telegram automation;
  - показываются heartbeat, last rotate, last broadcast, last error и summary по Telegram chats.
- `apps/nomad-backend/README.md`, `apps/nomad-master-web/README.md`, `services/nomad-telegram-bot/README.md`:
  - runbook и stage descriptions синхронизированы под новый automation-state slice.

Проверка:
- `cd apps/nomad-backend && npm run prisma:generate` — `OK`.
- `cd apps/nomad-backend && DATABASE_URL=postgresql://nomad:nomad@127.0.0.1:5433/nomad?schema=public npm run prisma:dbpush` — `OK`.
- `cd apps/nomad-backend && DATABASE_URL=postgresql://nomad:nomad@127.0.0.1:5433/nomad?schema=public npm test -- --test-name-pattern=\"telegram\"` — `OK`.
- `cd apps/nomad-backend && npm run build` — `OK`.
- `cd apps/nomad-master-web && npm test -- --test-name-pattern=\"Telegram\"` — `OK`.
- `cd apps/nomad-master-web && npm run build` — `OK`.
- `cd services/nomad-telegram-bot && npm test -- --test-name-pattern=\"telegram\"` — `OK`.
- `cd services/nomad-telegram-bot && npm run build` — `OK`.
