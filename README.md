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
| Área do atleta | `/area` | Formulários disponíveis e já preenchidos, consentimentos, privacidade |
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
- **Botão de ação no calendário**: *Ver resultados* (se houver resultado ligado) → *Inscrever atleta* (se inscrições abertas; usa o formulário interno publicado ou, na falta dele, o link externo) → *Ver convocação* → *Detalhes*.
- **Total no resultado**: calculado sozinho (arranco + arremesso) quando fica vazio.
- **Área do atleta**: o cabeçalho e o rodapé apontam para `/area`; *Configurações do site › Links externos* permite sobrescrever com um endereço externo (ex.: SSO).

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

A área do atleta (`/area`) tem cadastro com **ativação por e-mail**, login, recuperação de
senha, meus dados, consentimentos (revogáveis) e privacidade (exportar JSON ou excluir).

Ao entrar, o atleta cai na lista de **formulários disponíveis** (cada um com botão que abre o
formulário em um clique) e de **formulários preenchidos** (protocolo, evento e situação). Quem
clicou em "Preencher" antes de entrar volta para essa lista com o formulário de origem em
destaque, pronto para continuar — sem precisar procurar o evento no calendário.

**Cadastro novo entra como "Pendente de ativação"** e recebe um e-mail com o link
`/area/ativar?token=…`. Ao clicar, o e-mail é confirmado e a conta vira **Ativa** — o atleta já
entra com e-mail e senha, sem esperar aprovação manual. O link é de uso único e não expira
enquanto não for usado. No painel, o menu **Cadastros aguardando ativação** (com contador) abre
a lista de contas `status = pendente`; se o e-mail não chegar, o administrador pode mudar a
situação para **Ativa** para liberar manualmente (a liberação também marca o e-mail como
confirmado). Cada ativação registra data e, quando manual, quem liberou.
Ela **não** dá acesso ao `/admin`: `admin.user` é `users`, e os helpers de acesso exigem
`user.collection === 'users'` (`src/access/index.ts`). Os endpoints de autenticação que o
Payload criaria para `atletas` (`/api/atletas/login`, `/me`…) são bloqueados em `src/proxy.ts`.

**LGPD:** CPF e dados marcados como sensíveis são gravados cifrados (AES-256-GCM) com índice
cego (HMAC) para busca; o CPF aparece mascarado. Cada aceite guarda o texto exibido, a versão,
o hash e a data, com IP pseudonimizado. O prazo de retenção é calculado por formulário no
momento do envio (`retencaoAte`) e o **expurgo roda sozinho uma vez por dia** no processo do
site (`src/lib/lgpd/expurgo.ts`): inscrição vencida e seus arquivos privados são eliminados.
Desligue com `EXPURGO_DESATIVADO=1` se uma data de retenção estiver errada.

A **trilha de auditoria** de acesso a dado pessoal sai como linha JSON no stdout
(`audit="acesso_dado_pessoal"`), coletada pelo promtail e consultável no Loki: quem (usuário do
painel), o quê (coleção/documento), quando e o IP pseudonimizado. Cobre leitura, alteração e
exclusão em `inscricoes`, `arquivos-inscricao` e `atletas` pelo painel. É log, não tabela — o
schema é aplicado por migrations e criar coleção nova exigiria uma migration gerada contra o
banco de produção; trocar por tabela é um passo separado.

### Exportar inscritos de um formulário

No painel, abra **Inscrições › Formulários de inscrição** e entre no formulário. No topo da
tela, o botão **Exportar inscritos (N)** baixa um CSV com uma linha por inscrição e uma coluna
por pergunta.

- O CSV traz protocolo, situação, data de envio, versão do formulário, nome, e-mail, CPF,
  nascimento, telefone, cidade/UF, idade, responsável (quando menor) e consentimentos aceitos,
  além de **todas as respostas** — inclusive as de versões anteriores do formulário (entram no
  fim, com o rótulo congelado no snapshot).
