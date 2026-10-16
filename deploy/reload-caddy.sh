#!/bin/sh
# Aplica este repositório ao proxy que emprestamos do ranking-lpo.
#
#   sh deploy/reload-caddy.sh
#
# O container ranking-caddy monta este repo em /etc/caddy/sites (read-only),
# então depois do `git reset --hard` do deploy o arquivo novo JÁ está no lugar —
# o que falta é o Caddy reler. `reload` faz isso sem reiniciar o container: as
# rotas de weightlogx.com.br continuam servindo durante o troca-config, e os
# certificados já emitidos em /data não são tocados.
#
# O validate vem antes e é o ponto do script. Um erro de sintaxe aqui derrubaria
# também o outro projeto se fosse direto no reload; assim ele para com exit != 0
# e o deploy falha no CI com a mensagem do Caddy, deixando o ar em pé.
set -eu

CADDY="${CADDY_CONTAINER:-ranking-caddy}"

if [ -z "$(docker ps --filter "name=^${CADDY}$" --format '{{.Names}}')" ]; then
    echo "ERRO: o container ${CADDY} não está rodando." >&2
    echo "      Sem ele não há proxy nesta VPS — cheque o stack do ranking-lpo." >&2
    exit 1
fi

docker exec "${CADDY}" caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
docker exec "${CADDY}" caddy reload   --config /etc/caddy/Caddyfile --adapter caddyfile

echo "OK: caddy recarregado."
docker exec "${CADDY}" caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1 \
    && echo "OK: config continua válida depois do reload."
