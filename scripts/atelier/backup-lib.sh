# Общее для pg-backup.sh и pg-restore-check.sh. Запускать из корня репо.

# Единая строка FAILED в /var/log/atelier-backup.log — по ней будет алертить мониторинг (#155).
set -E
trap 'echo "$(date -u +%FT%TZ) $(basename "$0") FAILED: line $LINENO" >&2' ERR

set -a
. ./.env.backup
set +a

: "${BACKUP_S3_ENDPOINT:?BACKUP_S3_ENDPOINT is required}"
: "${BACKUP_S3_REGION:?BACKUP_S3_REGION is required}"
: "${BACKUP_S3_BUCKET:?BACKUP_S3_BUCKET is required}"
: "${BACKUP_S3_ACCESS_KEY:?BACKUP_S3_ACCESS_KEY is required}"
: "${BACKUP_S3_SECRET_KEY:?BACKUP_S3_SECRET_KEY is required}"

BACKUP_DIR="${BACKUP_DIR:-$PWD/backups}"
BACKUP_DAILY_HOUR="${BACKUP_DAILY_HOUR:-03}"
BACKUP_LOCAL_HOURLY_HOURS="${BACKUP_LOCAL_HOURLY_HOURS:-24}"
BACKUP_LOCAL_DAYS="${BACKUP_LOCAL_DAYS:-14}"
BACKUP_S3_KEEP_HOURLY="${BACKUP_S3_KEEP_HOURLY:-48}"
BACKUP_S3_KEEP_DAILY="${BACKUP_S3_KEEP_DAILY:-30}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

compose() {
  docker compose -f "$COMPOSE_FILE" --env-file .env "$@"
}

# aws-cli из контейнера: на хосте ничего не ставим. 2.17 — до смены дефолтных
# checksum'ов в 2.23, которые ломают загрузку в S3-совместимые хранилища.
s3() {
  docker run --rm -v "$BACKUP_DIR:/backups" \
    -e AWS_ACCESS_KEY_ID="$BACKUP_S3_ACCESS_KEY" \
    -e AWS_SECRET_ACCESS_KEY="$BACKUP_S3_SECRET_KEY" \
    -e AWS_DEFAULT_REGION="$BACKUP_S3_REGION" \
    amazon/aws-cli:2.17.0 --endpoint-url "$BACKUP_S3_ENDPOINT" s3 "$@"
}

# Дампы в папке S3 (hourly/ или daily/), отсортированные от свежего к старому.
s3_list() {
  s3 ls "s3://$BACKUP_S3_BUCKET/$1/" | awk '{print $4}' | grep -E '^atelier-[0-9T-]+\.dump$' | sort -r || true
}

s3_prune() {
  s3_list "$1" | tail -n +"$(($2 + 1))" | while read -r old; do
    s3 rm "s3://$BACKUP_S3_BUCKET/$1/$old" --only-show-errors
  done
}
