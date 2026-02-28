FROM node:20-bookworm-slim AS build

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY services/catalog-updater/package*.json ./services/catalog-updater/
WORKDIR /app/services/catalog-updater
RUN npm ci

WORKDIR /app
COPY backend/prisma ./backend/prisma
COPY backend/seed ./backend/seed
COPY services/catalog-updater ./services/catalog-updater

WORKDIR /app/services/catalog-updater
RUN npm run prisma:generate
RUN npm run build

FROM node:20-bookworm-slim

WORKDIR /app/services/catalog-updater

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY services/catalog-updater/package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/services/catalog-updater/dist ./dist
COPY --from=build /app/services/catalog-updater/scripts ./scripts
COPY --from=build /app/services/catalog-updater/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/backend/prisma /app/backend/prisma
COPY --from=build /app/backend/seed /app/backend/seed

EXPOSE 3011
CMD ["npm", "run", "start"]
