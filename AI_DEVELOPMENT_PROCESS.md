# AI_DEVELOPMENT_PROCESS.md

## Назначение

Этот документ фиксирует рабочую модель AI-разработки для репозитория `Yummy + Nomad parallel track`.

Он отвечает на два вопроса:

1. как организовать мультиагентную разработку без конфликтов и архитектурного дрейфа;
2. как формировать, развивать и использовать скиллы для полного цикла разработки.

Документ дополняет, а не заменяет:

1. `AGENTS.md` — базовые правила поведения агента;
2. `WORKFLOW.md` — legacy orchestration;
3. `WORKFLOW_NOMAD.md` — Nomad orchestration;
4. `PRD.md`, `NOMAD_IMPLEMENTATION_PLAN.md`, `NOMAD_PARALLEL_EXECUTION_PLAN.md`, `NOMAD_ROADMAP.md` — продуктовые и delivery-ограничения.

## Цели процесса

Процесс считается здоровым, если:

1. крупные задачи режутся на проверяемые вертикальные срезы;
2. один агент всегда отвечает за интеграцию и итоговый merge;
3. параллельная работа не создаёт конфликтующих write scopes;
4. продуктовые инварианты фиксируются до массовой генерации кода;
5. повторяемые операции выносятся в скиллы или формализованные workflow, а не держатся в памяти отдельного исполнителя.

## Operating Model

### Основной принцип

По умолчанию работа идёт в модели `leader + specialists`.

`AI Lead` владеет:

1. пониманием задачи и связи с PRD;
2. решением, нужен ли single-agent, multi-agent или Symphony;
3. декомпозицией на подзадачи;
4. выдачей write scopes и критериев готовности;
5. интеграцией результатов;
6. финальной проверкой, обновлением docs и handoff;
7. merge-решением.

Специализированные агенты не принимают repo-level решения молча и не меняют scope за пределами выданного контекста.

### Когда использовать один агент

Single-agent режим предпочтителен, если:

1. меняется архитектура, схема данных или продуктовый контракт;
2. задача ещё плохо определена;
3. несколько частей системы тесно связаны и требуют постоянной синхронизации;
4. один и тот же модуль пришлось бы редактировать нескольким агентам.

### Когда использовать multi-agent

Multi-agent допустим, если одновременно выполняются все условия:

1. цель задачи уже зафиксирована;
2. есть лидер-интегратор;
3. подзадачи имеют непересекающиеся write scopes;
4. контракты между частями уже определены;
5. итоговую сборку и проверку делает один владелец.

### Когда использовать Symphony

Symphony использовать только для потока из множества небольших и безопасных задач.

Подходящий сценарий:

1. `1 issue = 1 bounded context = 1 проверяемый результат`;
2. scope локален для одного приложения или одного docs/runbook-среза;
3. нет repo-level архитектурного решения внутри issue;
4. итоговый риск допускает routine handoff.

Неподходящий сценарий:

1. первый scaffold нового контура;
2. крупные `schema/auth/infra` изменения;
3. смешение legacy и Nomad в одной задаче;
4. задача, где итоговая форма решения ещё не определена.

## Роли агентов

### 1. AI Lead / Integrator

Обязательная роль для любой нетривиальной задачи.

Ответственность:

1. прочитать `AGENTS.md` и релевантные продуктовые документы;
2. выбрать рабочий режим: single-agent, multi-agent, Symphony;
3. определить active scope, артефакты и verification gate;
4. назначить владельцев подзадач;
5. собрать результат в консистентный change-set;
6. обновить `NOTES.md`, `HANDOFF.md`, `AGENTS.md` и process docs, если это требуется изменением;
7. принять решение о commit/merge или переводе в `Human Review`.

### 2. System Analyst / Product Analyst

Нужен, если задача затрагивает продуктовый сценарий, сущности, API или роли пользователей.

Артефакты:

