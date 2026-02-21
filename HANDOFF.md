# HANDOFF — Yummy / Вкусно

## 1) Текущий статус

- Проект: mobile web MVP (`YummyWeb`) + backend (Fastify + Prisma + Postgres) + ML-сервис (LightFM, offline).
- В web MVP реализованы рабочие экраны: вход по magic link, миксы, сессии, каталог.
- Экран рекомендаций находится в активной доработке под новую продуктовую логику fallback.

## 2) Последние коммиты (ключевые)

- `c9a086c` docs(prd): add ui ux invariants from implementation feedback
- `15350ef` fix(expo-ui): add back action and safe area inset for create mix
- `66f5d47` fix(expo-ui): separate mix creation and stabilize sessions layout
- `e764d39` fix(expo-ui): stabilize bottom tabs and list spacing on mixes and sessions
- `abd8b55` feat: update seeds, backend schema and recommendation flow docs

## 3) Важные продуктовые правила (зафиксированы)

См. `PRD.md`, разделы `4.7` и `4.8`:
- safe-area обязателен (верх/низ), без залезания под камеру/Dynamic Island;
- на полноэкранных экранах создания/выбора есть явный `Назад/Закрыть`;
- `Создать микс` — отдельный экран;
- выбор микса для сессии — отдельный экран;
- в карточках миксов/сессий — пользовательская и средняя оценка;
- таб-бар снизу, без обрезания подписей.
- приоритет рекомендаций: модель пользователя -> fallback по композитному скору (оценки + число сессий) -> cold start fallback (популярность + онбординг + диверсификация).

## 4) Незакоммиченные изменения на момент handoff

- `YummyExpo/src/data/api/config.ts` (локальный IP API на устройстве)
- `NOTES.md` (черновые продуктовые заметки)

## 5) Что запускать локально

### Backend

```bash
cd backend
docker compose -f docker-compose.yml up -d
npm install
cp .env.example .env
npm run prisma:migrate
npm run seed
npm run dev
```

- API: `http://localhost:3001`
- Mailpit UI: `http://localhost:8025`

### Web app (MVP)

```bash
cd YummyWeb
npm install
npm run dev
```

Важно: в `YummyWeb/.env.local` укажите `VITE_API_BASE_URL`, если backend не на `http://localhost:3001`.

## 6) Что осталось по продукту (ближайшее)

Источник: `NOTES.md`

1. Элемент списка микса: краткое описание + табаки с пропорциями.
2. Фильтры миксов: мои/бренд/табак/профиль вкуса.
3. Карточка микса.
4. Полная карточка создания микса (UX polishing).
5. Расширение каталога табаков.
6. Карточка создания сессии (UX polishing).
7. Переход из рекомендаций в создание сессии.
8. Обновление рекомендаций из UI (триггер/refresh сценарий).

## 7) Технические риски / что проверить в первую очередь

- Проверка safe-area на iPhone с активным звонком/диктофоном (динамически меняется верхний inset).
- Проверка e2e сценария авторизации через magic link на реальном устройстве.
- Проверка, что сиды и миграции применены и API отдает данные в ожидаемом формате.

## 8) Рекомендуемый старт в новом чате

Передать это сообщение:

```text
Проект: /Users/admin/PycharmProjects/yummy
Прочитай AGENTS.md, PRD.md, HANDOFF.md и продолжи с пункта <N> из HANDOFF.md раздел 6.
Текущий backend: <state>, текущий API IP: <value из config.ts>.
```
