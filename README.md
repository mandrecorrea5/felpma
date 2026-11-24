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
| Área do atleta | `/area` | Formulários disponíveis e já preenchidos, comprovantes, consentimentos, privacidade |
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
- **Destaque da home**: um carrossel com até 3 competições, em ordem de prazo — a escolhida em *Página inicial* primeiro, depois as marcadas como "Destaque na página inicial" e, se faltar, as próximas. **Evento encerrado sai sozinho**: a data de término corta o destaque, inclusive o escolhido manualmente. Gira a cada 7 s, pausa no hover/foco e não gira com `prefers-reduced-motion`.
- **Botão de ação no calendário**: *Ver resultados* (se houver resultado ligado) → *Inscrever atleta* (se inscrições abertas; usa o formulário interno publicado ou, na falta dele, o link externo) → *Ver convocação* → *Detalhes*.
- **Total no resultado**: calculado sozinho (arranco + arremesso) quando fica vazio.
- **Vagas**: o padrão é contar inscrições (quem se inscreve em Sub-17 e Sub-20 ocupa duas). Em *Competições › Contar vagas por* a competição pode optar por contar **atletas**, aí a pessoa ocupa uma vaga só.
- **Curtidas nas notícias**: coração com contador na página da notícia e o número nos cards da listagem e da home. É anônimo: cada navegador recebe um UUID em cookie httpOnly `felpma-visitante` e curte/descurte uma vez por notícia — sem conta, sem IP, sem e-mail. O contador em `noticias.curtidas` é recalculado a partir da coleção **Curtidas** a cada clique (a fonte da verdade é a coleção); o índice único `(noticia, chave)` impede curtida duplicada em cliques simultâneos.
- **Área do atleta**: o cabeçalho e o rodapé apontam para `/area`; *Configurações do site › Links externos* permite sobrescrever com um endereço externo (ex.: SSO).
- **Mais de uma categoria de idade**: o atleta pode se inscrever em várias faixas etárias no mesmo evento (Sub-17, Sub-20, Adulto…) — a pesagem é uma só, então todas as inscrição têm de ficar na **mesma categoria de peso**. O limite vem de *Formulários de inscrição › Inscrições por atleta* (padrão 1, ou seja, o comportamento antigo). Repetir a mesma faixa é recusado; o peso é comparado pelo número em kg do rótulo da categoria ("Sub-17 – 61 kg" = 61 kg), e cada inscrição continua com protocolo, comprovante e confirmação próprios. Quem já se inscreveu vê **Adicionar outra categoria** no detalhe da inscrição e, no formulário, a categoria de peso só oferece o kg já usado.

## Inscrições e área do atleta

O módulo **Inscrições** fica no painel, ao lado de "Competições":

- **Formulários de inscrição** — pertencem a um evento e são montados por blocos (texto,
  e-mail, telefone, data, número, seleção, múltipla escolha, declaração e seção). Publicar
  gera uma **versão** nova; cada inscrição guarda a versão e o snapshot das perguntas.
- **Inscrições recebidas** — protocolo, respostas, consentimentos (texto + hash + data +
  origem), responsável (quando menor) e observações internas.
- **Contas de atleta** — a área do filiado Nível 1. Login próprio, separado do painel.

**Categoria de peso.** A resposta do formulário é copiada para o campo próprio da inscrição,
que aparece na lista do painel, na área do atleta e no CSV. Ela é obrigatória mesmo que o bloco
no CMS não tenha sido marcado como obrigatório: sem categoria não há como organizar a
competição. Inscrições antigas são preenchidas pela migração
`20261120_214500_categoria_peso_inscricao` a partir do snapshot das respostas.

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

**Dados do cadastro aproveitados na inscrição.** O formulário nasce preenchido com o que já
existe na conta: nome, e-mail, telefone, cidade, UF, data de nascimento, idade e **sexo**. Nome,
e-mail, sexo, nascimento e idade ficam travados e o servidor os sobrescreve com o dado da conta —
o atleta não consegue trocar o sexo no navegador para entrar em outra categoria. Telefone,
cidade e UF vêm preenchidos, mas podem ser ajustados para aquela inscrição. O sexo é pedido no
cadastro novo; contas antigas informam uma única vez em **Meus dados** ou na primeira inscrição
(o valor é salvo na conta). A idade usa como referência **31/12 do ano do evento**. Clube/CT,
treinador, prova e categoria de peso não existem na conta e continuam sendo perguntados.

**Comprovante de pagamento depois da inscrição:** em **Área do atleta › Comprovantes**
(`/area/comprovantes`), o atleta escolhe a competição entre as inscrições dele e envia o
comprovante em PDF/JPG/PNG (até 2 MB). O arquivo entra na coleção privada `arquivos-inscricao`
com o campo técnico `comprovante-pagamento`, fica vinculado à inscrição e aparece na área e no
painel (bloco **Comprovantes de pagamento**). Cada envio dispara um e-mail para a caixa
operacional da federação com o comprovante em anexo. O mesmo caminho aparece no detalhe da
inscrição e nos formulários preenchidos da área.

