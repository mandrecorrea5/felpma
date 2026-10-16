FROM alpine:3.20

RUN apk add --no-cache postgresql16-client tzdata busybox-suid rclone curl \
    && mkdir -p /backups /uploads/media /uploads/documentos

COPY backup.sh /backup.sh
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /backup.sh /entrypoint.sh

ENV TZ=America/Sao_Paulo \
    BACKUP_RETENTION_DAYS=14 \
    BACKUP_REMOTE_RETENTION_DAYS=30 \
    BACKUP_CRON="0 3 * * *"

ENTRYPOINT ["/entrypoint.sh"]