1. problem statement;
2. user flow;
3. data contract;
4. acceptance criteria;
5. список инвариантов, которые нельзя нарушать.

### 3. Architect / Domain Designer

Нужен только там, где есть архитектурный выбор.

Артефакты:

1. bounded context;
2. границы модулей;
3. решение по reuse: `copy with adaptation`, `extract shared module`, `keep separate`;
4. список рисков и обратимости решения.

### 4. Backend Worker

Владеет только серверной подзадачей внутри выданного scope.

Артефакты:

1. schema/domain changes;
2. endpoint/service implementation;
3. backend tests;
4. build/check result.

### 5. Frontend Worker

Владеет только конкретным UI-срезом.

Артефакты:

1. экран или поток;
2. интеграция с утверждённым контрактом;
3. локальные UI checks;
4. README/update notes при изменении поведения.

### 6. QA / Test Agent

Не переписывает feature без необходимости. Его задача — верификация.

Артефакты:

1. test plan;
2. smoke/e2e/manual findings;
3. regression notes;
4. список незакрытых рисков.

### 7. DevOps / Release Agent

Подключается для runbook, env, deployment, monitoring, rollback и release smoke.

Артефакты:

1. env matrix;
2. deploy steps;
3. smoke checklist;
4. rollback notes;
5. observability checks.

### 8. Design / UX Agent

Подключается для Figma-to-code, visual system и UX-проходов.

Артефакты:

1. визуальные требования;
2. design decisions;
3. asset usage rules;
4. diff между макетом и реализацией.

### 9. Explorer / Research Agent

Read-only роль. Полезна для аудита legacy, поиска повторяющихся решений и анализа зависимостей.

Артефакты:

1. findings;
2. reuse candidates;
3. ограничения;
4. ссылки на исходные файлы и риски переноса.

## Шаблоны агентных команд

### Команда для feature slice

Использовать по умолчанию:

1. `AI Lead / Integrator`
2. `System Analyst`
3. `Backend Worker` или `Frontend Worker`
4. `QA Agent`

Подключать дополнительно только по необходимости:

1. `Architect` — если есть архитектурное решение;
2. `Design / UX Agent` — если есть Figma или заметный visual scope;
3. `DevOps / Release Agent` — если меняется runtime или deploy.

### Команда для cross-app интеграции

Использовать только после фиксации контрактов:

1. `AI Lead / Integrator`
2. `System Analyst`
3. `Backend Worker`
4. `Frontend Worker`
5. `QA Agent`

Условие:

1. backend и frontend не делят один write scope;
2. интеграционные расхождения закрывает только `AI Lead`.

### Команда для release / hardening

Использовать ближе к выпуску:

1. `AI Lead / Integrator`
2. `QA Agent`
3. `DevOps / Release Agent`
4. `Explorer`, если нужен аудит зависимостей, env или runtime.

## Контракт запуска подзадачи

Перед стартом любого worker-агента `AI Lead` должен зафиксировать:

1. цель подзадачи одним абзацем;
2. write scope;
3. read scope, если он шире write scope;
4. входной контракт;
5. выходной результат;
6. команды проверки;
7. условия, при которых агент обязан остановиться и вернуть вопрос человеку.

Если любой из этих пунктов не определён, задачу нельзя безопасно распараллеливать.

## Правила декомпозиции

1. Один агент не должен делить write scope с другим агентом.
2. Один issue не должен содержать одновременно `schema + auth + UI + infra`, если это не заранее спланированный интеграционный шаг.
3. Сначала фиксируются продуктовые документы и контракты, затем код.
4. Explorer может работать параллельно почти с любой задачей, если он не редактирует файлы.
5. QA и release-проверки можно запускать параллельно только после того, как feature scope стабилизирован.
6. Интеграционный merge делает только `AI Lead`.

## Базовый delivery loop

Для любой заметной задачи использовать такой цикл:

