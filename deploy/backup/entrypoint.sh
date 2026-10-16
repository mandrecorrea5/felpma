#!/bin/sh
# Instala o cron na hora de inicializar e fica em foreground.
set -eu

# Persiste env vars necessárias num arquivo source (cron não herda env do
# entrypoint). Inclui R2_* e HEALTHCHECK_URL se estiverem setadas.
mkdir -p /var/spool/cron/crontabs /var/log /etc/backup
{
    echo "export PGHOST='${PGHOST}'"
    echo "export PGUSER='${PGUSER}'"
    echo "export PGPASSWORD='${PGPASSWORD}'"
    echo "export PGDATABASE='${PGDATABASE}'"
    echo "export BACKUP_RETENTION_DAYS='${BACKUP_RETENTION_DAYS}'"
    echo "export BACKUP_REMOTE_RETENTION_DAYS='${BACKUP_REMOTE_RETENTION_DAYS}'"
    [ -n "${R2_ACCESS_KEY_ID:-}" ]     && echo "export R2_ACCESS_KEY_ID='${R2_ACCESS_KEY_ID}'"
    [ -n "${R2_SECRET_ACCESS_KEY:-}" ] && echo "export R2_SECRET_ACCESS_KEY='${R2_SECRET_ACCESS_KEY}'"
    [ -n "${R2_ENDPOINT:-}" ]          && echo "export R2_ENDPOINT='${R2_ENDPOINT}'"
    [ -n "${R2_BUCKET:-}" ]            && echo "export R2_BUCKET='${R2_BUCKET}'"
    [ -n "${HEALTHCHECK_URL:-}" ]      && echo "export HEALTHCHECK_URL='${HEALTHCHECK_URL}'"
} > /etc/backup/env.sh
chmod 600 /etc/backup/env.sh

echo "${BACKUP_CRON:-0 3 * * *} . /etc/backup/env.sh && /backup.sh >> /var/log/backup.log 2>&1" \
    > /var/spool/cron/crontabs/root

touch /var/log/backup.log

echo "[backup] crond schedule: ${BACKUP_CRON}"
echo "[backup] retention: ${BACKUP_RETENTION_DAYS} days local, ${BACKUP_REMOTE_RETENTION_DAYS} days remote"
if [ -n "${R2_BUCKET:-}" ]; then
    echo "[backup] off-site upload: r2://${R2_BUCKET}"
else
    echo "[backup] off-site upload: DISABLED (R2_* env vars not set)"
fi

# Roda em foreground; tail -F mostra os logs
crond -b -L /var/log/cron.log
exec tail -F /var/log/backup.log /var/log/cron.log