**Pendência de comprovante:** enquanto a inscrição estiver ativa (`recebida`, `em análise`,
`aprovada` ou `lista de espera`) e não tiver nenhum comprovante — nem no formulário, nem pelo
envio posterior —, a área do atleta mostra o selo **Pendente**, o aviso “Falta enviar o
comprovante de pagamento” e um atalho para regularizar. No painel, a lista de inscrições ganha a
coluna **Comprovante** com `Pendente`/`Enviado`. O estado é derivado dos arquivos, então some
sozinho quando o comprovante chega; não sobrescreve a situação oficial da inscrição.

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

### Exportar inscritos de um evento ou formulário

Há dois caminhos, ambos só para **administradores**:

- **Por evento (o mais direto):** abra **Inscrições › Inscrições recebidas**. No topo da lista,
  o bloco **Exportar inscrições** lista os eventos que já receberam inscrições; escolha o evento
  e clique em **Exportar CSV**. O arquivo reúne as inscrições de **todos os formulários daquele
  evento** e, quando há mais de um, ganha a coluna **Formulário** para diferenciá-las.
- **Por formulário:** abra **Inscrições › Formulários de inscrição** e entre no formulário. No
  topo da tela, o botão **Exportar inscritos (N)** baixa o CSV daquele formulário.

O CSV tem uma linha por inscrição e uma coluna por pergunta:

- Traz protocolo, situação, data de envio, versão do formulário, nome, e-mail, CPF, nascimento,
  telefone, cidade/UF, idade, **categoria de peso**, responsável (quando menor) e consentimentos
  aceitos, além de **todas as respostas** — inclusive as de versões anteriores do formulário
  (entram no fim, com o rótulo congelado no snapshot).
- Abre direto no Excel em português: UTF-8 com BOM, separador `;` e valores entre aspas.
- A exportação é registrada na trilha de auditoria (`audit="acesso_dado_pessoal"`); dados
  marcados como sensíveis são decifrados apenas nesse arquivo.
- Endpoints: `GET /api/inscricoes/exportar?evento=:id` e
  `GET /api/formularios-inscricao/:id/exportar` (exigem sessão de administrador).

### Arquivo no formulário (upload privado)

Na aba **Campos**, o bloco **Arquivo (upload)** pede um documento ao atleta — atestado médico,
comprovante de pagamento, declaração do responsável etc.

- **Tipos aceitos** por campo: PDF, PDF ou foto, ou só foto (JPG/PNG). O limite é **2 MB por
  arquivo** e **10 MB por inscrição**, conferido no navegador e de novo no servidor.
- O arquivo **não fica público**: vai para a coleção `arquivos-inscricao` e para o volume
  `uploads-inscricoes`, nunca para `media`. No painel, a inscrição tem o bloco **Arquivos
  enviados**; o atleta baixa o próprio arquivo em **Área do atleta › Inscrição › O que você
  respondeu**.
- Comprovante enviado **depois** da inscrição entra pelo mesmo cofre, com o campo
  `comprovante-pagamento`, e aparece no bloco **Comprovantes de pagamento** do painel. O atleta
  o envia em **Área do atleta › Comprovantes** ou no detalhe da própria inscrição.
- Toda inscrição e todo comprovante geram uma cópia por e-mail para a federação, com os
  arquivos em anexo (ver *E-mail transacional*).
- Fotos são reencodadas com `sharp` (orientação aplicada e EXIF/GPS removidos) antes de gravar;
  PDFs têm o cabeçalho `%PDF-` conferido.
- O download do atleta usa `GET /area/inscricoes/:protocolo/arquivos/:id`, que exige a sessão
  do atleta e confere o dono do arquivo. A API do Payload só serve o arquivo para o painel.
- Limite de upload: o Server Action usa `bodySizeLimit: '12mb'` em `next.config.ts` — sem isso
  o padrão de 1 MB do Next corta a requisição antes da validação.

### Coerência entre campos (grupos de opções)

Campos de seleção podem depender de outro campo para não aceitar combinações impossíveis — por
exemplo, **Master 40+** com **Infantil 35 kg**.

- Em cada opção de **Seleção única** ou **Múltipla escolha** existe o campo **Grupo**. Opções
  que pertencem à mesma faixa recebem o mesmo grupo (ex.: `infantil`, `sub15_sub17`,
  `sub20_adulto_master`).
- No campo que deve ser filtrado (ex.: **Categoria de peso**), preencha **Filtrar opções pelo
  campo** com o nome técnico do campo que define o grupo (ex.: `categoria_idade`).
- O atleta só vê as opções do grupo da categoria escolhida; ao trocar a categoria, uma opção
  incompatível é limpa automaticamente. O servidor repete a regra na validação, então um
  payload forjado também é rejeitado.
- Opções sem grupo continuam sempre visíveis. Sem o campo de referência preenchido, as opções
  com grupo ficam ocultas.

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
- a **confirmação de inscrição**, com evento, protocolo, respostas e link da inscrição;
- a **cópia operacional da federação** de cada inscrição recebida e de cada comprovante de
  pagamento enviado depois, com os arquivos em anexo e `Reply-To` do atleta.

