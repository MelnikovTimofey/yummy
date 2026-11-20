# Film Noir в Claude Design

Копия канона для мокапов: Design System «Арома Ателье, Film Noir» в Claude Design —
<https://claude.ai/artifact/Yc3x4uuiQd3tyCLquyFdQF>. На ней собираются холсты фич
(`atelier-feature-design`). Сама с репозиторием она не синхронизируется: после правки
токенов, компонентов или `readme.md` скилла `aroma-atelier-design` её пересобирают.

## Из чего собрана

| В системе | Откуда |
|---|---|
| `tokens.json`, `tokens.css` | `packages/design-tokens/*.css`: цвета, шкалы, тени, шрифтовые стеки |
| `components/bundle.css` | то, что токенами не выражается: градиенты, `env()`, составные значения, анимации, `base.css` скилла |
| `components/bundle.js`, `components/<Имя>/` | `_ds_bundle.js` скилла без UI-китов, `.prompt.md` → `README.md`, `.d.ts`, превью — примеры в `build.mjs` |
| `README.md` | `readme.md` скилла: тексты, визуальные основы, иконки, знак |
| `ui_kits/` | UI-киты скилла как файлы |
| `components/Cover/preview.html` | `cover.html` |
| ассеты Logos и Photos | `assets/*.svg` скилла и `apps/aroma-web/public/photos/*-sheet.webp` |

## Пересобрать

```bash
node packages/design-tokens/claude-design/build.mjs /tmp/atelier-ds
```

В `/tmp/atelier-ds/project/` — файлы системы, в `/tmp/atelier-ds/uploads/` — логотипы и
фото для загрузки ассетами. Опубликовать изменённые файлы — попросить Claude Code
обновить систему по ссылке выше: он читает индекс `project/design-system.json`, шлёт
только изменённые файлы под `project/` и, если появились новые фото, загружает их
ассетами и дописывает в индекс. Индекс скрипт не пишет: в нём id загруженных ассетов.
