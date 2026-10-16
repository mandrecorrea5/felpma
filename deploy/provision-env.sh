#!/bin/sh
# Gera o .env de produção da VPS sem que nenhum valor passe pelo terminal.
#
#   sh deploy/provision-env.sh [/opt/felpma]
#
# POSTGRES_PASSWORD e PAYLOAD_SECRET NÃO EXISTIAM antes: são gerados aqui com
# openssl. O script escreve no arquivo e nunca dá echo deles — quem precisar ver
# um valor, na máquina, faz `nano /opt/felpma/.env`.
#
# Idempotente por omissão: se o .env já existe, ele se recusa a rodar. Recriar
# um PAYLOAD_SECRET existente derruba as sessões do painel, e recriar a senha do
# Postgres deixa o banco existente inalcançável. Trocar valor é edição manual.
#
# DATABASE_URL fica de fora de propósito: o docker-compose.yml deriva o valor do
# POSTGRES_PASSWORD (postgres://felpma:${POSTGRES_PASSWORD}@postgres:5432/felpma).
# Colocar a senha em dois lugares no mesmo arquivo é a receita para uma das duas
# divergir e o site não achar mais o banco.
set -eu

DIR="${1:-/opt/felpma}"
ENV="${DIR}/.env"

test -d "${DIR}" || { echo "ERRO: ${DIR} não existe — clone o repositório antes."; exit 1; }
test -e "${ENV}" && { echo "ERRO: ${ENV} já existe — edite em vez de recriar."; exit 1; }
command -v openssl >/dev/null 2>&1 || { echo "ERRO: openssl não encontrado."; exit 1; }

PGPASS="$(openssl rand -hex 32)"
SECRET="$(openssl rand -hex 32)"

# 0600 antes de escrever: o arquivo nasce sem permissão de leitura para
# qualquer outro usuário, inclusive se o diretório estiver world-readable.
umask 077

cat > "${ENV}" <<EOF
# ===========================================================================
# FELPMA — produção (/opt/felpma)
# Gerado por deploy/provision-env.sh em $(date -u '+%Y-%m-%d %H:%M:%S UTC')
#
# Este arquivo é a única fonte de segredo deste projeto na máquina.
# 0600, dono root, fora do git (.gitignore).
# ===========================================================================

# --- Postgres ---------------------------------------------------------------
# Compartilhado por três consumidores do compose: o serviço postgres (dá a
# senha ao servidor), o serviço site (compõe o DATABASE_URL) e o serviço
# backup (mesma senha para o pg_dump).
POSTGRES_PASSWORD=${PGPASS}

# --- Payload ----------------------------------------------------------------
# Assina os cookies de login do painel. Trocar este valor desconecta quem
# estiver logado, e invalida links de recuperação de senha pendentes.
PAYLOAD_SECRET=${SECRET}

# --- Endereço público -------------------------------------------------------
# Sem www: é o host canônico, e o www redireciona pra ele no Caddy.
# Next congela NEXT_PUBLIC_* no momento do build, então ele entra como build
# arg (docker-compose.prod.yml). Mudar aqui exige rebuild, não só restart.
NEXT_PUBLIC_SERVER_URL=https://felpma.com.br

# --- Backup ------------------------------------------------------------------
# Com as quatro R2_* vazias o upload é pulado e o dump fica só no disco da VPS
# — que é o disco que já carrega o ranking-lpo, ou seja: sem backup de fato.
# Preencha (Cloudflare R2 -> R2 -> Manage R2 API Tokens) com nano na máquina.
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_ENDPOINT=
R2_BUCKET=felpma-backups

# healthchecks.io: crie um check (período 24h, grace 2h) e cole o ping URL.
# O alarme é o silêncio — check sem batida é o sinal de que o backup não rodou.
HEALTHCHECK_URL=
EOF

chmod 600 "${ENV}"

echo "OK: ${ENV} criado (0600). Nenhum valor impresso nesta tela."
echo
echo "Chaves presentes (nome + tamanho, valor não é revelado):"
awk -F= '/^[A-Z0-9_]+=/{ printf "  %-26s %d chars%s\n", $1, length($2), ($2==""?"  <- vazio, a preencher":"") }' "${ENV}"
