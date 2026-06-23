# Арома Ателье — Prod Operations (эксплуатация)

День-2 инструкция по работе с прод-контуром Арома Ателье: запуск, остановка,
обслуживание, обновление, откат, диагностика. Первичное развёртывание — в
[`prod-deploy-runbook.md`](prod-deploy-runbook.md).

## 0. Координаты и доступ

| Что | Значение |
|---|---|
| Сервер (VPS) | `147.45.146.23`, SSH **порт 49222**, только по ключу |
| Каталог проекта | `/opt/nomad-yummy` |
| Compose-файл | `docker-compose.prod.yml` (всегда с `--env-file .env`) |
| Сервисы | `backend`, `aroma-web`, `master-web`, `telegram-bot`, `proxy` (Caddy) |
| База данных | managed Postgres (внешняя), приватно `192.168.0.4:5432`, БД `default_db` |
| Домены | `yummy-aroma-atelier.ru` (гость), `master.` (Мастер), `api.` (backend) |

```bash
ssh -p 49222 root@147.45.146.23
cd /opt/nomad-yummy
```

> Все команды ниже выполняются из `/opt/nomad-yummy`. `dc` для краткости можно
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

# полностью снести контейнеры и сеть (volume'ы и managed PG НЕ трогаются)
docker compose -f docker-compose.prod.yml --env-file .env down
```

`stop` против `down`: `stop` — пауза (контейнеры остаются), `down` — удаление
контейнеров и docker-сети. Данные не теряются ни в том, ни в другом случае
(БД внешняя, состояние бота и Caddy — в named volumes).

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
cd /opt/nomad-yummy
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

### Бэкап БД (managed PG)
Автобэкапы — на стороне Timeweb (проверь, что включены + PITR). Ручной снэпшот
перед рискованными изменениями — в панели managed PG или через `pg_dump`:
```bash
# пароль БД из .env (DATABASE_URL). Дамп всей базы:
PGPASSWORD='<пароль>' pg_dump -h 192.168.0.4 -U gen_user -d default_db -Fc \
  -f /root/nomad-$(date +%F).dump
```

### Снэпшот только продуктовых данных / restore
Снэпшот лежит в репо: `snapshots/nomad-product-data.dump` (data-only, 5 таблиц).
Восстановление в managed PG — **в порядке FK, без `--disable-triggers`**
(у `gen_user` нет прав суперюзера):
```bash
PGPASSWORD='<пароль>' pg_restore --no-owner --data-only \
  -h 192.168.0.4 -U gen_user -d default_db \
  -t Tobacco -t Mix -t Rail snapshots/nomad-product-data.dump
PGPASSWORD='<пароль>' pg_restore --no-owner --data-only \
  -h 192.168.0.4 -U gen_user -d default_db \
  -t MixComponent -t RailMix snapshots/nomad-product-data.dump
```

### Daily-код доступа (гость) и Telegram-allowlist
Управляются из «Мастера» (вход `nomad-admin`) или ботом (`/rotate`). Не редактировать
напрямую в БД без необходимости.

### Создание/сброс staff-аккаунта
```bash
docker compose -f docker-compose.prod.yml --env-file .env run --rm \
  -e NOMAD_BOOTSTRAP_ADMIN_LOGIN=<login> \
  -e NOMAD_BOOTSTRAP_ADMIN_NAME="<name>" \
  -e NOMAD_BOOTSTRAP_ADMIN_PASSWORD='<secret>' \
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
cd /opt/nomad-yummy
git log --oneline -5                 # найти предыдущий рабочий коммит/тег
git checkout <commit-или-tag>
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```
Если откат затрагивает схему — восстановить БД из снэпшота/PITR managed PG,
снятого **до** проблемного деплоя. Вернуться на актуальный код: `git checkout main`.

## 8. Диагностика частых проблем

| Симптом | Причина / решение |
|---|---|
| `backend` не стартует, `P1000 auth failed` | неверный `DATABASE_URL`/пароль в `.env`; проверить `psql -h 192.168.0.4 -U gen_user -d default_db` |
| `telegram-bot` `getUpdates ETIMEDOUT` | IPv4 до Telegram заблокирован в РФ — нужен IPv6: `daemon.json` (`ipv6`+`ip6tables`) + IPv6-сеть в compose (см. deploy-runbook §4) |
| фронт отдаёт `403 Blocked request ... host not allowed` | домен не в `NOMAD_ALLOWED_HOSTS`; проверить `AROMA_DOMAIN`/`MASTER_DOMAIN` в `.env`, пересобрать фронт |
| Caddy не выпускает TLS | DNS не указывает на `147.45.146.23`, либо `80`/`443` недоступны снаружи; логи `proxy` |
| `pg_restore: permission denied ... system trigger` | на managed PG нельзя `--disable-triggers`; грузить data-only в FK-порядке (см. §6) |
| внешний доступ «висит» (рукопожатие ок, данных нет) | провайдерская inbound-фильтрация на IP; крайняя мера — сменить публичный IP |
| нет SSH | порт **49222**, ключ-only; fallback — веб-консоль провайдера |

## 9. Связанные документы
- [`prod-deploy-runbook.md`](prod-deploy-runbook.md) — первичное развёртывание с нуля.
- [`env-matrix.md`](env-matrix.md) — полный набор переменных окружения.
- [`deployment-smoke-checklist.md`](deployment-smoke-checklist.md) — smoke после деплоя.