1. Intake:
   определить контур `legacy` или `Nomad`, product scope и активные ограничения.
2. Discovery:
   собрать факты, инварианты, существующие документы и риски.
3. Contract first:
   зафиксировать data contract, API contract, acceptance criteria и verification gate.
4. Task split:
   выбрать single-agent или multi-agent и назначить write scopes.
5. Execution:
   выполнить подзадачи малыми вертикальными блоками.
6. Integration:
   собрать изменения, разрешить расхождения и проверить консистентность.
7. Verification:
   выполнить build/test/smoke/manual checks по реальному изменённому scope.
8. Documentation:
   обновить `NOTES.md`, `HANDOFF.md`, README и process docs, если изменилось поведение или правила.
9. Commit:
   делать commit после каждого логического блока.
10. Handoff:
   зафиксировать итог, риски, команды проверки и дальнейшие шаги.

## Merge Policy

Merge допустим, если:

1. есть один интегратор-владелец результата;
2. проверки реально выполнены и перечислены;
3. нет незакрытого конфликта с PRD или `AGENTS.md`;
4. обновлены operating docs, если изменились правила или процесс;
5. change-set остаётся в границах утверждённого scope.

В `Human Review` нужно уводить задачи, если:

1. изменены архитектурные границы;
2. появились новые зависимости;
3. меняется публичный контракт;
4. проверка неполная;
5. возникло сомнение по продуктовой трактовке.

## Система скиллов

### Что считать скиллом

Скилл нужен, если одновременно верны три условия:

1. workflow повторяется;
2. ошибка в нём дорогая или частая;
3. общая модель без локального контекста делает его непредсказуемо.

Не надо делать отдельный скилл, если достаточно:

1. одного абзаца в `AGENTS.md`;
2. короткого checklist в `WORKFLOW*.md`;
3. локального README в конкретном приложении.

### Слои скиллов

В этом репозитории использовать три слоя:

1. `platform skills`:
   общие навыки Codex вроде `playwright`, `figma`, `product-discovery`.
2. `repo operating skills`:
   знания о контурах `Yummy/Nomad`, правилах reuse, handoff и verification.
3. `delivery skills`:
   конкретные repeatable workflows для backend, frontend, QA, release, design-to-code.

Repo-specific skills этого проекта хранятся в `.codex/skills/`.

### Минимальный набор repo-скиллов

Для полного цикла разработки рекомендуется завести или поддерживать такой набор:

1. `yummy-repo-guard`
   правила контуров, active scopes, reuse-policy, документы-источники.
2. `nomad-product-guardrails`
   ключевые продуктовые ограничения `Арома Ателье`, `Мастер`, access-code, analytics semantics.
3. `nomad-backend-delivery`
   backend contracts, build/test/smoke, state/content/update patterns.
4. `nomad-aroma-web-delivery`
   guest flow, UI invariants, build/smoke, mobile-first checks.
5. `nomad-master-web-delivery`
   staff/admin UX, role boundaries, operational checks.
6. `nomad-qa-and-smoke`
   smoke matrix, playwright/manual fallback, артефакты проверок.
7. `nomad-release-ops`
   env matrix, bot/runtime checks, release smoke, rollback notes.
8. `nomad-design-to-code`
   Figma workflow, visual fidelity rules, asset handling.
9. `repo-docs-and-handoff`
   когда и как обновлять `NOTES.md`, `HANDOFF.md`, README и process docs.

### Матрица ролей и скиллов

1. `AI Lead / Integrator`
   - `yummy-repo-guard`
   - `repo-docs-and-handoff`
   - `product-discovery`
2. `System Analyst`
   - `product-discovery`
   - `nomad-product-guardrails`
3. `Backend Worker`
   - `nomad-backend-delivery`
   - `yummy-repo-guard`
4. `Frontend Worker`
   - `nomad-aroma-web-delivery` или `nomad-master-web-delivery`
   - `yummy-repo-guard`
