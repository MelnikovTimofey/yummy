# GitHub Labels For Nomad

Этот файл является source of truth для Nomad labels в GitHub.

## Core labels

| Label | Color | Description |
|---|---|---|
| `contour:nomad` | `0E8A16` | PR или issue относится к Nomad parallel track |
| `type:feature` | `1D76DB` | Новый bounded feature slice |
| `type:bug` | `D73A4A` | Баг в Nomad UI, backend или bot |
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

| Label | Color | Description |
|---|---|---|
| `batch:release-foundation` | `C5DEF5` | `Release Foundation` |
| `batch:master-operations` | `BFDADC` | `Master Operations` |
| `batch:analytics-and-rails` | `F9D0C4` | `Analytics And Rails` |
| `batch:quality-and-hardening` | `D4C5F9` | `Quality And Hardening` |
| `batch:aroma-polish` | `F7C6C7` | `Aroma Polish` |

## Manual creation example

Если `gh` настроен, labels можно создать вручную командами вида:

```bash
gh label create "contour:nomad" --color "0E8A16" --description "PR или issue относится к Nomad parallel track"
```

Повторить для остальных labels из таблиц выше.
