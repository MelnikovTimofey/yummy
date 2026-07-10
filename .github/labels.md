# GitHub Labels для Арома Ателье

Этот файл — source of truth для labels репозитория.

## Core labels

| Label | Color | Description |
|---|---|---|
| `type:feature` | `1D76DB` | Новый bounded feature slice |
| `type:bug` | `D73A4A` | Баг в UI, backend или боте |
| `type:ops` | `5319E7` | Env, deploy, runtime, bot или release задача |
| `type:docs` | `006B75` | Документация, workflow, process или handoff change |

## Scope labels

| Label | Color | Description |
|---|---|---|
| `scope:aroma-web` | `B60205` | `apps/aroma-web` |
| `scope:master-web` | `FBCA04` | `apps/master-web` |
| `scope:backend` | `0E8A16` | `apps/backend` |
| `scope:telegram-bot` | `1D76DB` | `services/telegram-bot` |
| `scope:repo-ops` | `5319E7` | `.github`, process docs, workflow, skills |

## Risk labels

| Label | Color | Description |
|---|---|---|
| `risk:human-review` | `D93F0B` | PR требует явного human review |
| `risk:safe` | `0E8A16` | Изменение локально и безопасно по текущим правилам |

## Batch labels

Каждый батч дублируется milestone'ом (см. GitHub → Milestones) — метка помечает
issue/PR, milestone даёт группировку и burndown.

| Label | Milestone | Color |
|---|---|---|
| `batch:release-foundation` | Release Foundation | `C5DEF5` |
| `batch:master-operations` | Master Operations | `BFDADC` |
| `batch:analytics-and-rails` | Analytics And Rails | `F9D0C4` |
| `batch:quality-and-hardening` | Quality And Hardening | `D4C5F9` |
| `batch:aroma-polish` | Aroma Polish | `F7C6C7` |

## Legacy labels (не навешивать на новые issue/PR)

| Label | Причина |
|---|---|
| `contour:nomad` | Концепт «parallel track» рядом с legacy Yummy устарел после split (CLAUDE.md §6): контур один — Арома Ателье. Метка сохранена только на исторических PR #2–#5. |

## Ручное создание

Если `gh` настроен, labels создаются командами вида:

```bash
gh label create "type:feature" --color "1D76DB" --description "Новый bounded feature slice"
```

Повторить для остальных labels из таблиц выше.
