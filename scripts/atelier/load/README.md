# Нагрузочный прогон гостевого потока

Сценарий [k6](https://grafana.com/docs/k6/latest/) для п.2 [#154](https://github.com/MelnikovTimofey/yummy/issues/154):
гости проходят путь от кода дня до «Покурить», часть гостей ещё и собирает чашу в миксере.

| Файл | Что делает |
|---|---|
| `guest-flow.js` | сценарий k6: гостевые сессии, итоговая таблица p50/p95/p99 по эндпоинтам |
| `stats.sh` | CPU и RAM хоста и контейнеров `backend`/`db` раз в 5 с, CSV; запускается на прод-хосте |
| `server-latency.mjs` | серверное время ответа по эндпоинтам из логов backend, без сети до генератора |
| `cleanup.mjs` | SQL, который удаляет ровно созданные прогоном события |

## Почему k6

- **Открытая модель нагрузки.** Исполнитель `constant-arrival-rate` запускает сессии по расписанию
  и не ждёт, пока сервер ответит. Гости тоже приходят сами по себе: если backend тормозит, очередь
  растёт, а не рассасывается. В инструментах с закрытой моделью (`ab`, `autocannon`) медленный сервер
  сам снижает себе нагрузку и выглядит лучше, чем есть.
- **Один статический бинарник.** k6 ставится в домашний каталог без sudo и без рантайма. Locust и
  Artillery требуют Python или Node с пакетами.
- **Теги и пороги по эндпоинтам.** p95/p99 по каждому маршруту считаются без постобработки.

## Профиль по умолчанию

Согласован в [комментарии к #154](https://github.com/MelnikovTimofey/yummy/issues/154): в точке Nomad 104 места,
при плотной посадке ≈ 120; с запасом ×2 — 240 сессий.

- `steady`: 240 сессий равномерно за 15 минут, одна в ≈ 3,75 с;
- `burst`: дополнительные 40 сессий за одну минуту, с 7-й минуты (пришла компания);
- всего 280 сессий, прогон длится ≈ 16–17 минут (сессии, начатые в конце, дорабатывают до 2 минут).

Одна сессия повторяет запросы клиента `apps/aroma-web`:

1. `POST /guest/access-code/verify`;
2. параллельно, как `App.tsx` после ввода кода: `GET /guest/intro/cards`, `GET /guest/onboarding/options`,
   `GET /guest/catalog/mixes` (дважды: онбординг и каталог), `GET /guest/home/rails`;
3. `POST /guest/onboarding/recommendations` 1–3 раза со случайными профилями и вкусами из options;
4. `POST /guest/events/smoke-cta` по одному из первых трёх рекомендованных миксов;
5. у доли `MIXER_SHARE` сессий — миксер: `GET /guest/mixer/palette`, `POST /guest/mixer/evaluate` 1–3 раза,
   `POST /guest/events/custom-mix-smoke`.

Между шагами гость думает от 1 до `THINK_MAX_S` секунд.

## Параметры (env)

| Переменная | По умолчанию | Смысл |
|---|---|---|
| `ATELIER_CODE` | — (обязательна) | код дня; не коммитить и не писать в issue |
| `BASE_URL` | `http://localhost:3021` | адрес backend |
| `SESSIONS` | `240` | сессий в равномерной части |
| `DURATION_MIN` | `15` | длительность равномерной части, минут |
| `BURST_SESSIONS` | `40` | сессий во всплеске (за одну минуту) |
| `BURST_AT_MIN` | `7` | минута начала всплеска |
| `MIXER_SHARE` | `0.5` | доля сессий с миксером |
| `LOGIN_SHARE` | `0` | доля сессий со входом в кабинет через бота (#239): старт, подтверждение с ключом автоматизации, опрос статуса, `GET /guest/me`, «Покурить» с токеном, `GET /guest/me/history`, сердечко (#240). Нужен `ATELIER_AUTOMATION_KEY`; учётки прогона (Telegram id `999000…`) удаляет `cleanup.mjs` |
| `THINK_MAX_S` | `5` | максимальная пауза между шагами, с |
| `OUT_DIR` | `.` | куда писать `summary.json` |

Пороги: p95 каждого эндпоинта < 1 с, ноль 5xx и обрывов, ноль ответов дольше 8 с (через 8 с гостевой
клиент сам обрывает запрос). Если порог нарушен, k6 завершится с ненулевым кодом. Это ориентир, а не
согласованный SLO.

## Локальная проверка сценария

```bash
cd apps/backend && npm run db:start && npm run dev   # backend на :3021 с демо-кодом 1234
```

```bash
docker run --rm -v "$PWD/scripts/atelier/load:/scripts:ro" -e BASE_URL=http://host.docker.internal:3021 \
  -e ATELIER_CODE=1234 -e SESSIONS=10 -e DURATION_MIN=1 -e BURST_SESSIONS=10 -e BURST_AT_MIN=0 \
  grafana/k6:2.3.0 run --quiet /scripts/guest-flow.js
```

В демо-засеве нет табаков в наличии, поэтому миксер пропускается. Для полного пути восстановить
`snapshots/atelier-product-data.dump` в отдельную БД и оставить в наличии пару сотен табаков.

## Прогон на проде

Прогон пишет события «Покурить», а они влияют на спрос в рекомендациях, на статистические коллекции и
на дашборд «Мастера». Поэтому прогон на проде — только с явного ОК владельца, вне часов работы точки,
со снэпшотом до и с очисткой после.

Генератор нагрузки — не на прод-хосте (он съест CPU, который мы меряем) и не за локальным прокси (он
искажает задержки). Подходит наблюдатель во Франкфурте `ssh atelier-frankfurt`: k6 скачивается
бинарником в home. Задержки k6 оттуда включают сеть Франкфурт → Новосибирск, поэтому серверное время
снимается отдельно из логов backend (`server-latency.mjs`). Команды ниже — для bash, из корня репо.

```bash
# 0. k6 во Франкфурте (один раз)
ssh atelier-frankfurt 'mkdir -p ~/k6 && cd ~/k6 && curl -fsSL https://github.com/grafana/k6/releases/download/v2.3.0/k6-v2.3.0-linux-amd64.tar.gz | tar xz --strip-components=1 && ./k6 version'
scp scripts/atelier/load/guest-flow.js atelier-frankfurt:k6/

# 1. снэпшот БД до прогона
ssh atelier-prod 'cd /opt/atelier && f=backups/pre-load-test-$(date -u +%Y%m%dT%H%MZ).dump && umask 077 && docker compose -f docker-compose.prod.yml --env-file .env exec -T db pg_dump -U atelier -Fc atelier > $f && ls -l $f'

# 2. CPU/RAM на время прогона (в фоне, 18 минут)
ssh atelier-prod 'DURATION=1080 bash -s' < scripts/atelier/load/stats.sh > stats.csv &

# 3. прогон: код дня читается из БД и уходит в env k6, нигде не печатаясь
CODE=$(echo "select \"codeValue\" from \"DailyAccessCode\" where active and \"startsAt\" <= now() at time zone 'UTC' and \"endsAt\" > now() at time zone 'UTC' order by \"startsAt\" desc limit 1" |
  ssh atelier-prod 'cd /opt/atelier && docker compose -f docker-compose.prod.yml --env-file .env exec -T db psql -U atelier -d atelier -At')
printf '%s' "$CODE" | ssh atelier-frankfurt 'cd ~/k6 && ATELIER_CODE=$(cat) BASE_URL=https://api.yummy-aroma-atelier.ru ./k6 run --quiet --console-output=created.log guest-flow.js' | tee k6-report.md
scp atelier-frankfurt:k6/created.log atelier-frankfurt:k6/summary.json .

# 4. серверное время за окно прогона (UTC начала и конца — из вывода k6 / stats.csv)
ssh atelier-prod 'cd /opt/atelier && docker compose -f docker-compose.prod.yml --env-file .env logs --no-log-prefix --since <начало> --until <конец> backend' | node scripts/atelier/load/server-latency.mjs

# 5. очистка: сначала посмотреть счётчики (транзакция откатится), потом — с --commit
node scripts/atelier/load/cleanup.mjs created.log | ssh atelier-prod 'cd /opt/atelier && docker compose -f docker-compose.prod.yml --env-file .env exec -T db psql -U atelier -d atelier -v ON_ERROR_STOP=1'
node scripts/atelier/load/cleanup.mjs created.log --commit | ssh atelier-prod 'cd /opt/atelier && docker compose -f docker-compose.prod.yml --env-file .env exec -T db psql -U atelier -d atelier -v ON_ERROR_STOP=1'
```

Прогон 2026-10-19 шёл с рабочего Mac, а не из Франкфурта: k6 в docker (`grafana/k6:2.3.0`), код дня
передан через `-e ATELIER_CODE` из файла с правами 600. Серверное время и CPU/RAM от места генератора не
зависят, а задержки k6 включают сеть и прокси (≈ 50 мс). Результаты — в
[комментарии к #154](https://github.com/MelnikovTimofey/yummy/issues/154#issuecomment-6276644730).

`cleanup.mjs` удаляет события по точному совпадению: `SmokeCtaEvent` по паре `mixId` и `createdAt` с
точностью до миллисекунды, `CustomMixSmokeEvent` по id. Сверка перед удалением:

- `smoke_ours = smoke_found`, `custom_ours = custom_found` — все записи прогона найдены;
- `smoke_in_window − smoke_found` — «Покурить» живых гостей и сотрудников в то же окно, они остаются;
- `custom_with_marker` — чаши с именем `k6 #154`. Если после очистки такие остались, это потерянные
  ответы, и их можно удалить по имени.

Во время прогона может сработать мониторинг хоста (`host-check.sh`, алерты в Telegram владельца).
