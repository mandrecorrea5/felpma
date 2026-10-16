#!/usr/bin/env bash
#
# test-restore.sh — verifica que o backup mais recente do R2 restaura num
# Postgres efêmero (porta 55434) e que os tar.gz de upload extraem.
# NÃO toca em nada da produção.
#
# Uso:
#   bash deploy/backup/test-restore.sh
#
# Pré-requisitos:
#   - .env na raiz do repo com R2_* e POSTGRES_PASSWORD
#   - Docker daemon ativo
#   - Porta 55434 livre (ou exporte TEST_RESTORE_PORT=outra)
#
# Recomendado: rodar trimestralmente. Sem testar restore, ter backup é meia
# garantia — e é aqui que se descobre o dump corrompido ou o volume que nunca
# foi montado no container de backup.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

if [ -f "${REPO_ROOT}/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    . "${REPO_ROOT}/.env"
    set +a
fi

: "${R2_ACCESS_KEY_ID:?missing — preencha no .env}"
: "${R2_SECRET_ACCESS_KEY:?missing — preencha no .env}"
: "${R2_ENDPOINT:?missing — preencha no .env}"
: "${R2_BUCKET:?missing — preencha no .env}"

PORT="${TEST_RESTORE_PORT:-55434}"
CONTAINER="felpma-restore-pg"
WORK="$(mktemp -d -t felpma-restore-test.XXXXXX)"

cleanup() {
    docker rm -f "${CONTAINER}" >/dev/null 2>&1 || true
    rm -rf "${WORK}"
}
trap cleanup EXIT

echo "[restore-test] working dir: ${WORK}"
echo "[restore-test] baixando backups mais recentes do R2 (max 30d)…"

docker run --rm \
    -e RCLONE_CONFIG_R2_TYPE=s3 \
    -e RCLONE_CONFIG_R2_PROVIDER=Cloudflare \
    -e RCLONE_CONFIG_R2_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" \
    -e RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
    -e RCLONE_CONFIG_R2_ENDPOINT="${R2_ENDPOINT}" \
    -e RCLONE_CONFIG_R2_REGION=auto \
    -v "${WORK}:/out" \
    rclone/rclone:latest \
    copy --s3-no-check-bucket --max-age 30d \
    "r2:${R2_BUCKET}/" /out/ \
    --include "felpma-*"

pick() {
    ls -1t "${WORK}"/"$1" 2>/dev/null | head -1 || true
}

DUMP="$(pick 'felpma-*.dump')"
MEDIA="$(pick 'felpma-media-*.tar.gz')"
DOCS="$(pick 'felpma-documentos-*.tar.gz')"

if [ -z "${DUMP}" ]; then
    echo "[restore-test] ERRO: nenhum dump encontrado no R2 (filtros: felpma-*.dump, max 30d)" >&2
    exit 1
fi
echo "[restore-test] dump:            $(basename "${DUMP}") ($(du -h "${DUMP}" | cut -f1))"
echo "[restore-test] uploads media:   $(basename "${MEDIA:-<nenhum>}")"
echo "[restore-test] uploads docs:    $(basename "${DOCS:-<nenhum>}")"

echo "[restore-test] subindo Postgres efêmero em :${PORT}…"
docker run -d --rm --name "${CONTAINER}" \
    -e POSTGRES_USER=felpma \
    -e POSTGRES_PASSWORD=test-restore-pwd \
    -e POSTGRES_DB=felpma \
    -p "${PORT}:5432" \
    postgres:16-alpine >/dev/null

echo -n "[restore-test] aguardando readiness"
for _ in $(seq 1 30); do
    if docker exec "${CONTAINER}" pg_isready -U felpma >/dev/null 2>&1; then
        echo " ok"
        break
    fi
    echo -n "."
    sleep 1
done

echo "[restore-test] copiando dump pro container…"
docker cp "${DUMP}" "${CONTAINER}:/tmp/dump.bin"

echo "[restore-test] executando pg_restore…"
docker exec "${CONTAINER}" pg_restore \
    -U felpma -d felpma \
    --no-owner --no-acl \
    /tmp/dump.bin

echo ""
echo "=== Tabelas restauradas ==="
docker exec "${CONTAINER}" psql -U felpma -d felpma -c "\dt"

TOTAL="$(docker exec "${CONTAINER}" psql -U felpma -d felpma -tAc \
    "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")"
echo "[restore-test] total de tabelas em public: ${TOTAL}"
if [ "${TOTAL}" -lt 1 ]; then
    echo "[restore-test] ERRO: restore não criou nenhuma tabela" >&2
    exit 1
fi

# Os uploads são o outro meio do dado: o dump volta apontando pra arquivo que
# não existe se o tar.gz estiver vazio ou faltando.
for pair in "media:${MEDIA}" "documentos:${DOCS}"; do
    name="${pair%%:*}"
    archive="${pair#*:}"
    if [ -z "${archive}" ]; then
        echo "[restore-test] AVISO: nenhum ${name}-*.tar.gz no R2 — confira se o volume estava montado no backup"
        continue
    fi
    dest="${WORK}/extract-${name}"
    mkdir -p "${dest}"
    tar -xzf "${archive}" -C "${dest}"
    echo "[restore-test] ${name}: $(find "${dest}" -type f | wc -l | tr -d ' ') arquivo(s) extraído(s) de $(basename "${archive}")"
done

echo ""
echo "✓ Restore OK. Container efêmero será derrubado."