5. `QA Agent`
   - `nomad-qa-and-smoke`
   - `playwright`
6. `DevOps / Release Agent`
   - `nomad-release-ops`
   - `repo-docs-and-handoff`
7. `Design / UX Agent`
   - `figma`
   - `nomad-design-to-code`

### Как проектировать новый скилл

Перед созданием скилла нужно заполнить короткий brief:

1. проблема, которую повторно решает скилл;
2. три реальных примера задач;
3. trigger conditions;
4. входные данные;
5. ожидаемый результат;
6. обязательные проверки;
7. что остаётся вне scope скилла.

Если brief нельзя сформулировать кратко, значит скилл пока преждевременен.

### Lifecycle скилла

1. Identify:
   заметить повторяемую операцию или recurring class of mistakes.
2. Brief:
   описать цель, триггеры и артефакты.
3. Build:
   сделать минимальный `SKILL.md`, а подробности вынести в references/scripts.
4. Validate:
   прогнать минимум на двух реальных задачах внутри репозитория.
5. Adopt:
   сослаться на скилл в process docs или workflow, если он стал стандартом.
6. Review:
   пересматривать после заметных продуктовых или архитектурных изменений.
7. Retire:
   удалять или архивировать, если workflow устарел.

### Правила качества для repo-скиллов

1. В `SKILL.md` хранить только workflow и decision rules, а не длинные справочники.
2. Repo-specific знания не дублировать одновременно в `SKILL.md`, `AGENTS.md` и README без причины.
3. Каждый скилл должен содержать явные trigger conditions.
4. Каждый скилл должен указывать минимальный verification path.
5. Если скилл требует scripts или templates, они должны лежать рядом со скиллом, а не быть разбросаны по репозиторию.
6. Если скилл изменяет operating model, нужно синхронизировать `AGENTS.md` и этот документ.

## RACI для нетривиальной задачи

### Разработка feature slice

1. `AI Lead` — accountable
2. `System Analyst` — responsible за контракт и acceptance criteria
3. `Backend Worker` / `Frontend Worker` — responsible за реализацию
4. `QA Agent` — responsible за verification findings
5. `DevOps Agent` — consulted, если меняется runtime/deploy
6. `Human Reviewer` — required для спорных или рискованных решений

### Создание нового repo-скилла

1. `AI Lead` — accountable
2. `Skill Owner` — responsible за содержимое и актуальность
3. `Domain Reviewer` — consulted по корректности domain knowledge
4. `QA Agent` — consulted по validation path
5. `Human Reviewer` — approves adoption в стандартный процесс

## Минимальная операционная дисциплина

1. Не запускать multi-agent до фиксации контракта и write scopes.
2. Не делать merge нескольких крупных продуктовых решений в одном change-set.
3. Не создавать skill ради одной задачи.
4. Не позволять worker-агентам менять process rules по собственной инициативе.
5. Любое изменение repo-процесса должно отражаться минимум в `NOTES.md` и `HANDOFF.md`.

## Что делать дальше

Текущее состояние:

1. operating model зафиксирован;
2. bootstrap-пакет repo-скиллов уже создан в `.codex/skills/`:
   - `yummy-repo-guard`
   - `nomad-product-guardrails`
   - `nomad-backend-delivery`
   - `nomad-aroma-web-delivery`
   - `nomad-master-web-delivery`
   - `nomad-qa-and-smoke`
   - `nomad-release-ops`
   - `repo-docs-and-handoff`

Рекомендуемый следующий шаг:

1. forward-test каждый скилл минимум на двух реальных задачах;
2. после этого добавлять новые repo-скиллы только под реально повторяющиеся workflows;
3. решить, нужен ли отдельный repo-specific `nomad-design-to-code`, или пока достаточно platform skill `figma`;
4. расширять текущие skeleton’ы reference-файлами и scripts только после реального повторного использования.