- Abre direto no Excel em português: UTF-8 com BOM, separador `;` e valores entre aspas.
- **Só administradores** veem o botão e podem chamar o endpoint. A exportação é registrada no
  log do servidor; dados marcados como sensíveis são decifrados apenas nesse arquivo.
- O endpoint é `GET /api/formularios-inscricao/:id/exportar` (exige sessão de administrador).

### Arquivo no formulário (upload privado)

Na aba **Campos**, o bloco **Arquivo (upload)** pede um documento ao atleta — atestado médico,
comprovante de pagamento, declaração do responsável etc.

- **Tipos aceitos** por campo: PDF, PDF ou foto, ou só foto (JPG/PNG). O limite é **2 MB por
  arquivo** e **10 MB por inscrição**, conferido no navegador e de novo no servidor.
- O arquivo **não fica público**: vai para a coleção `arquivos-inscricao` e para o volume
  `uploads-inscricoes`, nunca para `media`. No painel, a inscrição tem o bloco **Arquivos
  enviados**; o atleta baixa o próprio arquivo em **Área do atleta › Inscrição › O que você
  respondeu**.
- Fotos são reencodadas com `sharp` (orientação aplicada e EXIF/GPS removidos) antes de gravar;
  PDFs têm o cabeçalho `%PDF-` conferido.
- O download do atleta usa `GET /area/inscricoes/:protocolo/arquivos/:id`, que exige a sessão
  do atleta e confere o dono do arquivo. A API do Payload só serve o arquivo para o painel.
- Limite de upload: o Server Action usa `bodySizeLimit: '12mb'` em `next.config.ts` — sem isso
  o padrão de 1 MB do Next corta a requisição antes da validação.

### Modal de confirmação com o edital

Na aba **Mensagens › Modal antes do envio**, o formulário pode exibir um modal quando o atleta
clica em **Enviar inscrição**, no último passo:

- **Título** e **texto** do modal são livres; o texto aparece acima do arquivo.
- **Arquivo exibido no modal** escolhe um documento de **Documentos** (o PDF de um edital
  publicado aparece lá automaticamente). Só documentos com **Visível no site** podem ser
  escolhidos, e publicar o formulário valida isso.
- Com o modal configurado, nada é gravado antes do clique em **Confirmar e enviar**. Sem
  arquivo e sem texto, o envio continua direto, como antes.

## Editais

Em **Competições › Editais**, o edital é cadastrado como conteúdo estruturado — não é preciso
produzir o PDF fora do painel. As abas cobrem:

- **Edital** — número/ano, título da convocação, data e horário, local, endereço, abertura e
  disposições preliminares.
- **Inscrições e taxas** — janela de inscrições, e-mail para comprovante, texto, tabela de
  taxas e regras posteriores à tabela.
- **Categorias** — categorias de idade e tabelas de peso (masculino/feminino).
- **Requisitos e textos finais** — requisitos, regras (IWF), direitos de imagem e disposições
  finais.

