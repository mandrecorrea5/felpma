# FELPMA — site institucional

Site da Federação de Levantamento de Pesos do Maranhão, feito com **Next.js 16** e **Payload CMS 3** (painel administrativo embutido, em português) sobre **Postgres**.

O visual segue o layout criado no Claude Design: azul `#1C0A96`, vermelho `#D7000F`, preto `#14141A`, Montserrat nos títulos e IBM Plex Sans no texto. As fontes são servidas pelo próprio site, sem Google Fonts.

## Rodando localmente

Requisitos: Node 20.18+ (recomendado 22), pnpm e Docker (ou um Postgres instalado).

```bash
cp .env.example .env          # ajuste se necessário
docker compose up -d          # sobe o Postgres
pnpm install
pnpm seed                     # conteúdo de exemplo + usuário admin (a senha aparece no terminal)
pnpm dev
```

- Site: http://localhost:3000
- Painel: http://localhost:3000/admin

> O `pnpm seed` **apaga** o conteúdo existente antes de recriar. Use só em desenvolvimento.
> Tudo que aparece entre colchetes, como `[Nome do CT 1]`, é placeholder para a federação substituir.

## O que tem no site

| Página | Endereço | Conteúdo vem de |
|---|---|---|
| Início | `/` | Página inicial (global) + competições, notícias, convocações, CTs |
| Notícias | `/noticias`, `/noticias/[slug]` | Notícias (com rascunho e pré-visualização) |
| Calendário | `/calendario`, `/calendario/[slug]` | Competições e eventos |
| Feed de agenda | `/calendario.ics` | Assinável no Google Agenda, Outlook e iPhone |
| Eventos e cursos | `/eventos` | Competições do tipo Curso/Evento |
| Inscrições | `/inscricoes/[slug]` | Formulário de inscrição do evento (só com login) |
| Área do atleta | `/area` | Conta do atleta: inscrições, consentimentos, privacidade |
| Convocações | `/convocacoes` | Convocações (PDF obrigatório) |
| Resultados | `/resultados`, `/resultados/[slug]` | Resultados (tabela por atleta e/ou súmula PDF) |
| Recordes estaduais | `/recordes` | Recordes |
| Centros de Treinamento | `/centros`, `/centros/[slug]` | Centros (com mapa OpenStreetMap) |
| Filiação | `/filiacao` | Filiação (global): perfis, documentos, anuidade, FAQ |
| A Federação | `/federacao` | A Federação (global) + Diretoria |
| Documentos | `/documentos` | Documentos (estatuto, regulamentos, editais…) |
| Transparência | `/transparencia` | Documentos das categorias de prestação de contas, atas, convênios e estatuto |
| Contato | `/contato` | Formulário: as mensagens caem em **Mensagens de contato** no painel |
| Busca | `/busca` | Busca em notícias, competições, documentos, convocações, CTs e resultados |
| Páginas avulsas | `/institucional/[slug]` | Ex.: política de privacidade (`politica-de-privacidade`) |

Também ficam disponíveis `sitemap.xml`, `robots.txt`, metadados de compartilhamento e dados estruturados (schema.org) nas páginas de competição.

### Regras automáticas úteis

- **Status das competições**: no modo "Automático", o site mostra *Inscrições abertas*, *Em breve*, *Em andamento* ou *Encerrado* conforme as datas. Para *Convocação publicada*, *Adiado* ou *Cancelado*, escolha manualmente.
- **Destaque da home**: a competição escolhida em *Página inicial*; se não houver, a marcada como "Destaque" ou, por último, a próxima competição estadual.
- **Botão de ação no calendário**: *Ver resultados* (se houver resultado ligado) → *Inscrever atleta* (se inscrições abertas e link preenchido) → *Ver convocação* → *Detalhes*.
- **Total no resultado**: calculado sozinho (arranco + arremesso) quando fica vazio.
- **Área do filiado**: o link só aparece quando preenchido em *Configurações do site › Links externos*.

## Inscrições e área do atleta

O módulo **Inscrições** fica no painel, ao lado de "Competições":

- **Formulários de inscrição** — pertencem a um evento e são montados por blocos (texto,
  e-mail, telefone, data, número, seleção, múltipla escolha, declaração e seção). Publicar
  gera uma **versão** nova; cada inscrição guarda a versão e o snapshot das perguntas.
- **Inscrições recebidas** — protocolo, respostas, consentimentos (texto + hash + data +
  origem), responsável (quando menor) e observações internas.
