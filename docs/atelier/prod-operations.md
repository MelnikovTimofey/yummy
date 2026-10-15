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
| Бэкапы | `/opt/atelier/backups` (14 дней) + S3 TimeWeb `ru-1` (30 дампов), cron `/etc/cron.d/atelier-pg-backup`: дамп 03:30 UTC, проверка восстановления пн 04:00 UTC; лог `/var/log/atelier-backup.log` |
| Домены | `yummy-aroma-atelier.ru` (гость), `master.` (Мастер), `api.` (backend); DNS в TimeWeb |
| TLS | Let's Encrypt через Caddy, ACME-уведомления на email владельца |
| Firewall | ufw: `49222`, `80`, `443` |
| Telegram | бот ходит в `api.telegram.org` через сервис `telegram-tunnel` → `lampa@186.246.25.8:37023` (Франкфурт); ключ `secrets/telegram-tunnel/`, на удалённой стороне ограничен `permitopen="api.telegram.org:443"` |

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

Образы на хосте **не собираются**: их собирает CI
(`.github/workflows/atelier-images.yml`) на каждый push в `main` и кладёт в GHCR
(`ghcr.io/melnikovtimofey/atelier-<сервис>`) с тегом = SHA коммита. Перед выкаткой
дождаться зелёного прогона `Atelier Images` для нужного коммита
(`gh run list --workflow atelier-images.yml --limit 1`).

```bash
cd /opt/atelier

# весь контур на текущий main: git pull, pull образов, up --wait
scripts/atelier/deploy.sh

# точечно — только нужные сервисы; зависимости из depends_on не пересоздаются
scripts/atelier/deploy.sh telegram-bot
```

- Выкаченный тег каждого сервиса скрипт пишет в `.env` (`ATELIER_TAG_<СЕРВИС>`),
  поэтому обычный `docker compose … up -d` после выкатки ничего не меняет.
