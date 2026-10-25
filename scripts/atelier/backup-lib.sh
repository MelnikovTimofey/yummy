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
# Дамп шифруется на всех получателей из файла: ключ владельца (приватная часть только
# у него) и ключ хоста — им pg-restore-check.sh расшифровывает дамп для проверки.
BACKUP_AGE_RECIPIENTS="${BACKUP_AGE_RECIPIENTS:-$PWD/secrets/backup-age.recipients}"
BACKUP_AGE_IDENTITY="${BACKUP_AGE_IDENTITY:-$PWD/secrets/backup-age.key}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

compose() {
  docker compose -f "$COMPOSE_FILE" --env-file .env "$@"
}

# aws-cli из контейнера: на хосте ничего не ставим. 2.17 — до смены дефолтных
# checksum'ов в 2.23, которые ломают загрузку в S3-совместимые хранилища.
# Ключи передаются через окружение, а не значениями в -e: аргументы docker видны в ps.
aws_cli() {
  AWS_ACCESS_KEY_ID="$BACKUP_S3_ACCESS_KEY" \
    AWS_SECRET_ACCESS_KEY="$BACKUP_S3_SECRET_KEY" \
    AWS_DEFAULT_REGION="$BACKUP_S3_REGION" \
    docker run --rm -v "$BACKUP_DIR:/backups" \
    -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_DEFAULT_REGION \
    amazon/aws-cli:2.17.0 --endpoint-url "$BACKUP_S3_ENDPOINT" "$@"
}

s3() {
  aws_cli s3 "$@"
}

# Дампы в папке S3 (hourly/ или daily/), отсортированные от свежего к старому.
s3_list() {
  s3 ls "s3://$BACKUP_S3_BUCKET/$1/" | awk '{print $4}' | grep -E '^atelier-[0-9T-]+\.dump\.age$' | sort -r || true
}
