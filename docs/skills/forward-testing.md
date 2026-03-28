# Forward Testing Protocol For Repo-Specific Skills

## Назначение

Этот документ фиксирует, как валидировать repo-specific skills на реальных задачах, а не только по качеству `SKILL.md`.

## Минимальный protocol

Каждый новый или заметно обновлённый repo-specific skill прогонять минимум на трёх классах задач:

1. `backend slice`
2. `frontend/UI slice`
3. `docs/process slice`

Для каждого прогона фиксировать:

1. какая была задача;
2. какой skill применялся;
3. что skill подсказал полезного;
4. где guidance оказался лишним;
5. где guidance оказался недостаточным;
6. требуется ли update `SKILL.md`, `references/` или `scripts/`.

## Как проводить прогон

1. выбрать реальную задачу внутри репозитория;
2. явно применить релевантный repo-specific skill;
3. выполнить задачу обычным delivery loop;
4. после завершения записать short evaluation;
5. если recurring gap повторился, обновить skill в том же change-set или ближайшим follow-up.

## Правило adoption

Skill считается operationally validated, если:

1. пройдено минимум 3 прогона на разных классах задач;
2. recurring gaps либо закрыты, либо явно описаны;
3. guidance больше помогает, чем шумит.

## Evaluation Template

### Task

- `backend slice | frontend/UI slice | docs/process slice`
- краткое описание:

### Skill Used

- `skill-name`

### What Helped

- `...`

### What Was Too Much

- `...`

### What Was Missing

- `...`

### Required Follow-Up

- `update SKILL.md | update references | add script | no change`
