#!/usr/bin/env bash
# Ночной бэкап прода: pg_dump → backups/ на хосте → копия в S3 в другом регионе.
# Ставится cron'ом (scripts/atelier/pg-backup.cron), настройки S3 — в .env.backup.
# Порядок установки и восстановления: docs/atelier/prod-deploy-runbook.md §8.

set -euo pipefail
umask 077

cd "$(dirname "$0")/../.."
. scripts/atelier/backup-lib.sh

stamp="$(date -u +%F)"
file="atelier-$stamp.dump"
mkdir -p "$BACKUP_DIR"

compose exec -T db pg_dump -U atelier -Fc atelier > "$BACKUP_DIR/$file.part"
mv "$BACKUP_DIR/$file.part" "$BACKUP_DIR/$file"

s3 cp "/backups/$file" "s3://$BACKUP_S3_BUCKET/$file" --only-show-errors

find "$BACKUP_DIR" -name 'atelier-*.dump' -mtime +"$BACKUP_LOCAL_DAYS" -delete

s3 ls "s3://$BACKUP_S3_BUCKET/" | awk '{print $4}' | grep -E '^atelier-[0-9-]{10}\.dump$' |
  sort -r | tail -n +"$((BACKUP_S3_KEEP + 1))" |
  while read -r old; do
    s3 rm "s3://$BACKUP_S3_BUCKET/$old" --only-show-errors
  done

echo "$(date -u +%FT%TZ) backup ok: $file ($(du -h "$BACKUP_DIR/$file" | cut -f1)) → s3://$BACKUP_S3_BUCKET"
