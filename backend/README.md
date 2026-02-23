# Yummy Backend

## Local setup

1) Start Postgres + Mailpit:
```
docker compose -f docker-compose.yml up -d
```

2) Install dependencies:
```
npm install
```

3) Configure env:
```
cp .env.example .env
```

4) Run migrations (creates tables):
```
npm run prisma:migrate
```

5) Seed catalog data:
```
npm run seed
```

6) Start API:
```
npm run dev
```

API will be available at `http://localhost:3001`.
Mailpit UI: `http://localhost:8025`.

## Seeds

Seed files live in `backend/seed/`:
- `tobaccos.json` — tobaccos collected from the listed source services
- `mixes.json` — mixes collected from the listed source services

Current seeds are intentionally minimal while we validate sources.

### Seed sources and assumptions

Tobaccos:
- MustHave catalog and product pages are the only source for MustHave flavors.
- Deus Perfume page is the only source for Deus flavors.

Mixes:
- MustHave mixes page is the only source for seeded mixes.

Notes:
- Descriptions are short paraphrases of source text.
- Strength values are heuristic and should be replaced by official data if/when published.

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
