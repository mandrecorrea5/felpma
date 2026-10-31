#!/usr/bin/env bash
# /usr/local/bin/felpma-deploy — comando forçado do deploy via GitHub Actions.
#
# Instalação (na VPS, como root):
#   install -m 755 -o root -g root /srv/apps/felpma/deploy/remote-deploy.sh /usr/local/bin/felpma-deploy
#
# A chave do CI entra como usuário `deploy` (compartilhado com os outros sites
# da VPS), em ~deploy/.ssh/authorized_keys, travada neste script:
#   restrict,command="/usr/local/bin/felpma-deploy" ssh-ed25519 AAAA... github-actions-felpma
#
# Uso (feito pelo workflow):
#   ssh deploy@host "deploy <sha-completo>"
#
# O script:
#   1. valida o argumento (nada além de "deploy <sha>" é aceito);
#   2. trava contra deploys concorrentes;
#   3. faz um backup antes de subir código novo (migrations rodam no start);
#   4. posiciona o repositório no SHA pedido, sobe a stack e espera o site
#      ficar healthy;
#   5. instala o snippet do Caddy e recarrega o ingress;
#   6. em falha, volta para o SHA anterior.
#
# Este arquivo é instalado em /usr/local/bin como root: o usuário `deploy` não
# consegue alterá-lo. Mudou aqui? Reinstale com o comando acima.

set -euo pipefail

APP_DIR="${APP_DIR:-/srv/apps/felpma}"
LOCK_FILE="${LOCK_FILE:-/var/lock/felpma-deploy.lock}"
STATE_FILE="$APP_DIR/.deploy-state"
SITE_CONTAINER="${SITE_CONTAINER:-felpma-site}"
BACKUP_CONTAINER="${BACKUP_CONTAINER:-felpma-backup}"

log() { printf '%s [felpma-deploy] %s\n' "$(date -u +%FT%TZ)" "$*"; }

COMMAND="${SSH_ORIGINAL_COMMAND:-}"
if [[ ! "$COMMAND" =~ ^deploy[[:space:]]+([0-9a-f]{7,40})$ ]]; then
  log "comando recusado: '${COMMAND}'"
  exit 2
fi
SHA="${BASH_REMATCH[1]}"

cd "$APP_DIR" || {
  log "diretório inexistente: $APP_DIR"
  exit 3
}

exec 9>"$LOCK_FILE"
flock -n 9 || {
  log "já existe um deploy em andamento"
  exit 4
}

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile producao)

wait_healthy() {
  local status
  for _ in $(seq 1 60); do
    status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$SITE_CONTAINER" 2>/dev/null || echo missing)"
    case "$status" in
      healthy) return 0 ;;
      exited | dead) return 1 ;;
    esac
    sleep 5
  done
  return 1
}

publish() {
  docker network inspect ingress >/dev/null 2>&1 || docker network create ingress >/dev/null
  "${COMPOSE[@]}" up -d --build --force-recreate --remove-orphans
}

PREVIOUS="$(cat "$STATE_FILE" 2>/dev/null || git rev-parse HEAD)"
log "deploy $SHA (anterior: ${PREVIOUS:0:12})"

if ! git fetch --quiet origin main || ! git reset --hard --quiet "$SHA"; then
  log "falha ao posicionar o repositório em $SHA"
  exit 5
fi
log "código em $(git rev-parse --short HEAD) — $(git log -1 --pretty=%s)"

# Nenhum deploy começa sem um backup novo: migrations e troca de imagem nunca
# podem ser o único caminho de volta.
if docker inspect --format '{{.State.Running}}' "$BACKUP_CONTAINER" 2>/dev/null | grep -q true; then
  log "backup pré-deploy"
  if ! docker exec "$BACKUP_CONTAINER" sh -c '. /etc/backup/env.sh && /backup.sh' >/dev/null; then
    log "FALHA no backup pré-deploy; deploy abortado para não arriscar dados"
    exit 8
  fi
else
  log "container de backup parado — primeiro deploy, sem backup prévio"
fi

publish

if wait_healthy; then
  # Site de pé antes do proxy apontar pra ele: se o reload vier antes, o
  # primeiro pedido público pega 502.
  sh deploy/reload-caddy.sh
  printf '%s\n' "$SHA" >"$STATE_FILE"
  log "ok — site healthy e caddy recarregado"
  exit 0
fi

log "FALHA: site não ficou healthy; logs abaixo"
"${COMPOSE[@]}" logs --tail 60 site 2>&1 | sed 's/^/    /' || true

if [[ "$PREVIOUS" != "$SHA" ]]; then
  log "rollback para ${PREVIOUS:0:12}"
  git reset --hard --quiet "$PREVIOUS"
  publish
  wait_healthy && log "rollback ok" || log "rollback também não ficou healthy"
fi

exit 1
