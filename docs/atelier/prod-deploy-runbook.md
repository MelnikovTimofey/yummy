# Арома Ателье — Prod Deploy Runbook

> Действующий контур и его координаты — [`prod-operations.md`](prod-operations.md).
> Пути в примерах — `/opt/atelier`.

Развёртывание всего контура Арома Ателье на одном облачном VPS: `docker compose` +
Postgres в том же контуре + Caddy (авто-TLS). Покрывает backend, Арома Ателье,
Мастер и Telegram-бот.

Связанные документы: [`env-matrix.md`](env-matrix.md),
[`deployment-smoke-checklist.md`](deployment-smoke-checklist.md). Файлы контура:
[`docker-compose.prod.yml`](../../docker-compose.prod.yml),
[`Caddyfile`](../../Caddyfile), [`.env.prod.example`](../../.env.prod.example).

## 1. Предусловия (облако — на стороне оператора)

1. **VPS**: 2 vCPU / 4 GB / Ubuntu 24.04, установлены Docker и docker compose
   plugin (`docker.io`, `docker-compose-v2`), swap 2 GB под сборку образов.
   Firewall: наружу только `80`, `443`, SSH (не на 22, вход только по ключу).
   Postgres наружу не публикуется — живёт в сети compose, данные в volume
   `atelier_pg`.
2. **DNS**: три A-записи на IP VPS — гостевой, мастер и API домены
   (например `atelier.<домен>`, `master.atelier.<домен>`, `api.atelier.<домен>`).

## 2. Конфигурация

```bash
git clone <repo> && cd <repo> && git checkout main
cp .env.prod.example .env
chmod 600 .env
# заполнить .env: домены, ACME_EMAIL, PUBLIC_API_URL=https://<API_DOMAIN>,
# POSTGRES_PASSWORD, ATELIER_AUTOMATION_KEY и ATELIER_TOKEN_SECRET
# (openssl rand -hex 32, три независимых значения), TELEGRAM_BOT_TOKEN.
```

> `PUBLIC_API_URL` зашивается в бандлы фронтов на этапе build. Прод-образы
> собирает CI (`.github/workflows/atelier-images.yml`) с адресами из `env` workflow —
> при смене домена поправить их там. Ниже первичный деплой собирает образы на
> хосте (`--build`); дальнейшие выкатки — `scripts/atelier/deploy.sh`
> (`prod-operations.md` §4).

## 3. Деплой

```bash
# 1. Postgres + backend: сборка + старт. На старте backend выполнит
#    `prisma migrate deploy` и создаст схему (см. apps/backend/Dockerfile).
docker compose -f docker-compose.prod.yml up -d --build db backend
docker compose -f docker-compose.prod.yml logs -f backend   # дождаться health + "migrations applied"

# 2. Продуктовые данные ИЗ СНЭПШОТА (data-only) через контейнер db.
#    Снэпшот содержит ТОЛЬКО продуктовые таблицы (без staff/auth) — схему уже
#    создал migrate deploy на шаге 1, поэтому restore идёт ПОСЛЕ старта backend.
#    Юзер atelier — владелец БД в своём контейнере, --disable-triggers работает.
docker compose -f docker-compose.prod.yml exec -T db \
  pg_restore -U atelier -d atelier --no-owner --data-only --disable-triggers \
  < snapshots/atelier-product-data.dump
#    → ~11505 табаков (inStock=true) + 15 миксов + 5 prepared-рейлов.

# 3. Прод-admin — ТОЛЬКО через bootstrap (НЕ prisma:seed: seed заливает демо-логины).
docker compose -f docker-compose.prod.yml run --rm \
  -e ATELIER_BOOTSTRAP_ADMIN_LOGIN=atelier-admin \
  -e ATELIER_BOOTSTRAP_ADMIN_NAME="Ателье Admin" \
  -e ATELIER_BOOTSTRAP_ADMIN_PASSWORD='<secret>' \
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

> **Хост без IPv6** (например, TimeWeb nsk-1) — вместо NAT66 включить сервис
> `telegram-tunnel`: SSH-туннель до `api.telegram.org:443` через хост вне РФ.
>
> ```bash
> # на хосте вне РФ (один раз): пользователь без shell, ключ умеет только этот форвард
> useradd -m -s /usr/sbin/nologin tgtunnel
> install -d -m 700 -o tgtunnel -g tgtunnel /home/tgtunnel/.ssh
> echo 'restrict,port-forwarding,permitopen="api.telegram.org:443",command="/bin/false" <pubkey>' \
>   > /home/tgtunnel/.ssh/authorized_keys
> chown tgtunnel:tgtunnel /home/tgtunnel/.ssh/authorized_keys && chmod 600 /home/tgtunnel/.ssh/authorized_keys
>
> # на прод-хосте
> install -d -m 700 secrets/telegram-tunnel
> ssh-keygen -q -t ed25519 -N '' -C telegram-tunnel -f secrets/telegram-tunnel/id_ed25519
> ssh-keyscan -p <port> <хост> > secrets/telegram-tunnel/known_hosts   # сверить отпечаток!
> # в .env: COMPOSE_PROFILES=tg-tunnel, TG_TUNNEL_TARGET=tgtunnel@<хост>, TG_TUNNEL_PORT=<port>
> docker compose -f docker-compose.prod.yml up -d --build telegram-tunnel telegram-bot
> ```

1. Бот поднят (шаг 4) и не в crash-loop: `docker compose -f docker-compose.prod.yml ps`.
2. Завести allowlist по номерам телефонов в backend (source of truth доступа — backend).
3. First-link: пользователь шлёт `share contact` → backend привязывает `chatId`.
4. Проверить `/whoami`, `/code`, `/rotate` в разрешённом чате.

## 5. Rollout smoke

Полный список — [`deployment-smoke-checklist.md`](deployment-smoke-checklist.md). Минимум:

```bash
curl -sS https://<API_DOMAIN>/health                       # status=ok
curl -sS -H 'x-atelier-automation-key: <key>' \
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