Os textos aceitam placeholders trocados na geração: `{ano}`, `{titulo}`, `{data}`, `{local}`,
`{cidade}`, `{inscricoesDe}`, `{inscricoesAte}` e `{emailInscricao}`. Ao salvar com
**Publicado no site** marcado, o sistema gera um PDF A4 no padrão da federação (cabeçalho,
tabelas e assinatura, **sem a marca d'água central**) e cria/atualiza automaticamente um
documento em **Documentos › Editais e notas oficiais**. O botão **Baixar PDF** no topo da
edição abre a versão atual mesmo antes de publicar.

O PDF é gerado em `src/lib/editais/pdf.ts` (PDFKit) e o conteúdo padrão fica em
`src/lib/editais/padrao.ts`. Para mudar o texto de um edital específico, edite os campos; para
mudar o padrão de todos os novos, ajuste `padrao.ts`.

### E-mail transacional (Resend)

O site usa o adaptador oficial `@payloadcms/email-resend` (`src/lib/email.ts`). Com ele saem:

- o **link de ativação** da conta de atleta (cadastro);
- a **recuperação de senha** da área do atleta;
- a **confirmação de inscrição**, com evento, protocolo, respostas e link da inscrição.

Configure `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS` e `EMAIL_FROM_NAME` no `.env` (e no ambiente
de produção). O domínio do remetente precisa estar verificado no Resend com os registros SPF e
DKIM. A chave começa com `re_` e é criada em **API Keys**.

- **Sem as credenciais em produção:** o cadastro de atleta é bloqueado com uma mensagem clara
  (melhor do que criar uma conta que nunca poderá ser ativada); a recuperação de senha fica
  oculta. A confirmação de inscrição apenas registra o erro no log — a inscrição já foi feita.
- **Sem as credenciais em desenvolvimento:** nada quebra. O link de ativação/recuperação é
  impresso no terminal (`[e-mail simulado] … link=…`).

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

A VPS (187.41.102.127) tem um Caddy compartilhado (`ingress-caddy`, em
`/srv/apps/ingress`) que segura as portas 80/443 e serve também outros projetos.
Este projeto **não** sobe um proxy próprio: ele entra na network Docker `ingress`
e o domínio é publicado pelo snippet `deploy/caddy/felpma.caddy`, que
`sh deploy/reload-caddy.sh` instala em `/srv/apps/ingress/caddy/conf.d/`, valida
e recarrega. O Caddy faz o TLS (Let's Encrypt) e o reverse proxy até o container
`felpma-site:3000`.

Uma vez na máquina:

```bash
git clone git@github.com:mandrecorrea5/felpma.git /srv/apps/felpma
cd /srv/apps/felpma
docker network create ingress          # idempotente, só na primeira vez
cp .env.example .env                   # PAYLOAD_SECRET, POSTGRES_PASSWORD,
                                       # NEXT_PUBLIC_SERVER_URL=https://felpma.com.br
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile producao up -d --build
```

O overlay de produção não publica porta nenhuma no host (nem o 5432) e trava os
limites de CPU/memória.

**Deploy automático** (`.github/workflows/ci.yml`): o CI entra por SSH como o
usuário `deploy` (compartilhado com os outros sites da VPS, grupo `docker`), com
uma chave **travada em `/usr/local/bin/felpma-deploy`** (`restrict,command=`):
ela só aceita `deploy <sha>`, não abre shell. O script é `deploy/remote-deploy.sh`
(reinstale em `/usr/local/bin` como root quando mudar): faz backup, posiciona o
repo no SHA, sobe a stack, espera o healthcheck, recarrega o Caddy e volta ao SHA
anterior se falhar. Secrets do GitHub: `VPS_HOST`, `VPS_USER` (`deploy`),
`VPS_SSH_KEY` (privada) e `VPS_KNOWN_HOSTS` (saída de `ssh-keyscan -t ed25519 <host>`).
O `git fetch` do `deploy` usa uma deploy key só de leitura deste repositório
(`~deploy/.ssh/github_felpma`, host `github-felpma`).

Outro site na mesma VPS segue o mesmo modelo: uma chave própria no
`~deploy/.ssh/authorized_keys` apontando para o seu `<site>-deploy`.

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
- [ ] Configurar o Resend (`RESEND_API_KEY`, `EMAIL_FROM_ADDRESS`) e verificar o domínio no DNS
- [ ] Testar ativação de conta, recuperação de senha e confirmação de inscrição em produção
- [ ] Preencher `R2_*` + `HEALTHCHECK_URL` no `.env` do servidor e rodar `bash deploy/backup/test-restore.sh`

## Backup

O serviço `backup` (só no overlay de produção) roda 03:00 todo dia e gera quatro
artefatos por execução em `deploy/backup/backups/`:

| Arquivo | Origem |
|---|---|
| `felpma-<data-hora>.dump` | `pg_dump -Fc` do banco |
| `felpma-media-<data-hora>.tar.gz` | volume `uploads-media` (imagens do painel) |
| `felpma-documentos-<data-hora>.tar.gz` | volume `uploads-documentos` (PDFs) |
| `felpma-arquivos-inscricao-<data-hora>.tar.gz` | volume `uploads-inscricoes` (arquivos privados das inscrições) |

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
