# Yummy Backend

## Local setup

1) Поднять весь локальный контур из корня репозитория:
```
cd /Users/admin/PycharmProjects/yummy
docker compose up -d
```

`docker compose up -d` сам запускает `backend-migrate` и `backend-seed` перед backend/web, поэтому отдельный setup-профиль больше не нужен.

2) Если нужен ML-контур:
```
docker compose --profile ml up -d ml
```

3) Вариант без Docker для backend (локально):
```
npm install
```

4) Configure env:
```
cp .env.example .env
```

5) Run migrations (creates tables):
```
npm run prisma:migrate
```

6) Seed catalog data:
```
npm run seed
```

7) Start API:
```
npm run dev
```

API will be available at `http://localhost:3001`.
Mailpit UI: `http://localhost:8025`.
Catalog updater API: `http://localhost:3011`.

## Catalog updater (отдельный микросервис)

Сервис отвечает только за обновление базы табаков/миксов.

- `GET /health`
- `POST /jobs/refresh`
- `GET /jobs`
- `GET /jobs/:id`

Пример запуска обновления:
```
curl -X POST http://localhost:3011/jobs/refresh \
  -H 'content-type: application/json' \
  -d '{"includeLocalSeeds": false, "includeHookahPortalTobaccos": true, "hookahPortalTobaccosLimit": 2683, "hookahPortalMixesLimit": 1018}'
```

Если в updater задан `UPDATER_API_KEY`, передавайте заголовок `x-api-key`.

Тестовый источник `hookahportal.ru` отключен по умолчанию и требует
`CATALOG_ALLOW_TEST_SOURCES=true` в окружении updater.

CLI для запуска импорта табаков через updater:
```
npm run import:tobaccos
```

## Seeds

Seed files live in `backend/seed/`:
- `tobaccos.json` — tobaccos collected from the listed source services
- `mixes.json` — mixes collected from the listed source services

Current seeds are intentionally minimal while we validate sources.

### Seed sources and assumptions

Tobaccos:
- В текущем тестовом контуре основной источник: HookahPortal (через `catalog-updater`).
- `local-seed` используется только как вспомогательный источник табаков.

Mixes:
- В текущем тестовом контуре источник миксов: HookahPortal (`includeHookahPortalTobaccos=true`).
- `local-seed` для миксов не используется.

Notes:
- Descriptions are short paraphrases of source text.
- Strength values are heuristic and should be replaced by official data if/when published.

Актуальные JSON-артефакты HookahPortal:
- `/Users/admin/PycharmProjects/yummy/services/catalog-updater/cache/hookahportal/tobaccos.json`
- `/Users/admin/PycharmProjects/yummy/services/catalog-updater/cache/hookahportal/mixes.json`

## Auth endpoints

- `POST /auth/magic-link` with `{ "email": "user@example.com" }`
- `POST /auth/verify` with `{ "token": "..." }`
- `POST /auth/refresh` with `{ "refreshToken": "..." }`

## Catalog endpoints

- `GET /manufacturers?search=&limit=&offset=`
- `GET /manufacturers/:id`
- `GET /tobaccos?search=&manufacturerId=&profile=&strengthMin=&strengthMax=&limit=&offset=`
- `GET /tobaccos/:id`

## Mixes

- `GET /mixes?search=&authorId=&isUserMix=&manufacturerId=&manufacturerIds=&tobaccoId=&tobaccoIds=&profile=&profiles=&tag=&tags=&minRating=&sort=&limit=&offset=`
- `GET /mixes/:id`
- `POST /mixes` (auth)

## Sessions

- `GET /sessions?limit=&offset=` (auth)
- `GET /sessions/:id` (auth)
- `POST /sessions` (auth)

## Ratings

- `GET /mix-ratings?mixId=` (auth)
- `GET /mix-ratings/summary?mixId=` (auth)
- `POST /mix-ratings` (auth)

## Preference profile

- `GET /preference-profile` (auth)
- `PUT /preference-profile` (auth)

## Favorites

- `GET /favorites?search=&manufacturerId=&manufacturerIds=&tobaccoId=&tobaccoIds=&profile=&profiles=&tag=&tags=&minRating=&sort=&limit=&offset=` (auth)
- `GET /favorites/ids` (auth)
- `POST /favorites` (auth)
- `DELETE /favorites/:mixId` (auth)

## Recommendations

- `GET /recommendations?limit=` (auth)
- `POST /recommendations/refresh` (auth), body `{ "limit"?: number }`

Response items include `source`:
- `model` — персональная модель;
- `top` — fallback по композитному скору (оценка + число сессий);
- `cold_start` — fallback популярность + онбординг + диверсификация.

## Home rails

- `GET /home/rails` (public, optional auth header for personalized rails)

## ML training

Run offline training (LightFM) and store recommendations:
```
docker compose -f docker-compose.yml --profile ml run --rm ml
```

Optional env for ML service:
- `MODEL_VERSION`
- `TOP_N`
- `EPOCHS`
- `NO_COMPONENTS`

## Production

Build the container:
```
docker build -t yummy-backend .
```

Run with env:
```
docker run --env-file .env -p 3001:3001 yummy-backend
```
