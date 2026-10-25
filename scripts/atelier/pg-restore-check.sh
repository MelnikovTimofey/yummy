#!/usr/bin/env bash
# Еженедельная проверка, что бэкап восстанавливается: последний часовой дамп из S3
# поднимается во временном postgres:16, ключевые таблицы не пустые.
# Ненулевой код выхода = бэкап непригоден, разбираться до любых работ с базой.

set -euo pipefail
umask 077

cd "$(dirname "$0")/../.."
. scripts/atelier/backup-lib.sh

TABLES=(Tobacco Mix StaffAccount _prisma_migrations)
container="atelier-restore-check"
workdir="$(mktemp -d)"
trap 'docker rm -f "$container" >/dev/null 2>&1 || true; rm -rf "$workdir"' EXIT

latest="$(s3_list hourly | awk 'NR == 1')"
if [[ -z "$latest" ]]; then
  echo "restore check FAILED: в s3://$BACKUP_S3_BUCKET/hourly нет дампов" >&2
  exit 1
fi

BACKUP_DIR="$workdir" s3 cp "s3://$BACKUP_S3_BUCKET/hourly/$latest" "/backups/$latest" --only-show-errors

docker run -d --name "$container" -e POSTGRES_USER=atelier -e POSTGRES_PASSWORD=restore-check \
  -e POSTGRES_DB=atelier postgres:16 >/dev/null
for _ in $(seq 1 30); do
  docker exec "$container" pg_isready -U atelier -d atelier -q && break
  sleep 2
done

age -d -i "$BACKUP_AGE_IDENTITY" "$workdir/$latest" \
  | docker exec -i "$container" pg_restore -U atelier -d atelier --no-owner --exit-on-error

count() { "$@" psql -U atelier -d atelier -Atc "select count(*) from \"$table\""; }

failed=0
for table in "${TABLES[@]}"; do
  restored="$(count docker exec "$container")"
  prod="$(count compose exec -T db)"
  echo "$table: restored=$restored prod=$prod"
  if [[ "$restored" -eq 0 ]]; then
    failed=1
  fi
done

if [[ "$failed" -ne 0 ]]; then
  echo "$(date -u +%FT%TZ) restore check FAILED: $latest — пустые таблицы" >&2
  exit 1
fi
echo "$(date -u +%FT%TZ) restore check ok: $latest"