- **Точечная выкатка идёт с `--no-deps`** (#150): compose не ждёт `healthy` у
  зависимостей. Если вместе с сервисом изменилась и его зависимость (например,
  бот и backend) — перечислить обе: `deploy.sh backend telegram-bot`, или
  выкатить весь контур.
- **Миграции схемы** накатываются автоматически при рестарте backend
  (`prisma migrate deploy`). Перед рискованной миграцией — снять снэпшот БД (см. §6).
- **Смена `PUBLIC_API_URL`/домена**: URL зашивается в бандлы фронтов при сборке в
  CI — поменять `PUBLIC_API_URL`/`AROMA_URL` в `env` workflow `atelier-images.yml`,
  смержить, затем `deploy.sh aroma-web master-web`.
- **Аварийно, если CI недоступен**, можно собрать на хосте по-старому:
  `docker compose … up -d --build <сервис>`. Это пересобирает образ из текущего
  кода и снова грузит хост — только как исключение.
- **Смена `.env`** (секреты, домены) — затем `up -d` (compose пересоздаст
  контейнеры с новым окружением).

## 5. Перезапуск одного сервиса

```bash
docker compose -f docker-compose.prod.yml --env-file .env restart backend
docker compose -f docker-compose.prod.yml --env-file .env restart telegram-bot
```

`restart` перезапускает контейнер на той же версии и зависимости не трогает.
Пересоздать сервис (например, после смены `.env`) — `up -d --no-deps <сервис>`.

## 6. Обслуживание

### Бэкап БД
Ночной `pg_dump` ставит cron (см. [`prod-deploy-runbook.md`](prod-deploy-runbook.md) §8).
Внеплановый дамп перед рискованными изменениями:
```bash
docker compose -f docker-compose.prod.yml --env-file .env exec -T db \
  pg_dump -U atelier -Fc atelier > backups/atelier-$(date +%F-%H%M).dump
```
Ночной дамп сам уходит в S3 в другом регионе, раз в неделю проверяется его
восстановление (runbook §8). Последние записи:
```bash
tail -20 /var/log/atelier-backup.log
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

### Смена `Caddyfile`
`Caddyfile` смонтирован в `proxy` одним файлом. `git pull` подменяет файл новым,
а контейнер продолжает видеть старый до своего перезапуска. Поэтому после
`git pull` — перезапуск (секундный обрыв на всех доменах, делать вне часов
работы точки):
```bash
docker compose -f docker-compose.prod.yml --env-file .env restart proxy
```
`reverse_proxy` повторяет подключение к upstream до 30 с (`lb_try_duration`), поэтому
выкатка отдельного сервиса не даёт гостям 502 — запросы просто ждут его рестарта (#164).

## 7. Откат

Откат — выкатка образов предыдущего коммита; его SHA печатает `deploy.sh` в строке
`было:` и видно в `git log --oneline -5`.

```bash
cd /opt/atelier
DEPLOY_TAG=<sha> scripts/atelier/deploy.sh               # весь контур
DEPLOY_TAG=<sha> scripts/atelier/deploy.sh telegram-bot  # один сервис
```

Если откат затрагивает схему — восстановить БД из дампа, снятого **до**
проблемного деплоя (runbook §8): старый backend не откатывает уже применённые
миграции. Образы старше 7 дней удаляются с хоста, но лежат в GHCR и скачаются заново.

## 8. Диагностика частых проблем

| Симптом | Причина / решение |
|---|---|
| `backend` не стартует, `P1000 auth failed` | `POSTGRES_PASSWORD` в `.env` не совпадает с паролем, с которым volume `atelier_pg` инициализирован; проверить `docker compose ... exec db psql -U atelier -d atelier` |
| `telegram-bot` `getUpdates ETIMEDOUT` | IPv4 до Telegram заблокирован в РФ, в nsk-1 нет IPv6 — бот работает через `telegram-tunnel`. Проверить `ps` и `logs telegram-tunnel` (упал SSH до Франкфурта / сменился его host key → обновить `secrets/telegram-tunnel/known_hosts`) |
| фронт отдаёт `403 Blocked request ... host not allowed` | домен не в `ATELIER_ALLOWED_HOSTS`; проверить `AROMA_DOMAIN`/`MASTER_DOMAIN` в `.env`, пересобрать фронт |
| Caddy не выпускает TLS | DNS не указывает на `201.24.60.80`, либо `80`/`443` недоступны снаружи; логи `proxy` |
| внешний доступ «висит» (рукопожатие ок, данных нет) | провайдерская inbound-фильтрация на IP; крайняя мера — сменить публичный IP |
| нет SSH | порт **49222**, ключ-only; fallback — веб-консоль провайдера |

## 9. Мониторинг и алерты

Алерты приходят в Telegram от отдельного бота (не гостевого `@aroma_atelier_bot`)
в чат владельца. Три наблюдателя:

| Что | Где | Как часто | Что проверяет |
|---|---|---|---|
| Внешний (основной) | Франкфурт `186.246.25.8` (хост `telegram-tunnel`), пользователь `lampa`: user-crontab → `~/atelier-uptime/uptime-watch.sh` (копия `scripts/atelier/uptime-watch.sh`) | каждые 5 мин | `yummy-aroma-atelier.ru`, `master.`, `api.…/health` отвечают 200 |
| Внешний (запасной) | GitHub Actions `.github/workflows/atelier-uptime.yml` → `scripts/atelier/uptime-check.sh` | по расписанию раз в 5 мин, на деле раз в 2–5 ч | то же |
| Хост | cron `/etc/cron.d/atelier-host-check` → `scripts/atelier/host-check.sh`, лог `/var/log/atelier-monitor.log` | каждые 5 мин | все сервисы compose запущены; диск `/` ≤ 80 %; свободной памяти ≥ 10 %; дамп БД моложе 26 ч; последний бэкап и проверка восстановления без `FAILED`; heartbeat бота свежее 10 мин |

Все шлют сообщение только при **смене** состояния: что сломалось и что починилось.
Пока проблема не ушла — повторов нет. Хост шлёт алерты через `telegram-tunnel`,
Франкфурт и GitHub — в Telegram напрямую. Если лёг Франкфурт, вместе с ним
перестают работать и основной внешний наблюдатель, и туннель для алертов с хоста —
остаётся только GitHub, который запускается редко.

> Почему не только GitHub: в этом репо расписание срабатывает раз в 2–5 часов
> вместо 5 минут (сдвиг cron не помог, #159). UptimeRobot Free не подходит:
> Telegram и webhook там только на платных тарифах, а сам Free — для
> некоммерческих проектов.

Установка один раз:

1. Создать бота через @BotFather и написать ему `/start` из чата, куда слать
   алерты.
2. На хосте — `/opt/atelier/.env.monitor` с правами 600
   (`ATELIER_ALERT_BOT_TOKEN`, `ATELIER_ALERT_CHAT_ID`, см.
   [`env-matrix.md`](env-matrix.md) §5b).
3. В GitHub — секреты репозитория с теми же значениями:
   `ATELIER_ALERT_BOT_TOKEN`, `ATELIER_ALERT_CHAT_ID`.
4. Поставить cron на прод-хосте и проверить:

```bash
cd /opt/atelier
cp scripts/atelier/host-check.cron /etc/cron.d/atelier-host-check
scripts/atelier/host-check.sh && tail -5 /var/log/atelier-monitor.log
```

5. Франкфурт (`ssh atelier-frankfurt`; ключ `id_xray` должен быть в ssh-agent).
   Скрипт и `.env` копируются с рабочей машины, на хосте нет клона репо:

```bash
ssh atelier-frankfurt 'umask 077 && mkdir -p ~/atelier-uptime && cat > ~/atelier-uptime/uptime-watch.sh && chmod 700 ~/atelier-uptime/uptime-watch.sh' < scripts/atelier/uptime-watch.sh
ssh atelier-prod 'cat /opt/atelier/.env.monitor' | ssh atelier-frankfurt 'umask 077 && cat > ~/atelier-uptime/.env'
ssh atelier-frankfurt '(crontab -l 2>/dev/null; echo "*/5 * * * * \$HOME/atelier-uptime/uptime-watch.sh >> \$HOME/atelier-uptime/log 2>&1") | crontab -'
```

   Без изменений скрипт молчит, поэтому сам прогон видно по
   `~/atelier-uptime/last-run`, а отправленные алерты — по `~/atelier-uptime/log`.

Тест алерта без поломки прода — занизить порог диска на один прогон
(`DISK_MAX_PCT=1 scripts/atelier/host-check.sh`), следующий обычный прогон
пришлёт «Устранено». Внешний — подставить несуществующий адрес на один прогон:
`UPTIME_URLS="https://api.yummy-aroma-atelier.ru/nope" ~/atelier-uptime/uptime-watch.sh`
во Франкфурте, следующий обычный прогон пришлёт «снова доступно». GitHub-вариант
запускается вручную: `gh workflow run atelier-uptime.yml`.

> GitHub отключает расписания в публичном репо после 60 дней без коммитов.
> Если репо надолго затихнет — включить workflow заново во вкладке Actions.

## 10. Связанные документы
- [`prod-deploy-runbook.md`](prod-deploy-runbook.md) — первичное развёртывание с нуля.
- [`env-matrix.md`](env-matrix.md) — полный набор переменных окружения.
- [`deployment-smoke-checklist.md`](deployment-smoke-checklist.md) — smoke после деплоя.
