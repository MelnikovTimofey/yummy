# syntax=docker/dockerfile:1.6
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json vite.config.ts index.html components.json ./
COPY public ./public
COPY src ./src
ARG VITE_API_BASE_URL
ARG VITE_AROMA_WEB_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_AROMA_WEB_URL=$VITE_AROMA_WEB_URL
RUN npm run build

FROM caddy:2.11.7-alpine AS runtime
COPY static.Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
EXPOSE 4175
