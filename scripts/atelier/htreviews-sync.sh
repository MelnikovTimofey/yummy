#!/usr/bin/env bash
# Синхронизация каталога табаков с htreviews.org (scripts/atelier/htreviews-sync.cron):
#   shelf — только бренды того, что есть в точке (ночью, минуты);
#   full  — весь каталог (раз в неделю, часы).
# Одноразовый контейнер из выкаченного образа backend с DATABASE_URL прода.
# Синхронизация идемпотентна и не трогает inStock и полку. При сбое — алерт
# ботом мониторинга (.env.monitor). Порядок: docs/atelier/prod-operations.md §6.

set -uo pipefail
umask 077

cd "$(dirname "$0")/../.."

mode="${1:-shelf}"
case "$mode" in
  shelf) shelf_brands=1 ;;
  full) shelf_brands=0 ;;
  *) echo "usage: $0 [shelf|full]" >&2; exit 2 ;;
esac

set -a
. ./.env.monitor
set +a

: "${ATELIER_ALERT_BOT_TOKEN:?ATELIER_ALERT_BOT_TOKEN is required}"
: "${ATELIER_ALERT_CHAT_ID:?ATELIER_ALERT_CHAT_ID is required}"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
LOCK_FILE="${HTREVIEWS_SYNC_LOCK:-/var/lock/atelier-htreviews-sync.lock}"
# Регулярный обход вежливее ручного: пауза вдвое больше дефолтных 250 мс.
HTREVIEWS_DELAY_MS="${HTREVIEWS_DELAY_MS:-500}"
# Как в host-check.sh: из РФ до Telegram только через telegram-tunnel в сети контура.
ALERT_NETWORK="${ALERT_NETWORK:-atelier_default}"
ALERT_API_URL="${ALERT_API_URL:-https://api.telegram.org}"

log() {
  echo "$(date -u +%FT%TZ) $*"
}

send() {
  docker run --rm --network "$ALERT_NETWORK" curlimages/curl:8.10.1 -sS -f -m 20 -o /dev/null \
    "$ALERT_API_URL/bot$ATELIER_ALERT_BOT_TOKEN/sendMessage" \
    --data-urlencode "chat_id=$ATELIER_ALERT_CHAT_ID" --data-urlencode "text=$1"
}

# Полный прогон идёт часами: ночной, попавший на него, просто пропускается.
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log "htreviews sync skipped: mode=$mode, предыдущий прогон ещё идёт"
  exit 0
fi

output="$(mktemp)"
trap 'rm -f "$output"' EXIT

log "htreviews sync start: mode=$mode delayMs=$HTREVIEWS_DELAY_MS"
docker compose -f "$COMPOSE_FILE" --env-file .env run --rm --no-deps -T \
  -e HTREVIEWS_SHELF_BRANDS="$shelf_brands" \
  -e HTREVIEWS_DELAY_MS="$HTREVIEWS_DELAY_MS" \
  backend npx tsx scripts/sync-htreviews.ts 2>&1 | tee "$output"
status="${PIPESTATUS[0]}"

stats="$(grep -o '\[htreviews:sync\] stats .*' "$output" | tail -1 | sed 's/^\[htreviews:sync\] stats //')"
if (( status == 0 )); then
  log "htreviews sync ok: mode=$mode $stats"
  exit 0
fi

log "htreviews-sync.sh FAILED: mode=$mode exit=$status"
reason="$(grep -v '^\s*at ' "$output" | sed '/^\s*$/d' | tail -3)"
text="Арома Ателье · синхронизация каталога с htreviews ($mode) упала, код $status"
text+=$'\n\n'"$reason"$'\n\n'"Лог: /var/log/atelier-htreviews-sync.log"
if ! send "$text"; then
  log "alert FAILED to send" >&2
fi
exit "$status"
