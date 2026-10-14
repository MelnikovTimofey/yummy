#!/usr/bin/env bash
# Внешняя проверка доменов прода. Запускается из .github/workflows/atelier-uptime.yml
# раз в 5 минут; печатает недоступные адреса, код выхода 1 — если хоть один лежит.

set -uo pipefail

URLS=(${UPTIME_URLS:-https://yummy-aroma-atelier.ru/ https://master.yummy-aroma-atelier.ru/ https://api.yummy-aroma-atelier.ru/health})

failed=0
for url in "${URLS[@]}"; do
  code="$(curl -s -o /dev/null -w '%{http_code}' --retry 2 --retry-delay 10 --retry-all-errors -m 15 "$url")"
  if [[ "$code" != 200 ]]; then
    echo "— $url → HTTP $code"
    failed=1
  fi
done
exit "$failed"