- **Contas de atleta** — a área do filiado Nível 1. Login próprio, separado do painel.

**Quem manda na inscrição é o evento.** Na edição da competição, o grupo lateral
*Inscrições* tem a chave "Permitir inscrições", a janela (`Inscrições de`/`até`), o limite de
vagas e o aviso fora do período. A regra vive em `src/lib/inscricoes/estado.ts` e é aplicada
na página, no formulário **e** na server action — link salvo não fura a janela.

A área do atleta (`/area`) tem cadastro com **aprovação manual**, login, recuperação de senha,
meus dados, consentimentos (revogáveis) e privacidade (exportar JSON ou excluir).

**Cadastro novo entra como "Pendente de aprovação"** e não consegue entrar até ser liberado.
No painel, o menu **Cadastros pendentes** (com contador) abre a lista de contas filtradas por
`status = pendente`; abra a conta, mude a situação para **Ativa** e salve. A aprovação registra
quem aprovou e quando. Enquanto não houver SMTP contrato, não há confirmação de e-mail — a
aprovação do administrador é o controle de entrada.
Ela **não** dá acesso ao `/admin`: `admin.user` é `users`, e os helpers de acesso exigem
`user.collection === 'users'` (`src/access/index.ts`). Os endpoints de autenticação que o
Payload criaria para `atletas` (`/api/atletas/login`, `/me`…) são bloqueados em `src/proxy.ts`.

**LGPD:** CPF e dados marcados como sensíveis são gravados cifrados (AES-256-GCM) com índice
cego (HMAC) para busca; o CPF aparece mascarado. Cada aceite guarda o texto exibido, a versão,
o hash e a data, com IP pseudonimizado. O prazo de retenção é calculado por formulário no
momento do envio (`retencaoAte`). O expurgo automático e a trilha de auditoria entram na Fase 2.

### E-mail transacional (SMTP)

Hoje só a **recuperação de senha** usa SMTP — o cadastro é liberado pela aprovação no painel.
Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` e `SMTP_FROM_NOME`
no `.env` quando o provedor estiver contratado.

- **Sem SMTP:** o link "Esqueci minha senha" fica oculto e a página de recuperação explica que
  o recurso ainda não está disponível — nada quebra.
- **Com SMTP em desenvolvimento:** o link de recuperação aparece no terminal
  (`[e-mail simulado] … link=…`).

### Chaves de LGPD (obrigatórias em produção)

- `LGPD_CHAVE_CAMPOS` — 32 bytes em base64 (`openssl rand -base64 32`). **Perder a chave é
  perder os dados cifrados.** Guarde uma cópia fora do servidor.
- `LGPD_HASH_SALT` — sal do índice cego (`openssl rand -hex 32`).

Sem `LGPD_CHAVE_CAMPOS`, o app falha ao gravar dado pessoal em produção (de propósito).

### Verificação rápida do módulo

```bash
pnpm verificar:inscricoes
```

Cria evento/formulário de teste, confere a cifra do CPF, a retenção e o isolamento de acesso
(token de atleta não cria competição, não lista usuários do painel etc.). Precisa do site
rodando.

## Estrutura do código

```
src/
  app/(frontend)/     páginas públicas
  app/(payload)/      painel e API do Payload (gerado; não editar)
  collections/        coleções do CMS (notícias, competições, resultados…)
  globals/            páginas fixas (home, filiação, federação, configurações)
  components/         componentes do site (cabeçalho, cartões, mapa…)
  lib/                consultas, formatação de datas, constantes
  migrations/         migrations do banco (produção)
  seed/               conteúdo de exemplo
