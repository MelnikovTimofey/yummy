FROM node:20-alpine

WORKDIR /app

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

EXPOSE 3011
CMD ["npm", "run", "start"]
