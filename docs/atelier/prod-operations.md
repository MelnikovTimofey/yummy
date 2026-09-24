# Арома Ателье — Prod Operations (эксплуатация)

> Действующий контур развёрнут 2026-09-24 на TimeWeb Cloud (Новосибирск).
> Прошлый хост (`147.45.146.23`, Москва) удалён 2026-08-11, его IP освобождён.

День-2 инструкция по работе с прод-контуром Арома Ателье: запуск, остановка,
обслуживание, обновление, откат, диагностика. Первичное развёртывание — в
[`prod-deploy-runbook.md`](prod-deploy-runbook.md).

## 0. Координаты и доступ

| Что | Значение |
|---|---|
| Сервер (VPS) | TimeWeb `atelier-prod` (id 9187571), Cloud NSK 50: 2 vCPU / 4 GB / 50 GB, Ubuntu 24.04, nsk-1 |
| IP | `201.24.60.80` (IPv4; IPv6 в nsk-1 провайдер не выдаёт) |
| SSH | порт **49222**, только по ключу, `root` |
| Каталог проекта | `/opt/atelier` (клон репо, `.env` с правами 600) |
| Compose-файл | `docker-compose.prod.yml` (всегда с `--env-file .env`) |
| Сервисы | `db` (Postgres 16), `backend`, `aroma-web`, `master-web`, `telegram-bot`, `proxy` (Caddy) |
| База данных | сервис `db` в том же compose, наружу не публикуется, volume `atelier_pg` |
| Бэкапы | `/opt/atelier/backups`, cron `/etc/cron.d/atelier-pg-backup` (03:30 UTC, 14 дней) |
| Домены | `yummy-aroma-atelier.ru` (гость), `master.` (Мастер), `api.` (backend); DNS в TimeWeb |
| TLS | Let's Encrypt через Caddy, ACME-уведомления на email владельца |
| Firewall | ufw: `49222`, `80`, `443` |

```bash
ssh -p 49222 root@201.24.60.80
cd /opt/atelier
```

> Все команды ниже выполняются из `/opt/atelier`. `dc` для краткости можно
> завести алиасом:
> ```bash
> alias dc='docker compose -f docker-compose.prod.yml --env-file .env'
> ```
> Тогда вместо длинного `docker compose -f ... --env-file .env` — просто `dc`.

## 1. Запуск

```bash
# весь контур (backend + оба фронта + бот + Caddy)
docker compose -f docker-compose.prod.yml --env-file .env up -d

# только этап 1 (backend + бот), без публичных фронтов
docker compose -f docker-compose.prod.yml --env-file .env up -d backend telegram-bot

# поднять ранее остановленные контейнеры (без пересборки)
docker compose -f docker-compose.prod.yml --env-file .env start
```

Backend на старте сам применяет миграции (`prisma migrate deploy`) — отдельного
шага не требуется.

## 2. Остановка

```bash
# остановить всё, контейнеры сохраняются (быстрый рестарт через start)
docker compose -f docker-compose.prod.yml --env-file .env stop

# остановить отдельный сервис
docker compose -f docker-compose.prod.yml --env-file .env stop telegram-bot

# полностью снести контейнеры и сеть (volume'ы, в т.ч. atelier_pg, НЕ трогаются)
docker compose -f docker-compose.prod.yml --env-file .env down
```

`stop` против `down`: `stop` — пауза (контейнеры остаются), `down` — удаление
контейнеров и docker-сети. Данные не теряются ни в том, ни в другом случае
(БД, состояние бота и Caddy — в named volumes). **Никогда** не запускать
`down -v`: он удалит volume `atelier_pg` вместе с базой.

## 3. Статус, логи, здоровье

```bash
# статус контейнеров
docker compose -f docker-compose.prod.yml --env-file .env ps

# логи (живой поток / последние строки)
docker compose -f docker-compose.prod.yml --env-file .env logs -f backend
docker compose -f docker-compose.prod.yml --env-file .env logs --tail=100 telegram-bot

# health backend (порт наружу не опубликован — изнутри контейнера)
docker compose -f docker-compose.prod.yml --env-file .env exec backend \
  node -e "fetch('http://127.0.0.1:3021/health').then(r=>r.text()).then(console.log)"

# публичные проверки (с любой машины; на сервере — через --resolve)
curl -sS https://api.yummy-aroma-atelier.ru/health
curl -sS -o /dev/null -w 'aroma %{http_code}\n'  https://yummy-aroma-atelier.ru/
curl -sS -o /dev/null -w 'master %{http_code}\n' https://master.yummy-aroma-atelier.ru/
```

## 4. Обновление (выкатка новой версии)

```bash
cd /opt/atelier
git pull origin main

# пересобрать и перезапустить изменённые сервисы
docker compose -f docker-compose.prod.yml --env-file .env up -d --build

# точечно — только нужный сервис:
docker compose -f docker-compose.prod.yml --env-file .env up -d --build backend
```

- **Миграции схемы** накатываются автоматически при рестарте backend
  (`prisma migrate deploy`). Перед рискованной миграцией — снять снэпшот БД (см. §6).
