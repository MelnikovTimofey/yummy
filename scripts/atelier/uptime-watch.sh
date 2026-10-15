#!/usr/bin/env bash
# Внешний наблюдатель за продом Арома Ателье (#155): cron пользователя на хосте вне РФ.
# Раз в 5 минут проверяет домены и шлёт алерт в Telegram только при смене состояния.
# Настройки: ~/atelier-uptime/.env (ATELIER_ALERT_BOT_TOKEN, ATELIER_ALERT_CHAT_ID).

set -uo pipefail
umask 077

dir="$(cd "$(dirname "$0")" && pwd)"
set -a
. "$dir/.env"
set +a

: "${ATELIER_ALERT_BOT_TOKEN:?ATELIER_ALERT_BOT_TOKEN is required}"
: "${ATELIER_ALERT_CHAT_ID:?ATELIER_ALERT_CHAT_ID is required}"

URLS=(${UPTIME_URLS:-https://yummy-aroma-atelier.ru/ https://master.yummy-aroma-atelier.ru/ https://api.yummy-aroma-atelier.ru/health})
STATE_FILE="${UPTIME_STATE_FILE:-$dir/state}"
ALERT_API_URL="${ALERT_API_URL:-https://api.telegram.org}"

failed=""
for url in "${URLS[@]}"; do
  code="$(curl -s -o /dev/null -w '%{http_code}' --retry 2 --retry-delay 10 --retry-all-errors -m 15 "$url")"
  if [[ "$code" != 200 ]]; then
    failed+="— $url → HTTP $code"$'\n'
  fi
done

date -u +%FT%TZ > "$dir/last-run"

# В состоянии — только адреса, без кодов: смена 502 → 504 не повод для нового алерта.
current="$(printf '%s' "$failed" | awk '{print $2}')"
previous="$(cat "$STATE_FILE" 2>/dev/null)"
if [[ "$current" == "$previous" ]]; then
  exit 0
fi

if [[ -n "$failed" ]]; then
  text="Арома Ателье недоступно снаружи (Франкфурт):"$'\n'"$failed"
else
  text="Арома Ателье снова доступно снаружи (Франкфурт)."
fi

if curl -sS -f -m 20 -o /dev/null "$ALERT_API_URL/bot$ATELIER_ALERT_BOT_TOKEN/sendMessage" \
  --data-urlencode "chat_id=$ATELIER_ALERT_CHAT_ID" --data-urlencode "text=$text"; then
  printf '%s' "$current" > "$STATE_FILE"
  echo "$(date -u +%FT%TZ) alert sent: ${current:-всё доступно}" | tr '\n' ' '; echo
else
  echo "$(date -u +%FT%TZ) alert FAILED to send" >&2
  exit 1
fi
