#!/bin/sh
# Instala deploy/caddy/felpma.caddy no ingress Caddy compartilhado da VPS e recarrega.
#
#   sh deploy/reload-caddy.sh
#
# Rode na VPS (o CI roda via SSH). O Caddy lê /srv/apps/ingress/caddy/conf.d
# (bind mount de diretório). O validate vem antes do reload: se o snippet
# estiver inválido, restauramos o anterior e saímos com erro, sem afetar os
# outros sites do ingress.
set -eu

CADDY="${CADDY_CONTAINER:-ingress-caddy}"
CONFD="${CADDY_CONFD:-/srv/apps/ingress/caddy/conf.d}"
SRC="$(dirname "$0")/caddy/felpma.caddy"
DST="${CONFD}/felpma.caddy"

if [ -z "$(docker ps --filter "name=^${CADDY}$" --format '{{.Names}}')" ]; then
    echo "ERRO: o container ${CADDY} não está rodando." >&2
    exit 1
fi

[ -f "$DST" ] && cp "$DST" "${DST}.prev"
cp "$SRC" "$DST"

if ! docker exec "$CADDY" caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile; then
    echo "ERRO: config inválida; revertendo." >&2
    if [ -f "${DST}.prev" ]; then mv "${DST}.prev" "$DST"; else rm -f "$DST"; fi
    exit 1
fi
rm -f "${DST}.prev"

docker exec "$CADDY" caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
echo "OK: caddy recarregado."
