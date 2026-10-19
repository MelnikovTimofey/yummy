#!/usr/bin/env bash
# CPU и RAM хоста и контейнеров backend/db раз в INTERVAL секунд, CSV в stdout.
# Запускается на прод-хосте на время прогона (README.md рядом):
#   ssh atelier-prod 'DURATION=1080 bash -s' < scripts/atelier/load/stats.sh > stats.csv
# CPU контейнера — как в docker stats: 100 % = одно ядро, при 2 vCPU потолок 200 %.
# CPU хоста — доля от всех ядер: 100 % = заняты оба; steal — время, отнятое гипервизором.
set -euo pipefail

DURATION="${DURATION:-1080}"
INTERVAL="${INTERVAL:-5}"
cd "${ATELIER_DIR:-/opt/atelier}"

containers=$(docker compose -f docker-compose.prod.yml --env-file .env ps -q backend db)

# busy без steal, steal, всего — в тиках из /proc/stat.
read_cpu() { awk '/^cpu /{ print $2+$3+$4+$7+$8, $9, $2+$3+$4+$5+$6+$7+$8+$9 }' /proc/stat; }

echo 'utc,host_cpu_pct,host_steal_pct,host_mem_used_mb,load1,container,cpu_pct,mem_usage'
read -r busy0 steal0 total0 < <(read_cpu)
end=$((SECONDS + DURATION))
while (( SECONDS < end )); do
  sleep "$INTERVAL"
  read -r busy1 steal1 total1 < <(read_cpu)
  dt=$((total1 - total0))
  host_cpu=$(awk -v b=$((busy1 - busy0)) -v t="$dt" 'BEGIN { printf "%.1f", t ? 100 * b / t : 0 }')
  host_steal=$(awk -v s=$((steal1 - steal0)) -v t="$dt" 'BEGIN { printf "%.1f", t ? 100 * s / t : 0 }')
  busy0=$busy1 steal0=$steal1 total0=$total1
  mem=$(free -m | awk '/^Mem:/{ print $3 }')
  load1=$(cut -d' ' -f1 /proc/loadavg)
  ts=$(date -u +%FT%TZ)
  # shellcheck disable=SC2086
  docker stats --no-stream --format '{{.Name}},{{.CPUPerc}},{{.MemUsage}}' $containers |
    sed "s|^|$ts,$host_cpu,$host_steal,$mem,$load1,|"
done
