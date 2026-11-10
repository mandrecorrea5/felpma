---
name: vps-compartilhada-caddy
description: Publica um projeto novo na VPS 2.24.205.200 (Hostinger) sem segundo proxy: ingress Docker compartilhada + import de sites por repositório no Caddy do ranking-lpo.
created: 2026-10-16T19:04:34.664Z
---

# Projeto novo na VPS que já roda o ranking-lpo (weightlogx.com.br)

Uma VPS Hostinger, 1 CPU / 4 GB, Debian 13, `root@2.24.205.200`, stack em `/opt/ranking-lpo`.
O `ranking-caddy` (`caddy:2.8-alpine`, container `ranking-caddy`) é o único dono das portas 80/443.
Segundo Caddy/nginx é impossível. Casos reais: felpma (felpma.com.br) em `/opt/felpma`.

## Formato

Cada projeto é dono do próprio bloco de site, no próprio repo, e o Caddyfile do
ranking-lpo só importa o diretório. Ninguém abre PR no projeto alheio pra trocar a própria URL.

```
/opt/<projeto>/deploy/caddy/<projeto>.caddy     ← repo do projeto
        ↓ bind mount read-only
ranking-caddy:/etc/caddy/sites/
        ↓
Caddyfile do ranking-lpo: import /etc/caddy/sites/*.caddy
```

## No projeto novo

`docker-compose.yml` + overlay de produção:

```yaml
networks:
  felpma-net: { driver: bridge }
  ingress:    { external: true }
```

- **Nenhuma porta publicada** no host (`ports: !reset []` no overlay). Nem o Postgres.
- O serviço de site entra nas duas networks: `felpma-net` (banco) + `ingress` (proxy).
- Nomes de container fixos (`container_name`): é por eles que o Caddy resolve via DNS do Docker.
- Healthcheck próprio; o CI só dá verde depois de `healthy`.

`deploy/caddy/<projeto>.caddy` — domínio **literal**, sem `{$ENV}`: o container do
ranking-lpo só recebe as envs do `.env` dele, e exigir uma env sua ali é acoplamento.

```
www.exemplo.com.br { redir https://exemplo.com.br{uri} permanent }

exemplo.com.br {
	encode zstd gzip
	request_body { max_size 30MB }
	reverse_proxy {
		dynamic a { name <container>-site port 3000 refresh 10s }
	}
}
```

`dynamic a` **não é opcional**: sem ele, todo `--force-recreate` troca o IP do container
e o Caddy continua batendo no IP velho, devolvendo 502 até alguém reiniciá-lo.

## No ranking-lpo (uma vez só)

`docker-compose.prod.yml`, serviço `caddy`:

```yaml
    volumes:
      - /opt/<projeto>/deploy/caddy:/etc/caddy/sites:ro
    networks:
      - ranking-net
      - ingress
# topo do arquivo
networks:
  ingress: { external: true }
```

`deploy/caddy/Caddyfile`, no fim: `import /etc/caddy/sites/*.caddy`

## Aplicar

```bash
docker network inspect ingress >/dev/null 2>&1 || docker network create ingress   # uma vez
# mudanças no caddy (NÃO usar o up inteiro — recria Postgres e derruba o vizinho):
cd /opt/ranking-lpo && git pull --ff-only
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate caddy
docker inspect ranking-caddy --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}'
#   → precisa devolver: ingress ranking-lpo_ranking-net

# no deploy do projeto novo, depois do site healthy:
docker exec ranking-caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
docker exec ranking-caddy caddy reload   --config /etc/caddy/Caddyfile --adapter caddyfile
```

`reload` é zero-downtime e não recria container. `validate` antes, sempre: um erro de
sintaxe no arquivo de um projeto derrubaria os sites do outro.

## Armadilhas já medidas

- **`import?` não existe no Caddy 2.8.** O 2.8.4 tokeniza `import?` como endereço de site e
  cria um bloco fantasma chamado `import?` que valida com exit 0. Use `import` simples:
  glob sem correspondência (diretório vazio ou inexistente) **não** é erro nos 4 estados testados.
- **Montar o diretório inteiro `:/etc/caddy:ro` quebra**: o Docker não consegue criar o
  mountpoint `sites` dentro de um bind já montado read-only. Monte só o `Caddyfile` (arquivo).
- **Merge no `main` do ranking-lpo dispara deploy completo** (`git reset --hard` +
  `--force-recreate --remove-orphans` + Playwright). Pra aplicar só o caddy, merge com
  `[skip ci]` no título.
- **Build na VPS**: 1 CPU, 4 GB, **0 swap** por padrão, 12 containers no ar, e limites de
  memória do compose não se aplicam à fase de build. Crie swapfile antes do primeiro build.
- **`packageManager` no package.json é obrigatório** pra imagens que usam `corepack enable`:
  sem ele o corepack baixa o pnpm mais recente do dia, e CI (versão fixa) e build divergem.
- **Host inexistente na 80 devolve 308 também** (redirect usa o `Host` pedido) — não serve de
  controle. Prova de que um site entrou é listar as rotas da config viva.

## Verificar

```bash
# config viva (não o arquivo em disco) — mostra quem está servindo agora
docker exec ranking-caddy wget -T 5 -qO- http://127.0.0.1:2019/config/apps/http/servers/srv0/routes \
  | python3 -c "import json,sys;print(' '.join(sorted({h for r in json.load(sys.stdin) for m in r.get('match',[]) for h in m.get('host',[])})))"

docker exec <site> wget -qO- http://127.0.0.1:3000/healthz     # app, sem depender do proxy
```

## DNS (Cloudflare + registro.br)

Nuvem **cinza** (DNS only): o Caddy emite e renova o próprio Let's Encrypt, e a imagem
`caddy:2.8-alpine` não traz módulo `dns.cloudflare` — com a nuvem laranja a renovação falha
em silêncio e o certificado vence.

O registro.br **grava e só delega com countdown** (mostra "~2h"). Enquanto não virar,
`dig +norecurse NS <dominio> @a.dns.br` continua devolvendo os NS antigos — é a fonte da
verdade, sem cache. Nada disso trava: zone na Cloudflare, clone na VPS, `.env`, build,
subir o stack e até o `caddy reload`. Só a emissão do certificado espera.