- данные/схема — восстановить БД из последнего часового дампа (см. §8) или из бэкапа диска
  VPS (снять `pg_dump` ПЕРЕД деплоем — обязательный пред-шаг для рискованных релизов);
- код — `DEPLOY_TAG=<sha> scripts/atelier/deploy.sh` (образы предыдущего коммита из GHCR, `prod-operations.md` §7).

## 7. Обновление релиза

```bash
cd /opt/atelier
scripts/atelier/deploy.sh   # git pull + готовые образы из GHCR, см. prod-operations.md §4
# backend на старте сам накатит новые миграции (migrate deploy).
```

Перед рискованным обновлением (схемные миграции) — внеплановый дамп (§8).

## 8. Бэкапы Postgres

`pg_dump` каждый час в :30 UTC шифруется `age` и пишется на хост в
`/opt/atelier/backups`, оттуда копируется в S3 TimeWeb в **другом регионе**
(`ru-1`, Санкт-Петербург):

| Где | Что | Сколько хранится |
|---|---|---|
| S3 `hourly/atelier-<дата>T<час>.dump.age` | каждый часовой дамп | 2 дня видны, версии — 30 дней |
| S3 `daily/atelier-<дата>.dump.age` | дамп 03:30 UTC | 30 дней |
| хост `backups/atelier-<дата>T<час>.dump.age` | часовые | 24 часа |
| хост `backups/atelier-<дата>.dump.age` | дневные | 14 дней |

Защита от того, кто захватил хост:

- **Object Lock** бакета в режиме GOVERNANCE на 30 дней: ключ с хоста (уровень
  «Чтение и запись») может спрятать дамп маркером удаления или записать поверх, но
  версии остаются и до конца срока не удаляются. Снять блокировку раньше может только
  основной ключ аккаунта — на хосте его нет.
- **Жизненный цикл** бакета (`scripts/atelier/s3-backup-lifecycle.json`) убирает
  старые дампы сам, скрипты в S3 ничего не удаляют.
- **Шифрование** на два ключа из `secrets/backup-age.recipients`: ключ владельца
  (приватная часть только у владельца, вне хоста) и ключ хоста
  `secrets/backup-age.key` — им `pg-restore-check.sh` расшифровывает дамп. Утечка
  бакета или S3-ключа не раскрывает базу; при потере хоста дамп расшифровывается
  ключом владельца.

