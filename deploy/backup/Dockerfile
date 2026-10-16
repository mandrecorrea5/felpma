FROM alpine:3.20

# Só /backups. Os /uploads/media e /uploads/documentos NÃO voltam pra cá:
# estes dois caminhos são o mount point dos volumes que o site escreve, e o
# Docker semeia a posse de um volume novo a partir do image de quem monta
# primeiro — e este image não tem USER, então semearia root:root num volume que
# o site (nextjs, uid 100) precisa escrever. Reproduzido em 1 de cada 3 `up -d`
# com os diretórios aqui; sem eles, 5 de 5 nascem 100:101. Sintoma de quem
# reencontrar o bug: upload do painel morrendo em EACCES.
RUN apk add --no-cache postgresql16-client tzdata busybox-suid rclone curl \
    && mkdir -p /backups

COPY backup.sh /backup.sh
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /backup.sh /entrypoint.sh

ENV TZ=America/Sao_Paulo \
    BACKUP_RETENTION_DAYS=14 \
    BACKUP_REMOTE_RETENTION_DAYS=30 \
    BACKUP_CRON="0 3 * * *"

ENTRYPOINT ["/entrypoint.sh"]
