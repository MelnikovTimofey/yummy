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

5) Start API:
```
npm run dev
```

API will be available at `http://localhost:3001`.
Mailpit UI: `http://localhost:8025`.

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

- `GET /mixes?authorId=&limit=&offset=` (auth)
- `GET /mixes/:id` (auth)
- `POST /mixes` (auth)

## Sessions

- `GET /sessions?limit=&offset=` (auth)
- `GET /sessions/:id` (auth)
- `POST /sessions` (auth)

## Ratings

- `GET /session-ratings?sessionId=` (auth)
- `POST /session-ratings` (auth)
- `GET /mix-ratings?mixId=` (auth)
- `GET /mix-ratings/summary?mixId=` (auth)
- `POST /mix-ratings` (auth)

## Preference profile

- `GET /preference-profile` (auth)
- `PUT /preference-profile` (auth)

## Recommendations

- `GET /recommendations?limit=` (auth)

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
