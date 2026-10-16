#!/bin/sh
# Backup do que existe de dado neste projeto, em três artefatos por execução:
#
#   felpma-<stamp>.dump              pg_dump custom-format do banco
#   felpma-media-<stamp>.tar.gz      volume de imagens enviadas pelo painel
#   felpma-documentos-<stamp>.tar.gz volume de PDFs
#
# Mantém N dias localmente e (se R2 estiver configurado) sobe pro Cloudflare R2
# com retenção própria. Os uploads vivem SÓ em volumes Docker: sem estes tar.gz,
# o dump do banco volta apontando para arquivos que não existem mais.
set -eu

: "${PGHOST:?PGHOST required}"
: "${PGUSER:?PGUSER required}"
: "${PGPASSWORD:?PGPASSWORD required}"
: "${PGDATABASE:?PGDATABASE required}"
: "${BACKUP_RETENTION_DAYS:=14}"
: "${BACKUP_REMOTE_RETENTION_DAYS:=30}"

STAMP="$(date +%Y%m%d-%H%M)"
DUMP="/backups/felpma-${STAMP}.dump"

echo "[backup] ${STAMP} -> ${DUMP}"
pg_dump -Fc -Z 6 -f "${DUMP}" \
    -h "${PGHOST}" -U "${PGUSER}" -d "${PGDATABASE}"

# Uploads. Vazios é plausível (site recém-instalado), mas ausentes é erro de
# montagem de volume — daí o test -d antes do tar.
for name in media documentos; do
    DIR="/uploads/${name}"
    ARCHIVE="/backups/felpma-${name}-${STAMP}.tar.gz"

    [ -d "${DIR}" ] || { echo "[backup] ERRO: ${DIR} não está montado"; exit 1; }
    COUNT="$(find "${DIR}" -type f | wc -l | tr -d ' ')"
    echo "[backup] tar ${DIR} (${COUNT} arquivo(s)) -> ${ARCHIVE}"
    tar -czf "${ARCHIVE}" -C "${DIR}" .
done

ARTIFACTS="${DUMP} $(ls -1 /backups/felpma-*-${STAMP}.tar.gz)"

# Upload pra Cloudflare R2 (opcional — pula se variáveis não estão setadas).
# Usa env vars no formato RCLONE_* para configurar um remote ad-hoc "r2:".
if [ -n "${R2_ACCESS_KEY_ID:-}" ] && [ -n "${R2_SECRET_ACCESS_KEY:-}" ] && \
   [ -n "${R2_ENDPOINT:-}" ] && [ -n "${R2_BUCKET:-}" ]; then
    export RCLONE_CONFIG_R2_TYPE=s3
    export RCLONE_CONFIG_R2_PROVIDER=Cloudflare
    export RCLONE_CONFIG_R2_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}"
    export RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}"
    export RCLONE_CONFIG_R2_ENDPOINT="${R2_ENDPOINT}"
    export RCLONE_CONFIG_R2_REGION=auto

    # --s3-no-check-bucket: o token R2 normalmente é escopado a um bucket
    # específico e não tem permissão de listar/checar, só de escrever.
    for f in ${ARTIFACTS}; do
        echo "[backup] uploading to r2:${R2_BUCKET}/$(basename "${f}")"
        rclone copy --s3-no-check-bucket "${f}" "r2:${R2_BUCKET}/"
    done

    echo "[backup] pruning remote backups older than ${BACKUP_REMOTE_RETENTION_DAYS}d"
    rclone delete --s3-no-check-bucket "r2:${R2_BUCKET}/" \
        --include "felpma-*" \
        --min-age "${BACKUP_REMOTE_RETENTION_DAYS}d"
else
    echo "[backup] R2 not configured (R2_* env vars missing) — skipping off-site upload"
fi

# Healthcheck — só pinga se chegou aqui (set -eu garante que falha de upload ou
# de tar derrubam o script antes). Silêncio no healthchecks.io é o sinal de
# problema; falha de rede no curl não deve quebrar o backup local.
if [ -n "${HEALTHCHECK_URL:-}" ]; then
    echo "[backup] pinging healthcheck"
    curl -fsS --retry 3 --max-time 10 "${HEALTHCHECK_URL}" > /dev/null || true
fi

# Retenção local
find /backups -name 'felpma-*' -mtime "+${BACKUP_RETENTION_DAYS}" -delete

echo "[backup] done. local_retention=${BACKUP_RETENTION_DAYS}d remote_retention=${BACKUP_REMOTE_RETENTION_DAYS}d. files:"
ls -lh /backups/felpma-* 2>/dev/null | tail -9 || true
