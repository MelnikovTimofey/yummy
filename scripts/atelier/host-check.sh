#!/usr/bin/env bash
# Проверка прод-хоста раз в 5 минут (scripts/atelier/host-check.cron): сервисы,
# диск, память, бэкапы, heartbeat бота. Алерт в Telegram уходит только когда
# меняется список проблем: что сломалось и что починилось. Доступность доменов
# снаружи проверяет .github/workflows/atelier-uptime.yml.

set -uo pipefail
umask 077

cd "$(dirname "$0")/../.."

set -a
. ./.env.monitor
set +a

: "${ATELIER_ALERT_BOT_TOKEN:?ATELIER_ALERT_BOT_TOKEN is required}"
: "${ATELIER_ALERT_CHAT_ID:?ATELIER_ALERT_CHAT_ID is required}"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
STATE_FILE="${MONITOR_STATE_FILE:-/var/lib/atelier-monitor/problems}"
BACKUP_DIR="${BACKUP_DIR:-$PWD/backups}"
BACKUP_LOG="${BACKUP_LOG:-/var/log/atelier-backup.log}"
DISK_MAX_PCT="${DISK_MAX_PCT:-80}"
MEM_MIN_PCT="${MEM_MIN_PCT:-10}"
BACKUP_MAX_AGE_MIN="${BACKUP_MAX_AGE_MIN:-1560}"
BOT_STALE_SEC="${BOT_STALE_SEC:-600}"
# Из РФ до Telegram только через telegram-tunnel: в сети контура он отвечает
# как api.telegram.org, поэтому curl запускается контейнером в этой сети.
ALERT_NETWORK="${ALERT_NETWORK:-atelier_default}"
ALERT_API_URL="${ALERT_API_URL:-https://api.telegram.org}"

compose() {
  docker compose -f "$COMPOSE_FILE" --env-file .env "$@"
}

send() {
  docker run --rm --network "$ALERT_NETWORK" curlimages/curl:8.10.1 -sS -f -m 20 -o /dev/null \
    "$ALERT_API_URL/bot$ATELIER_ALERT_BOT_TOKEN/sendMessage" \
    --data-urlencode "chat_id=$ATELIER_ALERT_CHAT_ID" --data-urlencode "text=$1"
}

problems=()

for service in $(comm -23 <(compose config --services | sort) <(compose ps --services --status running | sort)); do
  problems+=("сервис $service не запущен")
done

disk="$(df -P / | awk 'NR == 2 { print $5 }' | tr -dc 0-9)"
if (( disk > DISK_MAX_PCT )); then
  problems+=("диск / заполнен больше чем на $DISK_MAX_PCT%")
fi

if [[ -r /proc/meminfo ]]; then
  mem_free_pct="$(awk '/^MemTotal/ { t = $2 } /^MemAvailable/ { a = $2 } END { print int(a * 100 / t) }' /proc/meminfo)"
  if (( mem_free_pct < MEM_MIN_PCT )); then
    problems+=("свободной памяти меньше $MEM_MIN_PCT%")
  fi
fi

if [[ -z "$(find "$BACKUP_DIR" -name 'atelier-*.dump' -mmin -"$BACKUP_MAX_AGE_MIN" 2>/dev/null)" ]]; then
  problems+=("нет свежего дампа БД за последние $((BACKUP_MAX_AGE_MIN / 60)) ч")
fi

last_backup="$(grep -E 'backup ok:|pg-backup\.sh FAILED' "$BACKUP_LOG" 2>/dev/null | tail -1)"
if [[ "$last_backup" == *FAILED* ]]; then
  problems+=("бэкап упал: $last_backup")
fi
last_restore="$(grep -E 'restore check (ok|FAILED)|pg-restore-check\.sh FAILED' "$BACKUP_LOG" 2>/dev/null | tail -1)"
if [[ "$last_restore" == *FAILED* ]]; then
  problems+=("проверка восстановления упала: $last_restore")
fi

heartbeat_age="$(compose exec -T db psql -U atelier -d atelier -Atc \
  'select coalesce(extract(epoch from now() - max("lastHeartbeatAt"))::int, -1) from "TelegramAutomationState"' 2>/dev/null)"
if [[ -z "$heartbeat_age" ]]; then
  problems+=("база не отвечает на запрос heartbeat бота")
elif (( heartbeat_age < 0 || heartbeat_age > BOT_STALE_SEC )); then
  problems+=("бот не присылает heartbeat дольше $((BOT_STALE_SEC / 60)) мин")
fi

current="$(printf '%s\n' "${problems[@]+"${problems[@]}"}" | sed '/^$/d' | sort)"
previous="$(cat "$STATE_FILE" 2>/dev/null)"
if [[ "$current" == "$previous" ]]; then
  exit 0
fi

new="$(comm -13 <(printf '%s\n' "$previous") <(printf '%s\n' "$current") | sed '/^$/d')"
resolved="$(comm -23 <(printf '%s\n' "$previous") <(printf '%s\n' "$current") | sed '/^$/d')"

text="Арома Ателье · прод-хост"
if [[ -n "$new" ]]; then
  text+=$'\n\nПроблемы:\n'"$(sed 's/^/— /' <<<"$new")"
fi
if [[ -n "$resolved" ]]; then
  text+=$'\n\nУстранено:\n'"$(sed 's/^/— /' <<<"$resolved")"
fi
if [[ -z "$current" ]]; then
  text+=$'\n\nВсё в порядке.'
fi

# Состояние сохраняем только после успешной отправки — иначе алерт повторится на следующем прогоне.
if send "$text"; then
  mkdir -p "$(dirname "$STATE_FILE")"
  printf '%s' "$current" > "$STATE_FILE"
  echo "$(date -u +%FT%TZ) alert sent: $(tr '\n' ';' <<<"${current:-всё в порядке}")"
else
  echo "$(date -u +%FT%TZ) alert FAILED to send" >&2
  exit 1
fi