- **Смена `PUBLIC_API_URL`/домена** требует пересборки фронтов (`--build`), т.к.
  URL зашивается в бандл.
- **Смена `.env`** (секреты, домены) — затем `up -d` (compose пересоздаст
  контейнеры с новым окружением).

## 5. Перезапуск одного сервиса

```bash
docker compose -f docker-compose.prod.yml --env-file .env restart backend
docker compose -f docker-compose.prod.yml --env-file .env restart telegram-bot
```

## 6. Обслуживание

### Бэкап БД
Ночной `pg_dump` ставит cron (см. [`prod-deploy-runbook.md`](prod-deploy-runbook.md) §8).
Внеплановый дамп перед рискованными изменениями:
```bash
docker compose -f docker-compose.prod.yml --env-file .env exec -T db \
  pg_dump -U atelier -Fc atelier > backups/atelier-$(date +%F-%H%M).dump
```
Дампы лежат на том же VPS — периодически забирать свежий к себе:
```bash
scp -P 49222 root@201.24.60.80:/opt/atelier/backups/atelier-<дата>.dump .
```

### Снэпшот только продуктовых данных / restore
Снэпшот лежит в репо: `snapshots/atelier-product-data.dump` (data-only, 5 таблиц).
Грузится в БД, где схему уже создал `migrate deploy`:
```bash
docker compose -f docker-compose.prod.yml --env-file .env exec -T db \
  pg_restore -U atelier -d atelier --no-owner --data-only --disable-triggers \
  < snapshots/atelier-product-data.dump
```

### Daily-код доступа (гость) и Telegram-allowlist
Управляются из «Мастера» (вход `admin`) или ботом (`/rotate`). Не редактировать
напрямую в БД без необходимости.

> ⚠️ На пустой базе backend при первом обращении засевает демо-учётки
> `admin/admin`, `atelier/atelier` и daily code `1234`. На этом хосте они
> обезврежены: `admin` перезаписан через bootstrap, `atelier` и `1234`
> деактивированы. При развёртывании на новую пустую БД — сделать bootstrap
> `admin` **до** запуска `proxy`.

### Создание/сброс staff-аккаунта
```bash
docker compose -f docker-compose.prod.yml --env-file .env run --rm \
  -e ATELIER_BOOTSTRAP_ADMIN_LOGIN=<login> \
  -e ATELIER_BOOTSTRAP_ADMIN_NAME="<name>" \
  -e ATELIER_BOOTSTRAP_ADMIN_PASSWORD='<secret>' \
  backend npx -y tsx scripts/bootstrap-admin.ts
```
(в прод-образе нет `tsx` как dev-зависимости — запуск через `npx -y tsx`.)

### Очистка диска (Docker копит слои/кэш)
```bash
docker system df            # сколько занято
docker system prune -f      # убрать висячие образы/кэш (volume'ы не трогает)
```

### TLS-сертификаты
Выпускаются и продлеваются Caddy автоматически (Let's Encrypt). Ручных действий
не требуется. Диагностика — в логах `proxy`.

## 7. Откат

```bash
cd /opt/atelier
git log --oneline -5                 # найти предыдущий рабочий коммит/тег
git checkout <commit-или-tag>
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```
Если откат затрагивает схему — восстановить БД из дампа, снятого **до**
проблемного деплоя (runbook §8). Вернуться на актуальный код: `git checkout main`.

## 8. Диагностика частых проблем

| Симптом | Причина / решение |
|---|---|
| `backend` не стартует, `P1000 auth failed` | `POSTGRES_PASSWORD` в `.env` не совпадает с паролем, с которым volume `atelier_pg` инициализирован; проверить `docker compose ... exec db psql -U atelier -d atelier` |
| `telegram-bot` `getUpdates ETIMEDOUT` | IPv4 до Telegram заблокирован в РФ, а в nsk-1 нет IPv6. На этом хосте бот **не запущен** — нужен обходной путь (IPv6-хост или прокси для Telegram API через `ATELIER_TELEGRAM_API_BASE_URL`) |
| фронт отдаёт `403 Blocked request ... host not allowed` | домен не в `ATELIER_ALLOWED_HOSTS`; проверить `AROMA_DOMAIN`/`MASTER_DOMAIN` в `.env`, пересобрать фронт |
| Caddy не выпускает TLS | DNS не указывает на `201.24.60.80`, либо `80`/`443` недоступны снаружи; логи `proxy` |
| внешний доступ «висит» (рукопожатие ок, данных нет) | провайдерская inbound-фильтрация на IP; крайняя мера — сменить публичный IP |
| нет SSH | порт **49222**, ключ-only; fallback — веб-консоль провайдера |

## 9. Связанные документы
- [`prod-deploy-runbook.md`](prod-deploy-runbook.md) — первичное развёртывание с нуля.
- [`env-matrix.md`](env-matrix.md) — полный набор переменных окружения.
- [`deployment-smoke-checklist.md`](deployment-smoke-checklist.md) — smoke после деплоя.