```

## Mudando o modelo de dados

Em desenvolvimento, o Payload sincroniza o banco sozinho quando você altera uma coleção. Antes de publicar, gere uma migration:

```bash
pnpm migrate:create nome-da-mudanca
pnpm generate:types
```

Em produção, as migrations pendentes rodam automaticamente quando o servidor inicia.

## Publicando

O build não precisa de banco: as páginas são renderizadas a cada visita, então o que muda no painel aparece no site na hora.
### Em um servidor com Docker (VPS)

A VPS já roda o stack do `ranking-lpo` (`weightlogx.com.br`), e o Caddy dele é
quem segura as portas 80/443. Este projeto **não** sobe um proxy próprio: ele
entra na network Docker `ingress` e o domínio é publicado no
`ranking-lpo/deploy/caddy/Caddyfile`, que faz o TLS e o reverse proxy até o
container `felpma-site:3000`.

Uma vez na máquina:

```bash
git clone git@github.com:mandrecorrea5/felpma.git /opt/felpma
cd /opt/felpma
docker network create ingress          # idempotente, só na primeira vez
cp .env.example .env                   # PAYLOAD_SECRET, POSTGRES_PASSWORD,
                                       # NEXT_PUBLIC_SERVER_URL=https://felpma.com.br
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile producao up -d --build
```

O overlay de produção não publica porta nenhuma no host (nem o 5432) e trava os
limites de CPU/memória. O deploy automático (`.github/workflows/ci.yml`) roda os
mesmos comandos via SSH em `/opt/felpma` — precisa dos secrets `VPS_HOST`,
`VPS_USER` e `VPS_SSH_KEY` no GitHub, os mesmos valores usados no
`ranking-lpo`.

DNS: `felpma.com.br` e `www.felpma.com.br` apontando para o IP da VPS. O `www` é
redirecionado para a raiz.

### Em plataformas serverless (Vercel e similares)

Nessas plataformas o disco não é persistente. Antes de publicar, configure um armazenamento de arquivos do Payload (por exemplo `@payloadcms/storage-s3` ou `@payloadcms/storage-vercel-blob`) e um Postgres gerenciado.

### Antes de ir ao ar

- [ ] Trocar a senha do administrador e criar usuários *Editor* para quem publica conteúdo
- [ ] Preencher *Configurações do site*: logo, CNPJ, endereço, e-mail, redes sociais
- [ ] Substituir todos os placeholders `[...]` e os PDFs de exemplo
- [ ] Revisar a política de privacidade com a assessoria jurídica
- [ ] Nomear o encarregado (DPO) e publicar o canal de atendimento
- [ ] Gerar `LGPD_CHAVE_CAMPOS` e `LGPD_HASH_SALT` e guardar a chave fora do servidor
- [ ] Configurar o SMTP (sem isso, só a recuperação de senha fica indisponível)
- [ ] Configurar um adaptador de e-mail do Payload, para recuperação de senha do painel
- [ ] Preencher `R2_*` + `HEALTHCHECK_URL` no `.env` do servidor e rodar `bash deploy/backup/test-restore.sh`

## Backup

O serviço `backup` (só no overlay de produção) roda 03:00 todo dia e gera três
artefatos por execução em `deploy/backup/backups/`:

| Arquivo | Origem |
|---|---|
| `felpma-<data-hora>.dump` | `pg_dump -Fc` do banco |
| `felpma-media-<data-hora>.tar.gz` | volume `uploads-media` (imagens do painel) |
| `felpma-documentos-<data-hora>.tar.gz` | volume `uploads-documentos` (PDFs) |

Os uploads precisam do tar.gz: o banco guarda só o caminho do arquivo, então um
restore que trouxer apenas o dump devolve páginas com imagem quebrada.

Retenção: 14 dias no disco da VPS, 30 dias no Cloudflare R2 (se as envs `R2_*`
estiverem no `.env` — sem elas o upload é pulado e o backup fica mono-disco).
`HEALTHCHECK_URL` (healthchecks.io) é o alarme: silêncio no check = backup não
rodou.

```bash
# dispara um backup agora, sem esperar o cron
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backup sh -c '. /etc/backup/env.sh && /backup.sh'

# agenda e últimos artefatos
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=40 backup
ls -lh deploy/backup/backups/

# valida que o backup mais remoto restaura (Postgres efêmero, não toca em prod)
bash deploy/backup/test-restore.sh
```

O `test-restore.sh` exige as envs `R2_*` no `.env` e a porta 55434 livre.

## Fora deste projeto (por enquanto)

- **Área do filiado — Nível 2 e 3** (perfil esportivo, documentos pessoais, anuidade,
  pagamento, carteirinha). O Nível 1 (login, inscrições, consentimentos, privacidade) está
  em `/area`.
- **Área da diretoria** (gestão interna)
- **Ranking estadual** (pode ser calculado a partir dos resultados já cadastrados)

## Comandos

| Comando | O que faz |
|---|---|
| `pnpm dev` | Servidor de desenvolvimento |
| `pnpm build` / `pnpm start` | Build e servidor de produção |
| `pnpm seed` | Recria o conteúdo de exemplo |
| `pnpm migrate:create <nome>` | Gera migration a partir das mudanças nas coleções |
| `pnpm migrate` | Aplica migrations pendentes manualmente |
| `pnpm generate:types` | Atualiza `src/payload-types.ts` |
| `pnpm lint` / `pnpm typecheck` | Verificações de código |
