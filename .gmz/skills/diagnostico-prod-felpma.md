---
name: diagnostico-prod-felpma
description: Playbook de diagnóstico da produção do felpma (VPS Hostinger + Caddy compartilhado): site 500 com healthz verde, Postgres EAI_AGAIN, e env NEXT_PUBLIC que "não pega".
created: 2026-10-22T02:21:19.099Z
---

# Diagnóstico da produção do felpma

Site: `https://felpma.com.br` → VPS Hostinger `2.24.205.200`, `/opt/felpma`, Caddy compartilhado (rede Docker `ingress`), Postgres + site no mesmo compose.

## Passo 1 — separar borda de aplicação, de fora da VPS

```bash
dig +short felpma.com.br
curl -sS -o /dev/null -w "http=%{http_code} time=%{time_total}s\n" --max-time 25 https://felpma.com.br/
curl -sS -o /dev/null -w "http=%{http_code} time=%{time_total}s\n" --max-time 25 https://felpma.com.br/healthz
curl -sS -o /dev/null -w "http=%{http_code} time=%{time_total}s\n" --max-time 25 https://felpma.com.br/admin
```

Leitura (padrões confirmados em INCIDENTE REAL 2026-10-21):

| sinal | diagnóstico |
|---|---|
| conexão recusa / TLS errada / bad gateway | Caddy, DNS ou container morto — problema de borda |
| `/healthz` 200 **e** `/` 500 com **~10s** de latência | Next vivo, **Postgres inalcansível**. Timeout de DNS interno, não erro de código |
| 500 rápido (<1s) | erro de aplicação/migration — ler `logs site` |
| corpo com `id="__next_error__"` | 500 é do **Next**, não do Caddy → o Node respondeu |

`/healthz` **não toca o banco** (`src/app/healthz/route.ts` devolve só `{ok:true}`). Healthcheck verde ≠ site saudável. Nunca confiar nele como prova de que o deploy funciona.

## Passo 2 — quem está rodando, de verdade

```bash
cd /opt/felpma   # NUNCA de /root: o compose precisa dos -f
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=60 site
docker inspect -f '{{.Name}} {{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' felpma-site felpma-postgres
docker volume ls | grep felpma
```

### Assinatura do "compose base no lugar do overlay"

O overlay de produção define `container_name: felpma-postgres` (nome fixo) e `ports: !reset []`. Então:

- container chamado **`felpma-postgres-1`** (sufixo `-1`) → criado pelo **compose base**, sem overlay
- **`0.0.0.0:5432->5432/tcp` publicado** → base; em produção o Postgres não publica porta
- `docker exec felpma-postgres ...` → *"No such container"*
- `felpma-site` em `felpma_felpma-net` + `ingress`, postgres em `felpma_default`
- log: `getaddrinfo EAI_AGAIN postgres` (`code: EAI_AGAIN`, `hostname: postgres`)

**Causa:** alguém rodou `docker compose up -d` sem `-f docker-compose.yml -f docker-compose.prod.yml --profile producao`. O Postgres ficou em outra rede, o DNS `postgres` não resolve, e o Postgres ficou **exposto em 0.0.0.0:5432 num host com IP público**.

**Conserto** (o volume é o mesmo `felpma_pgdata` do mesmo projeto → nenhum dado se perde):

```bash
docker rm -f felpma-postgres-1
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile producao up -d --no-build
docker restart felpma-site
curl -sS -o /dev/null -w "%{http_code}\n" https://felpma.com.br/
```

`down -v` **apaga** `pgdata` + os dois volumes de upload. Nunca.

## Passo 3 — env NEXT_PUBLIC "não pegou"

`NEXT_PUBLIC_*` é **congelado no bundle do navegador no build**. Renomear/preencher no `.env` da VPS e dar `restart` NÃO muda nada no que está no ar.

Cadeia obrigatória: `.env` (VPS) → interpolação em `docker-compose.prod.yml` `build.args` → `ARG`/`ENV` no `Dockerfile` → `process.env` em `src/lib/ndovu/client.ts`.

```bash
cd /opt/felpma
grep NDOVU .env
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile producao up -d --build site
# provar que a chave entrou no bundle do navegador, sem depender do browser:
docker exec felpma-site sh -c "grep -rlo 'ndk_' /app/.next/static | head -3"
```

Armadilha de nome: o Ndovu lê `NEXT_PUBLIC_NDOVU_ENDPOINT` + `NEXT_PUBLIC_NDOVU_API_KEY` (duas). `NEXT_PUBLIC_NDOVU_ENDPOINT_API_KEY` não existe em lugar nenhum do repo e fica vazia em silêncio.

## Ndovu: "não chega nada" quase nunca é falha

- O aviso `"[ndovu] desativado"` só sai em **dev** (`client.ts`, guardado por `NODE_ENV !== 'production'`). Em prod é mudo.
- O SDK loga recusa de lote com **`console.warn`** (`ndovu-browser.js`, `warn()`), e ele intercepta só `console.error`. DevTools filtrado em "Errors" esconde o `ndovu: N eventos recusados (HTTP 4xx)`. Pedir "não tem erro no console" ≠ "não tem warn".
- Nome do pageview é **`tela_<rota>`** (`pageView` faz `name: 'tela_' + screen`), não `page_view`.
- Flush a cada **5s** (`flushIntervalMs`) ou no `pagehide`. `window.__felpma_ndovu__.flush()` força.
- Estado: `window.__felpma_ndovu__.estado()` → `{ativo, app, liberado, falhaInterna}`.
- Verdade real fica na aba **Network** (o `POST /v1/events` e o status), não no console.
- `NEXT_PUBLIC_NDOVU_ENDPOINT` precisa ser HTTPS alcançável **do navegador do usuário** — `localhost` ou IP interno da VPS = bloqueio silencioso por mixed content.
- `NEXT_PUBLIC_NDOVU_APP` deve ser exatamente o campo *Nome* do app no backoffice (senão 401/403 e o lote é descartado sem retry).
- Recusa de lote: `NON_RETRYABLE = [400,401,403,404,413]` descarta; outros status voltam pra fila (dedupe por `eventId`).

## Ruído conhecido (corrigido 2026-10-21)

`observarMutacoes` capturava **qualquer** POST não-GET, incluindo o beacon `g/collect` do Google Analytics (`@next/third-parties/google`, GA `G-NBE78VLWCS`) — e `caminhoDe()` descarta o domínio, então o GA aparecia como `mutacao` com `url: "/g/collect"` no funil. Filtro de mesma origem (`mesmaOrigem`) resolve. Se voltar a aparecer mutação de terceiro, é esse caminho.
