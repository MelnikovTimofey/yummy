# HANDOFF — Yummy / Вкусно

## 1) Текущий статус

- Проект: mobile web MVP (`YummyWeb`) + backend (Fastify + Prisma + Postgres) + ML-сервис (LightFM, offline).
- В web MVP реализованы рабочие экраны: вход по magic link, миксы, сессии, каталог, подборка, профиль.
- В подборке реализован реальный backend-refresh (`POST /recommendations/refresh`), добавление в сессию и оценка микса.
- В профиле реализовано редактирование `preference-profile` (liked/disliked профили + любимые бренды) с автообновлением подборки.

## 2) Последние коммиты (ключевые)

- `d57902d` feat(recommendations): add backend refresh endpoint and fix backend build
- `85b1c75` feat(web-mvp): add profile preferences and recommendation refresh trigger
- `7dd64a4` feat(recommendations): add web recommendations flow and backend fallback tiers
- `18f8611` docs(prd): define recommendation screen fallback hierarchy
- `c502966` feat(web-mvp): add sessions screen with create and rating flow

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

- Нет (рабочие изменения закоммичены).

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

1. Фильтры миксов: мои/бренд/табак/профиль вкуса.
2. Карточка микса (детальная).
3. Полная карточка создания микса (UX polishing).
4. Расширение каталога табаков.
5. Карточка создания сессии (UX polishing).
6. UX улучшение подборки (decision-flow, свайпы/быстрые действия).
7. E2E smoke-checklist и сценарии регресса для web MVP.

## 7) Технические риски / что проверить в первую очередь

- Проверка safe-area на iPhone с активным звонком/диктофоном (динамически меняется верхний inset).
- Проверка e2e сценария авторизации через magic link на реальном устройстве.
- Проверка, что сиды и миграции применены и API отдает ожидаемые поля (`source` в рекомендациях, корректный refresh).

## 8) Рекомендуемый старт в новом чате

Передать это сообщение:

```text
Проект: /Users/admin/PycharmProjects/yummy
Прочитай AGENTS.md, PRD.md, HANDOFF.md и продолжи с пункта <N> из HANDOFF.md раздел 6.
Текущий backend: рекомендации обновляются через POST /recommendations/refresh, web MVP в YummyWeb.
```