Сроки на хосте — переменные `BACKUP_*` в `.env.backup` (`env-matrix.md` §5a), в S3 —
Object Lock и жизненный цикл бакета. Потеря сервера стоит не больше часа данных. По
понедельникам в 04:00 UTC `pg-restore-check.sh` расшифровывает последний часовой
дамп из S3, поднимает его во временном `postgres:16` и проверяет, что `Tobacco`,
`Mix`, `StaffAccount`, `_prisma_migrations` не пустые. Лог обоих скриптов —
`/var/log/atelier-backup.log`.

Установка один раз:

1. **Владелец, у себя:** `brew install age && age-keygen -o atelier-backup-owner.key`.
   Файл ключа — в менеджер паролей, на хост не класть. Публичный ключ (`age1…`,
   строка `Public key` в выводе) не секрет.
2. **Панель TimeWeb, бакет `atelier-backups-locked` в `ru-1`** (приватный, класс
   «Стандартный»; прежний `atelier-backups` был без блокировки — удалить его, когда в
   новом накопятся дневные дампы за 30 дней):
   - «Блокировка объектов» → включить, режим GOVERNANCE, 30 дней.
     Необратимо: отключить блокировку и версионирование потом нельзя.
   - «Жизненный цикл» — правила из `scripts/atelier/s3-backup-lifecycle.json`:
     `hourly/` удалить через 2 дня, `daily/` — через 30, нетекущие версии обоих —
     через 1 день.
   - «Пользователи» → дополнительный пользователь с уровнем «Чтение и запись» на этот
     бакет. Его ключи — в `.env.backup` на хост. Основной ключ аккаунта на хосте не
     хранится.
3. **Хост:**

```bash
cd /opt/atelier
apt-get install -y age
mkdir -p secrets && chmod 700 secrets
age-keygen -o secrets/backup-age.key
{ echo '<публичный ключ владельца age1…>'; age-keygen -y secrets/backup-age.key; } > secrets/backup-age.recipients
# .env.backup: BACKUP_S3_* из env-matrix.md §5a, BACKUP_S3_BUCKET=atelier-backups-locked,
# ключи — дополнительного пользователя
chmod 600 .env.backup secrets/backup-age.* backups/*
cp scripts/atelier/pg-backup.cron /etc/cron.d/atelier-pg-backup
scripts/atelier/pg-backup.sh
scripts/atelier/pg-restore-check.sh
```

Проверка защиты — удалить свежую версию ключом с хоста должно быть нельзя даже с обходом
блокировки. Без `--bypass-governance-retention` отказ получит и основной ключ аккаунта, так
что такая проверка не отличит его от ключа «Чтение и запись». Ключ с хоста к тому же не
должен видеть старый бакет `atelier-backups`. Подоболочка и `trap - ERR` — чтобы обработчик
ошибок `backup-lib.sh` не печатал `FAILED` на ожидаемый отказ:

```bash
( . scripts/atelier/backup-lib.sh; trap - ERR
  key=hourly/$(s3_list hourly | head -1)
  version=$(aws_cli s3api head-object --bucket "$BACKUP_S3_BUCKET" --key "$key" --query VersionId --output text)
  aws_cli s3api delete-object --bucket "$BACKUP_S3_BUCKET" --key "$key" --version-id "$version" \
    --bypass-governance-retention )
# ожидается AccessDenied
```

Восстановление целиком (схема + данные), из `/opt/atelier`:

```bash
# если дампа на хосте нет — скачать из S3 (список: s3_list hourly / s3_list daily)
. scripts/atelier/backup-lib.sh && s3 cp s3://$BACKUP_S3_BUCKET/hourly/atelier-<дата>T<час>.dump.age /backups/

docker compose -f docker-compose.prod.yml --env-file .env stop backend telegram-bot
age -d -i secrets/backup-age.key backups/atelier-<дата>T<час>.dump.age \
  | docker compose -f docker-compose.prod.yml --env-file .env exec -T db \
    pg_restore -U atelier -d atelier --clean --if-exists --no-owner
docker compose -f docker-compose.prod.yml --env-file .env start backend telegram-bot
```

Хост потерян — дамп скачивается из S3 основным ключом аккаунта и расшифровывается
ключом владельца: `age -d -i atelier-backup-owner.key <файл>.dump.age > <файл>.dump`.