Configure `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS` e `EMAIL_FROM_NAME` no `.env` (e no ambiente
de produção). O domínio do remetente precisa estar verificado no Resend com os registros SPF e
DKIM. A chave começa com `re_` e é criada em **API Keys**.

A caixa da federação é definida por `EMAIL_FEDERACAO`; sem a variável, o padrão é
`lpomaranhao@gmail.com`. Se o Resend recusar o envio com anexo, o sistema tenta de novo sem
anexo para a federação ao menos ser avisada — o original continua no painel.

O formulário de **Contato** (`/contato`) grava a mensagem em **Mensagens de contato** e manda
um aviso para `EMAIL_CONTATO` (padrão `contato@felpma.com.br`), com `Reply-To` do visitante —
basta responder no cliente de e-mail para falar com ele. O envio é best-effort: se o Resend
falhar, a mensagem continua no painel e o visitante vê o sucesso normal.

- **Sem as credenciais em produção:** o cadastro de atleta é bloqueado com uma mensagem clara
  (melhor do que criar uma conta que nunca poderá ser ativada); a recuperação de senha fica
  oculta. A confirmação de inscrição e a cópia da federação apenas registram o erro no log — a
  inscrição já foi feita.
- **Sem as credenciais em desenvolvimento:** nada quebra. O link de ativação/recuperação é
  impresso no terminal (`[e-mail simulado] … link=…`) e o destinatário/assunto dos avisos da
  federação também.

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
- [ ] Confirmar `EMAIL_FEDERACAO=lpomaranhao@gmail.com` e testar o recebimento dos avisos
- [ ] Testar ativação de conta, recuperação de senha, confirmação de inscrição e envio de
      comprovante (com anexo) em produção
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

## Observabilidade (Ndovu)

A observabilidade tem **duas metades**, e elas usam chaves diferentes:

| Metade | O que cobre | Env | Onde ver |
|---|---|---|---|
| Navegador | eventos, erros, web vitals, funis, replay | `NEXT_PUBLIC_NDOVU_*` | dashboard, sessões, issues |
| Servidor | `console.error/warn/info`, exceções, erro de requisição | `NDOVU_OTLP_API_KEY` + `OTEL_*` | aba **Logs** |

**Navegador.** `NEXT_PUBLIC_*` é congelado no bundle durante o build. Preencher a
chave no `.env` da VPS e dar `restart` **não muda nada** — a cadeia é
`.env` → `build.args` do `docker-compose.prod.yml` → `ARG`/`ENV` do `Dockerfile` →
`process.env` em [`client.ts`](src/lib/ndovu/client.ts). Sem a chave o SDK fica
no-op e, em dev, imprime `[ndovu] desativado`.

**Servidor.** O processo Node exporta OTLP/HTTP para
`https://otlp.ndovu.solutions/v1/logs`
([`otlp.ts`](src/lib/observabilidade/otlp.ts), ligado em
[`instrumentation.ts`](src/instrumentation.ts)). É runtime: muda com restart, sem
rebuild. Antes de sair, o corpo passa por sanitização (e-mail, CPF, chave) e o
caminho da requisição é reduzido ao padrão da rota — o protocolo de uma inscrição
nunca vai para lá.

> **App de servidor.** O Ndovu recusa OTLP de app cadastrado como frontend:
> `403 "o app ... não aceita OTLP — marque-o como app de servidor"`. Isso não é
> chave errada nem env faltando. Cadastre um app de servidor (ex.: `felpma-servidor`)
> e use a chave dele em `NDOVU_OTLP_API_KEY` — a chave pública do navegador não serve.

### Lista de verificação

```bash
pnpm verificar:ndovu          # confere env + faz probe real; não envia dado nenhum
pnpm verificar:ndovu --teste  # manda UM log de prova e confirma a chegada
```

O comando sai com código 1 quando algo está faltando e imprime a correção de
cada item. Checklist manual equivalente:

- [ ] `NEXT_PUBLIC_NDOVU_ENDPOINT` é **HTTPS** e alcançável do navegador do visitante
      (localhost/IP interno = bloqueio silencioso por mixed content)
- [ ] `NEXT_PUBLIC_NDOVU_API_KEY` existe (começa com `ndk_`) e a imagem foi **rebuildada**
- [ ] `NEXT_PUBLIC_NDOVU_APP` é exatamente o *Nome* do app no Ndovu (`felpma`)
- [ ] existe um **app de servidor** no Ndovu e a chave dele está em `NDOVU_OTLP_API_KEY`
- [ ] `POST https://otlp.ndovu.solutions/v1/logs` responde 2xx com essa chave
- [ ] depois do deploy, a aba **Logs** mostra a linha de boot
      `observabilidade do servidor ativa (felpma-site …)`
- [ ] `docker compose ... logs site` continua mostrando os mesmos logs (a
      interceptação do `console` preserva a saída original)

Se a aba Logs ficar vazia, a ordem de investigação é: chave presente no container
(`docker compose exec site printenv | grep -i otel`) → resposta do
`pnpm verificar:ndovu --teste` → `stderr` do container, onde o exportador avisa
falha de envio com rate-limit de 5 minutos.

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
