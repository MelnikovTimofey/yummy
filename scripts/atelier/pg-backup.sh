#!/usr/bin/env bash
# Ежечасный бэкап прода: pg_dump → backups/ на хосте → копия в S3 в другом регионе.
# В S3 две папки: hourly/ (последние BACKUP_S3_KEEP_HOURLY дампов) и daily/ (дамп
# часа BACKUP_DAILY_HOUR UTC, последние BACKUP_S3_KEEP_DAILY). Потеря сервера стоит
# не больше часа данных, история при этом — месяц.
# Ставится cron'ом (scripts/atelier/pg-backup.cron), настройки S3 — в .env.backup.
# Порядок установки и восстановления: docs/atelier/prod-deploy-runbook.md §8.

set -euo pipefail
umask 077

cd "$(dirname "$0")/../.."
. scripts/atelier/backup-lib.sh

day="$(date -u +%F)"
hour="$(date -u +%H)"
file="atelier-${day}T${hour}.dump"
mkdir -p "$BACKUP_DIR"

compose exec -T db pg_dump -U atelier -Fc atelier > "$BACKUP_DIR/$file.part"
mv "$BACKUP_DIR/$file.part" "$BACKUP_DIR/$file"

s3 cp "/backups/$file" "s3://$BACKUP_S3_BUCKET/hourly/$file" --only-show-errors
s3_prune hourly "$BACKUP_S3_KEEP_HOURLY"

if [[ "$hour" == "$BACKUP_DAILY_HOUR" ]]; then
  cp "$BACKUP_DIR/$file" "$BACKUP_DIR/atelier-$day.dump"
  s3 cp "/backups/$file" "s3://$BACKUP_S3_BUCKET/daily/atelier-$day.dump" --only-show-errors
  s3_prune daily "$BACKUP_S3_KEEP_DAILY"
fi

find "$BACKUP_DIR" -name 'atelier-*T*.dump' -mmin +"$((BACKUP_LOCAL_HOURLY_HOURS * 60))" -delete
find "$BACKUP_DIR" -name 'atelier-*.dump' ! -name '*T*' -mtime +"$BACKUP_LOCAL_DAYS" -delete

echo "$(date -u +%FT%TZ) backup ok: $file ($(du -h "$BACKUP_DIR/$file" | cut -f1)) → s3://$BACKUP_S3_BUCKET"
