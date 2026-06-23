# Nomad Prod Deploy Runbook

Развёртывание всего контура Nomad на одном облачном VPS: `docker compose` +
managed Postgres + Caddy (авто-TLS). Покрывает backend, Арома Ателье, Мастер и
Telegram-бот.

Связанные документы: [`env-matrix.md`](env-matrix.md),
[`deployment-smoke-checklist.md`](deployment-smoke-checklist.md). Файлы контура:
[`docker-compose.prod.yml`](../../docker-compose.prod.yml),
[`Caddyfile`](../../Caddyfile), [`.env.prod.example`](../../.env.prod.example).

## 1. Предусловия (облако — на стороне оператора)

1. **Managed Postgres 16**: БД `nomad`, отдельный юзер, автобэкапы включены,
   доступ к инстансу ограничен IP VPS, подключение `sslmode=require`.
2. **VPS**: 2 vCPU / 4 GB / Ubuntu 22.04+, установлены Docker и docker compose
   plugin. Firewall: наружу только `80`, `443`, SSH.
3. **DNS**: три A-записи на IP VPS — гостевой, мастер и API домены
   (например `nomad.<домен>`, `master.nomad.<домен>`, `api.nomad.<домен>`).

## 2. Конфигурация

```bash
git clone <repo> && cd <repo> && git checkout main
cp .env.prod.example .env
chmod 600 .env
# заполнить .env: домены, ACME_EMAIL, PUBLIC_API_URL=https://<API_DOMAIN>,
# DATABASE_URL (managed PG, sslmode=require),
# NOMAD_AUTOMATION_KEY и NOMAD_TOKEN_SECRET (openssl rand -hex 32, независимые),
# TELEGRAM_BOT_TOKEN.
```

> `PUBLIC_API_URL` зашивается в бандлы фронтов на этапе build. При его смене —
> обязателен пересбор: `docker compose -f docker-compose.prod.yml up -d --build aroma-web master-web`.

## 3. Деплой

```bash
# 1. Backend: сборка + старт. На старте контейнер выполнит `prisma migrate deploy`
#    и создаст схему в managed Postgres (см. apps/nomad-backend/Dockerfile).
docker compose -f docker-compose.prod.yml up -d --build backend
docker compose -f docker-compose.prod.yml logs -f backend   # дождаться health + "migrations applied"

# 2. Продуктовые данные ИЗ СНЭПШОТА напрямую в managed Postgres (data-only).
#    Снэпшот содержит ТОЛЬКО продуктовые таблицы (без staff/auth) — схему уже
#    создал migrate deploy на шаге 1, поэтому restore идёт ПОСЛЕ старта backend.
pg_restore --no-owner --data-only --disable-triggers \
  -d "$DATABASE_URL" snapshots/nomad-product-data.dump
#    → ~11505 табаков (inStock=true) + 15 миксов + 5 prepared-рейлов.
#    Предупреждение `unrecognized configuration parameter "transaction_timeout"`
#    на PG16 безвредно (дамп снят на PG17) — данные восстанавливаются полностью.

# 3. Прод-admin — ТОЛЬКО через bootstrap (НЕ prisma:seed: seed заливает демо-логины).
docker compose -f docker-compose.prod.yml run --rm \
  -e NOMAD_BOOTSTRAP_ADMIN_LOGIN=nomad-admin \
  -e NOMAD_BOOTSTRAP_ADMIN_NAME="Nomad Admin" \
  -e NOMAD_BOOTSTRAP_ADMIN_PASSWORD='<secret>' \
  backend npm run bootstrap:admin

# 4. Фронты (с реальным API-доменом в бандле), бот и proxy.
docker compose -f docker-compose.prod.yml up -d --build aroma-web master-web telegram-bot proxy
```

После старта Caddy сам выпустит TLS-сертификаты для трёх доменов (нужны корректные
DNS A-записи и открытый `80`/`443`).

## 4. Telegram-бот — первичная настройка

> ⚠️ **IPv6 для Telegram (российский хостинг).** В РФ IPv4 до `api.telegram.org`
> заблокирован — доступен только IPv6. Контейнер бота по умолчанию ходит только
> по IPv4 и падает с `ETIMEDOUT` на `getUpdates`. `docker-compose.prod.yml`
> включает IPv6 на сети контура (NAT66), но это требует включённого IPv6 в
> демоне Docker. До старта бота на таком хостинге:
>
> ```bash
> cat > /etc/docker/daemon.json <<'EOF'
> { "ipv6": true, "fixed-cidr-v6": "fd00:d0c:e5::/64", "ip6tables": true, "experimental": true }
> EOF
> systemctl restart docker
> # проверка: контейнер видит Telegram по IPv6
> docker compose -f docker-compose.prod.yml exec telegram-bot \
>   node -e "fetch('https://api.telegram.org').then(r=>console.log('ok',r.status)).catch(e=>console.log('ERR',e.message))"
> ```
>
> Хост должен иметь рабочий IPv6 (`curl -6 https://api.telegram.org` → `302`).

1. Бот поднят (шаг 4) и не в crash-loop: `docker compose -f docker-compose.prod.yml ps`.
2. Завести allowlist по номерам телефонов в backend (source of truth доступа — backend).
3. First-link: пользователь шлёт `share contact` → backend привязывает `chatId`.
4. Проверить `/whoami`, `/code`, `/rotate` в разрешённом чате.

## 5. Rollout smoke

Полный список — [`deployment-smoke-checklist.md`](deployment-smoke-checklist.md). Минимум:

```bash
curl -sS https://<API_DOMAIN>/health                       # status=ok
curl -sS -H 'x-nomad-automation-key: <key>' \
  https://<API_DOMAIN>/automation/daily-code/current        # не 401
```

- Арома Ателье: 18+ → daily code → онбординг → рекомендации → карточка микса.
- Мастер: логин под прод-admin → дашборд, коды доступа, staff, Telegram-чаты, CRUD без client-ошибок.
- Бот: `/whoami`, `/code`, `/rotate` → новый код виден в backend.

## 6. Stop-conditions и откат

Остановить rollout и перейти в incident/rollback, если:

1. backend отдаёт `401` на валидный automation-ключ (рассинхрон токенов бот↔backend);
2. бот не стартует / циклически рестартует;
3. guest flow не доходит до карточки микса;
4. логин в Мастер невозможен после деплоя;
5. `rotate`/daily code ломает активный доступ.

**Откат:**

- данные/схема — восстановить managed Postgres из снэпшота/PITR провайдера
  (снять снэпшот БД ПЕРЕД деплоем — обязательный пред-шаг для рискованных релизов);
- код — `git checkout <предыдущий-tag>` + `docker compose -f docker-compose.prod.yml up -d --build`.

## 7. Обновление релиза

```bash
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
# backend на старте сам накатит новые миграции (migrate deploy).
```

Перед рискованным обновлением (схемные миграции) — снэпшот managed Postgres.
