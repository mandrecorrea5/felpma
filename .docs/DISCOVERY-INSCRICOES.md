# Discovery — Cadastro de formulários de inscrição (painel) + área do atleta

**Projeto:** FELPMA — Next.js 16.3.3 + Payload CMS 3.91 + Postgres 16 (`main` @ `223b8ca`)
**Data:** 30/10/2026 · versão 1.0
**Status:** Nível 1 implementado e verificado; Fase 2 pendente (ver 2.2).

> **Aviso:** a parte de LGPD deste documento é orientação de engenharia para implementar
> controles técnicos. Ela **não substitui** parecer jurídico nem a atuação do encarregado
> (DPO) da federação. Os textos legais, as bases legais escolhidas e o prazo de retenção
> precisam de validação da assessoria jurídica antes de ir ao ar.

---

## 1. Resumo executivo

Vamos criar, no painel (o que você chama de *Playground*), um módulo **Inscrições** com três
peças: **formulários** montados pela federação, **inscrições recebidas** e **contas de atleta**.
O formulário pertence a uma competição/evento já cadastrado, e é o **evento** que decide se a
inscrição existe, quando abre, quando fecha e se o formulário aparece no site — uma única
regra, aplicada no servidor, sem depender da tela.

No site, o atleta entra na **área do atleta** (login próprio, separado do painel), abre a
inscrição do evento, preenche em 4 passos, aceita os consentimentos de LGPD e recebe um
protocolo. A federação acompanha, aprova, rejeita, exporta e — o ponto mais delicado —
**guarda o mínimo necessário, pelo tempo necessário, com prova de consentimento e trilha de
quem acessou o quê**.

Três coisas do pedido mudam o tamanho do projeto e precisam estar explícitas:

1. **"Só com login"** — hoje o felpma **não tem** área do filiado (o link no header é externo e
   está vazio). Então o login de atleta entra no escopo, com cadastro, aprovação manual e
   recuperação de senha. É mais ou menos 1/3 do esforço — e o isolamento em relação ao painel
   exige corrigir antes o helper `authenticated`, que hoje aceita **qualquer** usuário
   autenticado, de qualquer coleção (seção 4.3).
2. **"Formulário"** — não é uma tela fixa: é um construtor de campos. Isso exige validação no
   servidor do que foi respondido (o CMS não valida JSON de respostas sozinho).
3. **"LGPD rigorosa"** — não é um checkbox no rodapé. Envolve criptografia de campo, upload
   privado, retenção com expurgo automático, prova de consentimento e trilha de auditoria —
   e joga luz sobre lacunas que **já existem** no site hoje (seção 9.11).

**Esforço indicativo:** Fase 1 (MVP utilizável) 14–18 dias · Fase 2 (gestão + LGPD
operacional) 10–12 dias · Fase 3 (extras) 6–8 dias. Total ~32–40 dias de desenvolvimento,
fora o trabalho jurídico (política, ROPA, RIPD, contratos), que corre em paralelo.

---

## 2. Entendimento do pedido

| Pedido | Como será atendido |
|---|---|
| Área de cadastro de formulários no painel | Coleção **Formulários de inscrição**, grupo "Inscrições", com construtor de campos por *blocks* e versionamento |
| Depende de um evento criado antes | Campo `evento` obrigatório (relação com `competicoes`); sem evento não há formulário nem inscrição |
| O evento controla se permite inscrição | Grupo "Inscrições" na edição do evento: liga/desliga, janela de datas, vagas, aviso fora do período |
| Formulário disponível no período | Função única de estado (`estadoInscricao`) usada na tela pública **e** na server action; o cliente nunca decide |
| Fácil de preencher | Formulário em 4 passos, com resumo, erros por campo, autofill, mobile-first |
| Design system do frontend | Reuso das classes `.field/.input/.select/.textarea/.alerta/.passos/.check-item/.btn` de [`globals.css`](../src/app/(frontend)/globals.css) |
| LGPD rigorosa | Seção 9: inventário, base legal, consentimento com prova, menores, direitos, retenção, criptografia, auditoria, incidentes |

**Respostas que você deu neste discovery:** "Playground" = painel do Payload (`/admin`);
preenchimento **somente com login**.

---

## 2.1 Decisões já registradas

| Data | Decisão |
|---|---|
| 30/10/2026 | "Playground" é o painel do Payload (`/admin`) |
| 30/10/2026 | A inscrição exige login (não é formulário aberto) |
| 30/10/2026 | Área do filiado **Nível 1 agora**; Níveis 2 (perfil esportivo/documentos) e 3 (anuidade/carteirinha) ficam para depois |
| 30/10/2026 | **1 conta = 1 atleta**; login por **e-mail + senha** |
| 30/10/2026 | SMTP por variáveis de ambiente (provedor ainda não contratado; em dev o link sai no terminal) |
| 30/10/2026 | **Sem confirmação de e-mail por enquanto**: cadastro novo entra "pendente" e só é liberado pela aprovação de um administrador no painel |
| 09/11/2026 | **Substituído:** ativação por e-mail (Resend) libera a conta automaticamente; o admin só ativa manualmente como contingência. A inscrição também envia e-mail de confirmação |

Com isso, a **Fase 1** entrega o MVP completo de inscrições **e** a área do filiado Nível 1.
O que sai do escopo imediato: perfil esportivo, upload de documentos pessoais, anuidade,
pagamento e carteirinha.

### 2.2 O que já está no código

- **Isolamento:** helpers de acesso passaram a exigir `user.collection === 'users'`
  ([`access/index.ts`](../src/access/index.ts)); `Users.update` corrigido contra IDOR entre
  coleções; `src/proxy.ts` fecha os endpoints de auth da coleção `atletas`.
- **Identidade:** coleção [`Atletas`](../src/collections/Atletas.ts) com aprovação manual
  (`pendente` → `ativo`, com autor e data), bloqueio por tentativas e sessões revogáveis;
  cookie próprio em
  [`sessao.ts`](../src/lib/atleta/sessao.ts); CPF cifrado (AES-256-GCM) + índice cego.
- **Área do atleta:** `/area`, entrar, criar conta, recuperar/redefinir
  senha, meus dados, consentimentos (com revogação), privacidade (exportar JSON / excluir).
- **Formulários:** [`FormulariosInscricao`](../src/collections/FormulariosInscricao.ts) com
  construtor por blocos, versionamento por publicação e validação mínima de LGPD.
- **Inscrições:** [`Inscricoes`](../src/collections/Inscricoes.ts) com protocolo, snapshot das
  respostas, prova de consentimento, responsável cifrado e `retencaoAte` calculado.
- **Regra do evento:** `inscricoesAbertas`, `inscricoesDe`/`inscricoesAte`, `limiteVagas` e
  aviso; estado único em [`estado.ts`](../src/lib/inscricoes/estado.ts), aplicado na página, no
  formulário e na server action.
- **E-mail:** adaptador Resend (`@payloadcms/email-resend`) com fallback de desenvolvimento;
  ativação de conta, recuperação de senha e confirmação de inscrição
  ([`email.ts`](../src/lib/email.ts), [`confirmacao.ts`](../src/lib/inscricoes/confirmacao.ts)).
- **UX de erro:** cadastro e login são formulários controlados e o envio é feito em transição,
  fora do `action={}` — assim o React 19 não reseta os campos. Cada erro aparece embaixo do
  campo certo, com resumo no topo e foco no primeiro problema; nada do que foi digitado se perde.
- **Operação:** migration `20261030_140639_inscricoes`, seed com evento/formulário de exemplo e
  script `pnpm verificar:inscricoes` (14/14 no ambiente local, incluindo os testes de
  isolamento com token de atleta real).

**Verificação no navegador (Chrome headless, fluxo real):** cadastro → aviso de aprovação →
login barrado → aprovação no painel → login liberado → formulário em 4 passos → revisão →
envio → tela do protocolo. Também conferido:
token de e-mail é de uso único, dado sensível vazio não entra no snapshot, responsável aparece
mascarado para o titular. Evidências em `.docs/e2e-formulario.png` e
`.docs/e2e-detalhe-inscricao.png`.

**Ainda pendente (Fase 2):** trilha de auditoria, expurgo automático, upload privado de
documentos, revelação auditada de CPF, exportação CSV por evento, lista de espera, CAPTCHA,
MFA no painel, banner de consentimento do GA4 e cifra dos backups.

---

## 3. O que já existe hoje (fatos verificados no código)

| Fato | Onde | Consequência para o projeto |
|---|---|---|
| "Competição / evento" é **uma** coleção | [`Competicoes.ts`](../src/collections/Competicoes.ts) | Não criamos coleção nova de evento; o "evento" é a competição |
| Já existe `inscricoesAte` (data) | [`Competicoes.ts:66`](../src/collections/Competicoes.ts#L66) | Falta a data de **abertura** e o interruptor |
| Inscrição hoje é um **link externo** | [`Competicoes.ts:106`](../src/collections/Competicoes.ts#L106) | Vai virar fallback; o formulário interno tem precedência |
| Status do evento tem cálculo automático | [`format.ts:64`](../src/lib/format.ts#L64) | A regra de "Inscrições abertas" já existe; será estendida, não duplicada |
| Botão do card escolhe resultado > inscrição > convocação | [`competicoes.ts:71`](../src/lib/competicoes.ts#L71) | Ponto de entrada do CTA no calendário e na home |
| Não existe área do filiado | [`README.md:160`](../README.md#L160) | O login de atleta é escopo novo |
| O link "Área do filiado" é externo e opcional | [`Header.tsx:45`](../src/components/layout/Header.tsx#L45) | Será reaproveitado para apontar para `/area` (ou ficar para SSO futuro) |
| Não há adaptador de e-mail configurado | [`payload.config.ts`](../src/payload.config.ts) | Verificação de e-mail e "esqueci a senha" **não funcionam** sem SMTP |
| `media` é público; `documentos` filtra por `publico` | [`Media.ts:8`](../src/collections/Media.ts#L8), [`Documentos.ts:15`](../src/collections/Documentos.ts#L15) | Upload de atestado **não** pode ir para `media`; precisa de coleção privada |
| O Payload serve arquivo passando por `access.read` | `node_modules/payload/dist/uploads/checkFileAccess.js:10` | Upload privado é viável nativamente |
| Senha do Payload usa PBKDF2-SHA256, 600k iterações | `payload/dist/auth/strategies/local/generatePasswordSaltHash.js:4` | Reaproveitamos o hash nativo; não implementamos senha na mão |
| O cookie de sessão é **um só** (`payload-token`) para qualquer coleção auth | `payload/dist/auth/cookies.js:68` | Login de atleta e de admin colidiriam — ver ADR 4 |
| `payload.login` devolve o token; quem grava cookie é o endpoint REST | `payload/dist/auth/operations/login.js:30` | Podemos autenticar no servidor e gravar nosso próprio cookie |
| Formulário de contato já tem o padrão de form + action | [`ContatoForm.tsx`](../src/app/(frontend)/contato/ContatoForm.tsx), [`actions.ts`](../src/app/(frontend)/contato/actions.ts) | Base para o formulário, incluindo honeypot e mascaramento |
| Já existe `data-ndovu-mask` nos campos do contato | [`ContatoForm.tsx:108`](../src/app/(frontend)/contato/ContatoForm.tsx#L108) | Regra obrigatória para todos os campos de inscrição |
| Não há `proxy.ts`/middleware | — | Não há proteção global de rota hoje |
| `authenticated` é **agnóstico de coleção** (`Boolean(user)`) | [`access/index.ts:5`](../src/access/index.ts#L5) | Um token de atleta herdaria escrita em 11 coleções via REST — corrigir **antes** de criar `atletas` |
| Não há testes automatizados; CI = lint + typecheck + build | [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | Regras de LGPD sem teste é risco; propor vitest (decisão aberta nº 9) |
| Postgres 16 em Docker, sem cifra de disco; backup diário **sem cifra** para R2 | [`docker-compose.yml`](../docker-compose.yml), [`deploy/backup/backup.sh`](../deploy/backup/backup.sh) | Dump com PII sai da VPS em claro — corrigir (9.8) |
| GA4 carrega **sempre** em produção, sem consentimento | [`layout.tsx:48`](../src/app/(frontend)/layout.tsx#L48) | Lacuna atual de LGPD; precisa de banner/Consent Mode (9.11) |
| Política de privacidade é placeholder no seed | [`seed/index.ts:528`](../src/seed/index.ts#L528) | Precisa de texto real e versionado antes do go-live |

---

## 4. Decisões de arquitetura (ADRs curtos)

### ADR 1 — "Evento" é a competição existente
Não criamos coleção `eventos`. A inscrição se pendura em `competicoes`, que já alimenta
calendário, home, resultados e convocações. Criar outra coleção duplicaria o mesmo dado e
quebraria o calendário.

### ADR 2 — O evento é o **único** interruptor
`inscricoesAbertas` (checkbox) + `inscricoesDe` + `inscricoesAte` + `limiteVagas` + status do
evento. Uma função pura, `estadoInscricao(evento, contexto)`, devolve
`{ estado, rotulo, detalhe, podeInscrever }`. Ela é chamada em **três** lugares: página do
evento, página do formulário e server action de envio. O formulário **não** tem data própria —
se o evento fecha, tudo fecha junto, inclusive links salvos.

### ADR 3 — Formulário versionado + fotografia da resposta
O formulário usa *drafts* do Payload. Cada publicação gera `versao` incremental. A inscrição
guarda `formularioVersao` **e** o *snapshot* das perguntas (rótulo, tipo, ordem) — assim,
mudar o formulário amanhã não reescreve o que a pessoa respondeu ontem (exigência de
rastreabilidade e de defesa em reclamação de titular).

### ADR 4 — Identidade do atleta separada do painel

**Resposta curta: não temos área do filiado.** O que existe é só o *link* "Área do filiado"
([`Header.tsx:45`](../src/components/layout/Header.tsx#L45)), preenchido em Configurações e
hoje vazio ([`seed/index.ts:557`](../src/seed/index.ts#L557)); e o README lista "login de
atletas, envio de documentos, pagamento, carteirinha" como fora do projeto
([`README.md:160`](../README.md#L160)). Ou seja: o login do atleta é escopo novo e precisa ser
desenhado para nunca encostar no painel.

#### 4.1 Por que **não** criar `users` com papel "atleta"
Era o caminho mais curto e é o mais perigoso:
- a barreira contra entrar no painel passa a ser uma linha de `access.admin`; um erro de uma
  linha abre o `/admin` para atletas;
- atleta apareceria na lista "Usuários do painel", no seletor de autor e nas preferências;
- política de senha, bloqueio, verificação e expiração seria a mesma para editor e atleta;
- um token de atleta (`payload-token`) seria aceito por qualquer endpoint que use
  `authenticated` — e hoje esse helper é **agnóstico de coleção** (ver 4.3);
- auditoria e LGPD ficam confusas: "quem é o titular?" misturado com "quem é o operador?".

#### 4.2 As cinco camadas do isolamento

| # | Camada | Como |
|---|---|---|
| 1 | **Coleção própria** | `atletas` com `auth: true`; `admin: () => false`; `admin.user` continua `users` |
| 2 | **Sessão própria** | Cookie `felpma-atleta` (HttpOnly, Secure, SameSite=Lax, 8h); JWT do Payload validado com `Headers` montado à mão |
| 3 | **Autorização por coleção** | Helpers de acesso passam a exigir `user.collection === 'users'` (4.3) |
| 4 | **Superfície de API** | Só as rotas **de auth** do atleta (`/api/atletas/login`, `/me`, `/forgot-password`…) são bloqueadas no `proxy.ts`; o CRUD continua existindo para o painel e é barrado pelas regras de acesso (`create`/`delete` só painel; `read`/`update` só do próprio ou do painel) |
| 5 | **Rotas** | `/area` e `/inscricoes` checam sessão na página **e** na server action; o `proxy.ts` só faz redirect otimista |

O painel já barra por construção: `getAccessResults` só liga `canAccessAdmin` quando
`payload.config.admin.user === user.collection`
(`payload/dist/auth/getAccessResults.js:12-16`). Um JWT de `atletas` resolve para a coleção
`atletas`, portanto nunca vira sessão de painel — mesmo que alguém force o `payload-token`.

#### 4.3 O ajuste obrigatório de autorização (o risco real)
[`src/access/index.ts`](../src/access/index.ts) hoje é:

```ts
export const authenticated: Access = ({ req: { user } }) => Boolean(user)
export const publishedOrAuthenticated: Access = ({ req: { user } }) => {
  if (user) return true
  return { _status: { equals: 'published' } }
}
```

Com uma coleção auth nova, **qualquer token válido de atleta passa nesses dois** — e
`create/update/delete` de `competicoes`, `noticias`, `documentos`, `resultados`, `media` e os
globals ficam abertos via `/api/*`. Pior: `Users.update` aceita `user?.id === id`, então um
atleta de id 3 poderia tentar editar o usuário de painel id 3 (IDOR entre coleções).

Correção, antes de criar a coleção:

```ts
const doPainel = (user?: { collection?: string } | null) => user?.collection === 'users'

export const authenticated: Access = ({ req: { user } }) => doPainel(user)
export const publishedOrAuthenticated: Access = ({ req: { user } }) =>
  doPainel(user) ? true : { _status: { equals: 'published' } }
```

E em [`Users.ts:18`](../src/collections/Users.ts#L18): `update` exige `user.collection === 'users'`.
Revisar os 44 usos de `authenticated`/`publishedOrAuthenticated` (11 coleções + 4 globals) e
cobrir com teste de regressão: token de atleta → 403 em todas as coleções de conteúdo.

E as regras da própria coleção `atletas`, que não podem depender do painel:

```ts
access: {
  admin: () => false, // atleta nunca entra no /admin (redundante com admin.user, mas explícito)
  create: ({ req: { user } }) => doPainel(user), // cadastro público só pela nossa server action
  read: ({ req: { user } }) =>
    doPainel(user) ? true : doAtleta(user) ? { id: { equals: user.id } } : false,
  update: ({ req: { user } }) =>
    doPainel(user) ? true : doAtleta(user) ? { id: { equals: user.id } } : false,
  delete: ({ req: { user } }) => doPainel(user), // auditoria + LGPD, nunca pelo atleta
}
```

Atenção ao detalhe: `create`/`delete` **só do painel** (e não `false` para todos), senão a
própria federação perde a capacidade de cadastrar e remover contas pela interface.

#### 4.4 O que a área do filiado resolve — por níveis
| Nível | Conteúdo | Quando |
|---|---|---|
| **1 (agora)** | Cadastro com aprovação manual, login/logout, recuperação de senha, meus dados, consentimentos, minhas inscrições, exportar/eliminar dados | Junto com as inscrições |
| **2** | Perfil esportivo (categoria, CT/clube, histórico), envio de documentos pessoais, atualização de dados | Fase 2/3 |
| **3** | Filiação/anuidade, pagamento, carteirinha digital, vínculo com clube | Fora deste projeto (README já lista) |

> **Decidido em 30/10/2026:** entregamos o **Nível 1** primeiro. Níveis 2 e 3 ficam para depois,
> sem mudança de arquitetura — a conta e a sessão continuam as mesmas.

O Nível 1 é o mínimo que sustenta a inscrição com login e já entrega valor sozinho. Os níveis
2 e 3 não mudam a arquitetura: a conta e a sessão continuam as mesmas.

#### 4.5 Como isso evolui para SSO (se a federação adotar um sistema oficial)
A fronteira fica em `src/lib/atleta/identidade.ts`: as páginas e server actions falam com
`atual()`, `entrar()`, `sair()` — nunca com o Payload direto. Trocar a origem da identidade por
um provedor OIDC depois é substituir esse módulo (ou registrar uma `auth.strategies` no
Payload), sem tocar em regra de inscrição. Se um dia migrarmos contas, o export
(e-mail + hash de senha + dados) já existe para o titular, via direito de portabilidade.

#### 4.6 Por que não usar um provedor externo agora
Keycloak/Auth.js/Clerk resolvem o problema, mas adicionam um serviço, um contrato de
operador (LGPD) e um fluxo de migração — para uma base que começa em zero. O desenho acima
já nasce pronto para receber SSO; não precisamos pagar esse custo hoje.

#### 4.7 Detalhes de sessão que não podem ser esquecidos
- **Nunca** repassar as headers do navegador para `payload.auth`: elas podem trazer o
  `payload-token` do painel e autenticar o editor como se fosse atleta. Montar sempre um
  `Headers` novo, só com `Authorization: JWT <token>` e `DisableAutologin: true`.
- `useSessions: true` faz o JWT valer só enquanto existir a sessão correspondente
  (`payload/dist/auth/strategies/jwt.js:110`) — é o que permite "sair de todos os
  dispositivos" apagando a sessão, sem esperar as 8h.
- **Porta dos fundos fechada:** o Payload cria automaticamente `/api/atletas/login`,
  `/logout`, `/me`, `/refresh-token`, `/forgot-password`, `/reset-password`, `/unlock`,
  `/init`, `/first-register` e `/verify/:id`, e essas rotas gravam o cookie compartilhado
  `payload-token`. Como a interface usa server actions (API local), elas ficam bloqueadas no
  `proxy.ts`. **Bloquear `/api/atletas/*` inteiro quebraria o painel**,
  que usa `GET /api/atletas` e `PATCH /api/atletas/:id` para a lista e a edição de contas —
  por isso o bloqueio é rota a rota, não por prefixo.
- Trocar senha e "sair de todos os dispositivos" revogam sessões existentes.
- O cookie do atleta tem `Path=/` (precisa valer em `/area` e `/inscricoes`), mas nenhuma
  rota do painel é renderizada para ele.

#### 4.8 Testes de isolamento (critérios de aceite da camada de identidade)
| Teste | Esperado |
|---|---|
| `POST /api/atletas/login` | 404 (bloqueado no proxy) |
| `POST /api/atletas` (cadastro público) | 403 (só pela nossa server action) |
| `GET /api/atletas` com token de atleta | 403 — só o painel lista contas |
| Token de atleta em `GET /api/users` | 403 |
| Token de atleta em `POST /api/competicoes` | 403 |
| Token de atleta em `GET /api/noticias?where[_status]=draft` | só publicadas |
| Atleta id 3 tenta `PATCH /api/users/3` | 403 |
| Atleta A lê inscrição de B | 403/404 + evento na trilha |
| `GET /admin` com `payload-token` de atleta | redireciona para login |
| Apagar a sessão do atleta | token deixa de valer na hora |
| Login de atleta não derruba sessão do painel | duas sessões coexistem |

### ADR 5 — Upload privado em coleção própria
Nova coleção `arquivos-inscricao` (atestado, comprovante, documento do responsável):
`access.read` só admin/responsável, `staticDir` novo, volume Docker novo, MIME e tamanho
restritos, imagem re-codificada com `sharp` (remove EXIF/GPS). Nunca em `media`, que é
público por padrão.

### ADR 6 — Criptografia de campo + índice cego
CPF, dados de saúde e dados do responsável são gravados cifrados (AES-256-GCM, chave em
`LGPD_CHAVE_CAMPOS`, prefixo de versão para rotação). Para continuar podendo **buscar** e
**impedir duplicidade** de CPF, um índice cego HMAC-SHA256 vai em coluna separada
(`cpfHash`, unique). Campo cifrado não entra em `where` do Payload — daí o índice.

### ADR 7 — Nada de rascunho no servidor
O preenchimento vive só na memória do navegador (nunca `localStorage`/`sessionStorage`,
justamente porque pode haver CPF e dados de saúde em máquina compartilhada). Só existe
registro no banco quando a pessoa envia, com consentimento aceito.

---

## 5. Escopo funcional — Painel (o "Playground")

Novo grupo **Inscrições** no menu, ao lado de "Competições":

### 5.1 Evento (edição de `competicoes`) — o painel de controle
Grupo lateral **"Inscrições"**:

| Campo | Tipo | Regra |
|---|---|---|
| `inscricoesAbertas` | checkbox | Default **desligado**. Desligado = ninguém se inscreve, nem por link direto |
| `inscricoesDe` | data (dia) | Obrigatória para ligar; ≤ `inscricoesAte` |
| `inscricoesAte` | data (dia) | Já existe; passa a ser obrigatória para ligar |
| `limiteVagas` | número | Opcional; ao atingir, estado "Vagas esgotadas" |
| `avisoForaDoPeriodo` | textarea | Texto mostrado antes/depois da janela |
| `linkInscricao` | text | Mantido: usado **só** quando o evento não tem formulário interno |
| `formularios` | `join` (somente leitura) | Lista dos formulários ligados, com contador de inscrições |

Validação no `beforeChange`: não deixa ligar sem as duas datas, sem data coerente, nem com
evento `cancelado`. Avisa (não bloqueia) se o evento já passou.

### 5.2 Formulários de inscrição (nova coleção `formularios-inscricao`)
Abas no editor:

**Aba Formulário**
- `titulo` (ex.: "Inscrição — Maranhense Sub-15 a Sênior"), `evento` (obrigatório, único por
  formulário, **imutável** depois da primeira inscrição), `descricao` (richText, instruções),
  `publicado` (via drafts), `versao` (auto), `slug` gerado do título.
- `limitePorAtleta` (default 1), `permiteCancelamento` (default sim, até o fim da janela).

**Aba Campos** (construtor por *blocks*, sem plugin externo)
- Tipos: texto curto, texto longo, e-mail, telefone, data, número, seleção única, múltipla
  escolha, aceite, upload de documento, **bloco de seção** (título + texto explicativo).
- Cada campo: `nome` técnico (slug, imutável), `rotulo`, `ajuda`, `placeholder`, `obrigatorio`,
  `sensivel` (liga criptografia e mascaramento), `validacao` (mín./máx./regex), `opcoes`,
  `condicional` (mostrar se outro campo = valor — para "categoria" e "paradesporto").
- Ordem arrastável (o Payload já faz isso em arrays/blocks).

**Aba LGPD**
- `finalidade` (texto), `baseLegal` (select: contrato/consentimento/obrigação legal/legítimo
  interesse/exercício de direitos), `prazoRetencao` (nº + unidade) e `justificativaRetencao`.
- `consentimentos` (array): `id` estável, `texto` (versão congelada no envio), `obrigatorio`,
  `finalidade` (inscrição / imagem / comunicações / dados sensíveis).
- `avisoPrivacidade` (richText) ou link para página versionada; `versaoAviso` (data).
- `consentimentoResponsavel` (texto + campos exigidos: nome, CPF, parentesco) — para menores.

**Aba Mensagens**
- `mensagemSucesso`, `mensagemForaDoPeriodo`, `emailConfirmacao` (bool; depende de SMTP).

**Guardrails (hooks `beforeValidate`/`beforeChange`)**
- Não publica sem aviso de privacidade, prazo de retenção, ao menos um consentimento
  obrigatório e ao menos um campo de identificação.
- Não deixa trocar `evento` se já houver inscrição (evita vazamento cruzado de dados).
- Não deixa excluir: usa lixeira (`trash: true`, `deletedAt`) — histórico de inscrição é
  prova.

### 5.3 Inscrições recebidas (nova coleção `inscricoes`)
Lista com filtros por evento, status, período e busca por protocolo/nome; colunas:
`protocolo`, `atleta` (nome), `evento`, `categoria`, `enviadaEm`, `status`.

Tela do registro, em blocos:
- **Resumo**: protocolo, evento, formulário + versão, enviada em, status.
- **Respostas**: renderizadas na ordem original, com rótulo do snapshot; campos sensíveis
  mascarados (`***.***.***-**`) com botão "revelar" que **gera evento na trilha**.
- **Responsável** (quando menor): dados cifrados, mesma regra de revelação.
- **Consentimentos**: cada um com texto, versão, hash, data/hora, IP pseudonimizado e
  user-agent pseudonimizado (somente leitura).
- **Documentos**: anexos privados com link autenticado.
- **Trilha**: quem viu, quem alterou status, quando.
- **Observações internas** (admin): texto livre, nunca aparece para o atleta.
- Ações: aprovar, rejeitar (com motivo obrigatório), lista de espera, cancelar, exportar,
  **eliminar/anonimizar** (com confirmação dupla e registro).

Status: `recebida` → `em-analise` → `aprovada` | `rejeitada` | `lista-espera` | `cancelada`.

### 5.4 Contas de atleta (nova coleção `atletas`)
Busca por nome/e-mail (CPF só por hash, nunca em texto), colunas nome, e-mail verificado,
cidade, inscrições, último acesso. Ações: aprovar, bloquear, anonimizar conta
(direito de eliminação, mantendo inscrições sob obrigação legal quando houver).

### 5.5 Trilha LGPD (nova coleção `trilha-privacidade`)
Somente leitura, sem edição nem exclusão pela interface. Registra: leitura/revelação de dado
sensível, exportação, alteração de status, eliminação/anonimização, login/logout, revogação
de consentimento, acesso negado. Guarda ator, alvo, data, IP pseudonimizado e metadados sem
PII.

### 5.6 Componentes de admin (custom)
- **Prévia do formulário** (botão no editor → abre `/inscricoes/[evento]/previa?token=...`
  com validade curta, renderizando o formulário real, sem gravar).
- **Célula de CPF mascarada** com revelação auditada.
- **Badge de status** e **contador de inscrições** no card do evento.
- **Bloco de respostas** no lugar do JSON cru (leitura humana).
- Geração do `importMap` (`pnpm generate:importmap`) entra no checklist de cada componente.

---

## 6. Escopo funcional — Site e área do atleta

### 6.1 Entrada
- **Card do calendário / home / página do evento**: quando o evento tem formulário aberto, o
  CTA passa a ser "Inscrever-se"/"Inscrever atleta" apontando para `/inscricoes/[slug-do-evento]`.
  Fechado: "Inscrições encerradas em dd/mm" (sem link morto). Sem formulário: comportamento
  atual (`linkInscricao` externo).
- **Página do evento**: bloco de inscrição no aside com estado, prazo, vagas e botão.

### 6.2 `/inscricoes/[evento]`
Página de aterrissagem: resumo do evento (data, local, categorias), prazo em destaque,
requisitos (documentos, idade mínima), aviso de privacidade resumido, botão "Entrar e
inscrever". Se não logado → `/area/entrar?retorno=/inscricoes/[evento]` (retorno validado
como caminho interno — sem *open redirect*).

### 6.3 Formulário — 4 passos (uma única submissão no final)

```
[1 Identificação] → [2 Dados da inscrição] → [3 Responsável/LGPD] → [4 Revisão e envio]
```

1. **Identificação**: nome, e-mail e CPF vêm da conta e aparecem só para conferência (CPF
   travado; correção via atendimento). Data de nascimento define menoridade.
2. **Dados da inscrição**: os campos do formulário, agrupados por seção, com ajuda e exemplo.
   Campos condicionais aparecem conforme a resposta anterior.
3. **Responsável e consentimentos**: só aparece o bloco do responsável se < 18 anos. Os
   consentimentos são checkboxes **separados** (nunca pré-marcados), com link para o aviso
   completo e versão/data. Dados sensíveis têm aviso destacado.
4. **Revisão**: resumo do que será enviado, com "editar" por bloco; envio com `useActionState`,
   botão desabilitado durante o envio, protocolo na tela seguinte.

Regras de UX: erro em resumo no topo + mensagem no campo; foco no primeiro erro; preservar o
que foi digitado quando o servidor devolve erro; aviso ao sair com dados preenchidos;
`autocomplete` correto; teclado numérico em telefone/CPF; 44px de alvo; contraste AA.

### 6.4 Área do atleta (`/area`) — Nível 1
- `/area` — início: inscrições (protocolo, evento, status, prazo), atalhos.
- `/area/entrar`, `/area/criar-conta`, `/area/recuperar-senha`, `/area/redefinir-senha`.
- `/area/meus-dados` — editar contato, ver CPF mascarado, trocar senha.
- `/area/consentimentos` — ver e **revogar** cada consentimento não essencial.
- `/area/privacidade` — exportar dados (JSON/CSV), solicitar eliminação, ver solicitações.
- `/area/inscricoes/[protocolo]` — detalhe e cancelamento dentro do prazo.

Tudo `no-store`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`.

### 6.5 Aviso de privacidade
Página versionada (reaproveita `Paginas` ou rota própria `/privacidade/inscricoes`), com data
de vigência, finalidades, bases legais, retenção, compartilhamento, direitos, contato do
encarregado e como revogar. Cada versão publicada é imutável (histórico de versões) porque o
hash do texto aceito vai para a prova de consentimento.

---

## 7. Regra de disponibilidade — a única fonte de verdade

`estadoInscricao(evento, { agora, inscritos, temFormularioPublicado, atletaInscrito })`:

| Ordem | Condição | Estado | Site | Server action |
|---|---|---|---|---|
| 1 | evento `cancelado`/`adiado` | bloqueado | "Evento cancelado/adiado" | recusa |
| 2 | evento sem formulário publicado | externo | CTA do `linkInscricao` | — |
| 3 | `inscricoesAbertas` = false | fechado | "Inscrições não abertas" | recusa |
| 4 | agora < `inscricoesDe` | em-breve | "Inscrições abrem em …" | recusa |
| 5 | agora > `inscricoesAte` | encerrado | "Encerradas em …" + aviso | recusa |
| 6 | `limiteVagas` atingido | esgotado | "Vagas esgotadas" | recusa / lista de espera |
| 7 | não autenticado | login | "Entrar para se inscrever" | redireciona |
| 8 | já inscrito | inscrito | "Protocolo X — status" | recusa idempotente |
| 9 | ok | aberto | formulário | cria |

Datas são avaliadas no fuso `America/Fortaleza` (já é o padrão de [`format.ts`](../src/lib/format.ts)),
com fim do dia em `23:59:59` no último dia. O cache é desligado nessas rotas
(`dynamic = 'force-dynamic'` já é o padrão do layout) e há `revalidatePath` nos hooks.

---

## 8. Modelo de dados

### 8.1 Novas coleções

| Coleção | Papel | Campos principais |
|---|---|---|
| `formularios-inscricao` | Definição do formulário | `titulo`, `evento` (rel, obrigatório), `descricao`, `campos[]` (blocks), `lgpd{...}`, `consentimentos[]`, `publicado`, `versao`, `mensagens` |
| `inscricoes` | Inscrição recebida | `protocolo`, `evento`, `formulario`, `formularioVersao`, `atleta`, `respostas[]` (snapshot), `status`, `motivoRejeicao`, `responsavel{...}` (cifrado), `menorDeIdade`, `consentimentos[]` (prova), `documentos[]`, `enviadaEm`, `retencaoAte`, `observacoesInternas`, `deletedAt` |
| `atletas` | Conta do atleta (auth) | `nome`, `email`, `cpf` (cifrado), `cpfHash` (unique), `dataNascimento`, `telefone`, `cidade`, `uf`, `emailVerificado`, `status`, `consentimentos[]` |
| `arquivos-inscricao` | Upload privado | `titulo`, `tipo`, `inscricao`, `atleta`, `arquivo` |
| `trilha-privacidade` | Auditoria | `acao`, `ator`, `atorColecao`, `alvo`, `alvoColecao`, `ipHash`, `userAgentHash`, `metadados` |
| `solicitacoes-titular` | Direitos do art. 18 (fase 2) | `tipo`, `atleta`, `descricao`, `status`, `prazo`, `resposta`, `concluidaEm` |

### 8.2 Alterações em coleções existentes
- `competicoes`: grupo `inscricao` (5.1) + hooks de validação.
- `users`: nada obrigatório; avaliar novo papel `lgpd` (acesso a dados sensíveis) na fase 2.
- `configuracoes`: aba "Privacidade" com encarregado (nome, e-mail, telefone), prazo padrão,
  versão vigente do aviso e link da área do atleta (interno).

### 8.3 Formato das respostas (snapshot)

```json
[
  { "campo": "categoria", "rotulo": "Categoria", "tipo": "select", "valor": "sub17", "sensivel": false },
  { "campo": "cpf", "rotulo": "CPF", "tipo": "texto", "valor": "enc:v1:…", "sensivel": true }
]
```

Valores `sensivel: true` ficam cifrados; o servidor decifra só quando o ator tem permissão e
registra na trilha.

### 8.4 Índices e restrições
- `inscricoes`: unique (`atleta`, `evento`, `formularioVersao`? não) → unique (`atleta`,
  `evento`) enquanto não cancelada, implementado por validação + índice parcial quando possível.
- `inscricoes.protocolo` unique; `atletas.cpfHash` unique; `atletas.email` unique (nativo).
- `formularios-inscricao.evento` indexado.
- `trilha-privacidade.createdAt` indexado (expurgo e consulta).

---

## 9. LGPD — o que será implementado

### 9.1 Papéis
| Papel | Quem |
|---|---|
| Controlador | FELPMA (CNPJ em Configurações) |
| Encarregado (DPO) | **a definir** — nome e canal publicados no site e no aviso |
| Operadores | provedor da VPS, Cloudflare R2 (backup), provedor de e-mail transacional |
| Subprocessadores de analytics | Ndovu, Google (GA4) — ver 9.11 |

### 9.2 Inventário de dados (ROPA — base para o documento oficial)

| Dado | Onde | Finalidade | Base legal | Retenção proposta | Sensível? |
|---|---|---|---|---|---|
| Nome, e-mail, telefone, cidade/UF | `atletas` | Conta e contato sobre a inscrição | art. 7º, V (contrato) | Conta ativa + 6 meses | não |
| Hash de senha (PBKDF2 600k) | `atletas` | Autenticação | art. 7º, V + art. 46 | Enquanto a conta existir | não |
| CPF | cifrado em `atletas`/`inscricoes` | Identificação inequívoca; prestação de contas à confederação | art. 7º, V/II | 5 anos após o evento (fiscal) | **alto risco** (não é sensível no art. 5º, II, mas exige cuidado) |
| Data de nascimento, sexo | `atletas`/`inscricoes` | Categoria e elegibilidade | art. 7º, V | idem | não |
| Categoria/peso declarado | `inscricoes` | Organização da competição | art. 7º, V | idem | atenção: não coletar medida corporal sem necessidade |
| Condição de saúde / atestado | `inscricoes` + upload | Segurança do atleta e exigência da modalidade | **art. 11, I** (consentimento específico) | Até 12 meses após o evento, depois eliminar | **sim** |
| Responsável (nome, CPF, parentesco) | `inscricoes` | Consentimento de menor | **art. 14, §1º** | Enquanto necessário + 5 anos | sim (CPF) |
| Consentimentos (texto, hash, data, IP pseudonimizado, UA) | `inscricoes` | Prova de consentimento | art. 8º, §1º / art. 37 | 5 anos (defesa) | não (pseudonimizado) |
| Trilha de acesso a dado sensível | `trilha-privacidade` | Segurança e responsabilização | art. 46 / Marco Civil art. 15 | 6 meses (mínimo legal) a 2 anos | não |
| IP | **não persistido em claro**; só HMAC truncado | Segurança e prova | art. 7º, IX (legítimo interesse) | junto do consentimento | não |
| Navegação (GA4/Ndovu) | terceiros | Métricas | **consentimento** (art. 7º, I) | 14 meses | não |

**Não coletar** (regra de minimização a valer no construtor de campos): RG, biometria, foto de
documento sem finalidade, dados bancários, localização precisa, dados de saúde além do
atestado exigido pelo regulamento, e qualquer campo "porque pode ser útil".

### 9.3 Bases legais
- **Inscrição em si**: art. 7º, V (execução de contrato ou procedimentos preliminares). É a
  base que **não** depende de consentimento — logo, revogar consentimento de marketing não
  cancela a inscrição.
- **Dados de saúde/atestado**: art. 11, I — consentimento **específico e destacado**, com
  finalidade explícita, e possibilidade de não fornecer quando o regulamento permitir.
- **Menores**: art. 14, §1º + Resolução CD/ANPD nº 18/2024 — consentimento de pelo menos um
  dos pais/responsável, com identificação, em bloco separado e com destaque; dados mínimos;
  nenhuma decisão automatizada; melhor interesse.
- **Comunicações, uso de imagem, dados opcionais**: art. 7º, I — consentimento separado,
  opcional, revogável.
- **Guarda fiscal/contábil**: art. 7º, II — obrigação legal.
- **Segurança e antifraude**: art. 7º, IX — legítimo interesse, com teste de proporcionalidade
  documentado no ROPA.

### 9.4 Consentimento e prova (art. 8º, §1º)
Cada aceite grava:
`id do consentimento` + `versão do texto` + `hash SHA-256 do texto exibido` + `data/hora` +
`id do atleta` + `IP pseudonimizado (HMAC com salt)` + `user-agent pseudonimizado` +
`origem (formulário e versão)`.
A revogação grava `revogadoEm`, `revogadoPor`, e o efeito (a finalidade para de operar no dia
seguinte). Nada é pré-marcado; checkbox obrigatório só para o que é indispensável; o botão de
envio fica desabilitado até os obrigatórios, mas o texto continua visível e linkado.

### 9.5 Menores de idade
- Idade calculada na data da inscrição.
- Se < 18: bloqueia o envio sem o bloco do responsável (nome, CPF, parentesco,
  declaração de autoridade) e o consentimento específico do responsável.
- Aviso em linguagem simples sobre o que é coletado da criança/adolescente e por quê.
- Nenhum dado do menor é usado para marketing, perfilamento ou ranking público sem
  consentimento específico.

### 9.6 Direitos do titular (art. 18) — self-service
| Direito | Onde | Como |
|---|---|---|
| Confirmação e acesso | `/area/privacidade` | Tela + exportação imediata |
| Correção | `/area/meus-dados` | Campos livres; CPF por atendimento (com validação) |
| Eliminação/anonimização | `/area/privacidade` | Imediata quando não há obrigação legal; senão explica o motivo e o prazo |
| Portabilidade | `/area/privacidade` | JSON + CSV legíveis |
| Revogação | `/area/consentimentos` | Efeito imediato por finalidade |
| Informação sobre compartilhamento | Aviso de privacidade | Tabela de operadores |
| Oposição / reclamação | Canal do DPO | Formulário + e-mail publicados |
| Revisão de decisão automatizada | — | **não haverá** decisão automatizada: aprovação é humana |

Prazo de resposta: imediato no self-service; 15 dias para o que exige análise (art. 19).
Toda solicitação gera registro na trilha.

### 9.7 Retenção e expurgo
- `inscricoes.retencaoAte` é calculada do `prazoRetencao` do formulário no momento do envio.
- Job diário (`jobs` do Payload, `autoRun` cron — `payload/dist/queues/config/types/index.d.ts:127`)
  executa em lotes: (1) anonimiza campos de quem passou do prazo sem obrigação legal;
  (2) apaga os uploads vinculados; (3) marca `anonimizadaEm`; (4) grava na trilha.
- O que tem obrigação legal (fiscal) fica retido com justificativa e **sem** os campos
  sensíveis, mantendo só o necessário.
- Contas sem inscrição e sem acesso há 24 meses: aviso por e-mail e exclusão.

### 9.8 Segurança (art. 46) — técnica
| Controle | Onde |
|---|---|
| TLS 1.2+ e HSTS | Caddy compartilhado (já existe) |
| Criptografia de campo (CPF, saúde, responsável) | AES-256-GCM, chave em `LGPD_CHAVE_CAMPOS`, versão no prefixo |
| Índice cego para busca/duplicidade | HMAC-SHA256 em `cpfHash` |
| Senha | PBKDF2-SHA256 600k do Payload |
| Sessão | Cookie próprio HttpOnly/Secure/SameSite=Lax, 8h, revogável |
| Bloqueio por tentativas | `maxLoginAttempts: 5`, `lockTime: 10min` |
| Menor privilégio | `admin` vê dados sensíveis; `editor` não; atleta só os próprios |
| Upload privado | Coleção própria + `access.read` + MIME + tamanho + re-encode |
| Logs sem PII | Redação explícita; nunca logar respostas |
| Backup cifrado | `age`/`gpg` **antes** do R2 + teste de restore (hoje não existe) |
| Cifra em repouso do banco | avaliar LUKS na VPS; se não, a criptografia de campo cobre o dado sensível |
| MFA no painel | fase 2 (hoje o Payload 3.91 não tem MFA nativo — avaliar plugin) |

### 9.9 Auditoria
Trilha imutável (`create` só por servidor, `update`/`delete` negados) com: revelação de campo
sensível, exportação, alteração de status, eliminação/anonimização, login/logout, revogação,
acesso negado e erro de autorização. Consulta no painel e exportação para o DPO.

### 9.10 Incidentes (art. 48)
Runbook em `.docs/` com: detecção, contenção (revogar sessões, rotacionar chaves),
avaliação de risco, notificação à ANPD em até 3 dias úteis (Res. CD/ANPD nº 15/2024),
comunicação aos titulares, registro do incidente. Inclui procedimento de rotação da chave de
campos (`v1` → `v2`, recifragem em lote).

### 9.11 Lacunas que **já existem** hoje e este projeto precisa encarar
1. **Política de privacidade é placeholder** ([`seed/index.ts:528`](../src/seed/index.ts#L528)) —
   sem texto real, não há transparência.
2. **GA4 sem consentimento** ([`layout.tsx:48`](../src/app/(frontend)/layout.tsx#L48)) —
   cookies de medição + transferência internacional para o Google. Precisa banner/Consent Mode
   v2 ou desligar até lá.
3. **Backup sem cifra** ([`deploy/backup/backup.sh`](../deploy/backup/backup.sh)) — dump com PII
   vai para o R2 em claro.
4. **Sem DPO, sem ROPA, sem RIPD, sem canal de direitos** — o código pode oferecer as telas,
   mas os documentos e o encarregado são decisão da federação.
5. **Sem retenção definida** em nenhuma coleção atual (mensagens de contato, por exemplo,
   ficam para sempre).
6. **`editor` vê tudo** — não há separação de acesso a dado pessoal hoje.
7. **Ndovu**: o mascaramento depende de `data-ndovu-mask` em cada campo; um campo esquecido
   vira snapshot com PII. Vai virar teste automatizado.
8. **Sem MFA** no painel.
9. **Postgres sem cifra de disco** na VPS.

### 9.12 O que é jurídico, não código (precisa da federação)
Nomear encarregado e publicar canal; revisar e versionar a política de privacidade; aprovar o
ROPA; elaborar o RIPD (dados sensíveis + menores); contratos/DPA com VPS, R2 e e-mail;
definir prazo de retenção por finalidade; avaliar transferência internacional (região do R2,
Google, Ndovu); plano de resposta a incidentes; treinamento da equipe.

---

## 10. Segurança de aplicação

| Risco | Controle |
|---|---|
| Envio fora da janela / link antigo | Revalidação no servidor com `estadoInscricao` (cliente não decide) |
| CSRF | Server Actions já comparam `Origin` com `Host` (Next 16, `server-actions.md:82`); cookie `SameSite=Lax` |
| Força bruta / enumeração | `maxLoginAttempts` + rate limit por IP **e** por conta; mensagens genéricas; mesmo tempo de resposta |
| Spam de inscrição | Conta verificada + honeypot + tempo mínimo (padrão do contato) + rate limit; CAPTCHA opcional (fase 3) |
| Duplo envio | Chave de idempotência no formulário + unique (`atleta`,`evento`) |
| Injeção / XSS | Validação server-side contra o schema, limites de tamanho, sanitização; respostas renderizadas como texto |
| IDOR | `access` com `atleta.id = user.id`; leitura de inscrição alheia negada e registrada |
| Confusão entre coleções auth | Helpers de acesso exigem `user.collection === 'users'`; REST de auth do atleta bloqueado |
| Open redirect | `retorno` só aceita caminho interno (`/` + sem `//`) |
| Vazamento em analytics | `data-ndovu-mask` obrigatório; sem corpo de mutação; rota do formulário fora do page-view com query |
| Cache com PII | `no-store` nas rotas autenticadas; `revalidatePath` só em conteúdo público |
| Upload malicioso | MIME real (magic bytes), tamanho, re-encode com `sharp`, nome aleatório, download autenticado |
| Endpoints REST de auth do atleta | Bloqueados no `proxy.ts`; login/verificação só pelas nossas rotas (server actions + `payload.verifyEmail`) |
| Log com PII | Nenhuma resposta em `console.log`; erro genérico ao usuário; detalhe só no log do servidor sem dados |

---

## 11. Design system e UX

### 11.1 Reuso (sem biblioteca nova)
`.field`, `.field-row`, `.input`, `.select`, `.textarea` ([`globals.css:1439`](../src/app/(frontend)/globals.css#L1439)),
`.alerta`, `.alerta--ok/--erro` ([`1505`](../src/app/(frontend)/globals.css#L1505)),
`.passos` ([`2078`](../src/app/(frontend)/globals.css#L2078)),
`.check-item` ([`2036`](../src/app/(frontend)/globals.css#L2036)),
`.btn`, `.card`, `.pill`, `.tag`, `.muted`, `.eyebrow`, `.page-hero`, `.breadcrumb`,
focus ring de 3px já definido, `.sr-only`.

### 11.2 O que será adicionado ao CSS (seção comentada "Inscrições")
- `.inscricao-progresso` (indicador de passos + "Passo 2 de 4") — sem depender de JS para
  leitura, com `aria-current="step"`.
- `.consentimento` (bloco com borda esquerda, texto + link do aviso + versão).
- `.resumo-envio` (tabela de revisão com botão "editar").
- `.aviso-privacidade` (callout com ícone de cadeado, cor discreta).
- `.upload` (área de arrastar com fallback de botão).
- `.campo-erro` e `.erro-resumo`.
- Estados de "fora do período" (reaproveita `.alerta` + `.pill`).

### 11.3 Acessibilidade (WCAG 2.2 AA)
`fieldset`/`legend` por seção, `label` sempre visível, `aria-describedby` para ajuda e erro,
resumo de erros com links, foco gerenciado na troca de passo, contraste ≥ 4.5:1, alvos ≥ 44px,
não exigir timing, funcionar com zoom 200% e teclado, textos em linguagem simples
("peso" e "categoria" explicados), `autocomplete` correto (`name`, `email`, `tel`, `bday`).

### 11.4 Esboço do formulário

```
┌──────────────────────────────────────────────────────────┐
│ Maranhense Sub-15 a Sênior · Inscrições até 12/03/2027   │
│ ●━━━○━━━○━━━○   Passo 1 de 4: Identificação              │
├──────────────────────────────────────────────────────────┤
│ Nome completo         [ Maria Silva Santos        ]      │
│ E-mail                [ maria@exemplo.com         ]      │
│ CPF                   [ ***.***.***-**    🔒 ]           │
│ Nascimento            [ 12/05/2009 ]  → menor de idade   │
│                                                          │
│              [ Continuar → ]                             │
└──────────────────────────────────────────────────────────┘
```

No passo 3, bloco do responsável com aviso destacado e consentimentos separados; no passo 4,
resumo com "editar" e o botão "Enviar inscrição".

---

## 12. Arquitetura técnica e arquivos

### 12.1 Novos
```
src/collections/FormulariosInscricao.ts
src/collections/Inscricoes.ts
src/collections/Atletas.ts
src/collections/ArquivosInscricao.ts
src/collections/TrilhaPrivacidade.ts
src/blocks/CamposFormulario.ts          # tipos de campo do construtor
src/access/inscricoes.ts                # dono/admin, leitura por atleta
src/lib/inscricoes/estado.ts            # estadoInscricao (pura, testável)
src/lib/inscricoes/validacao.ts         # valida respostas contra o schema
src/lib/inscricoes/consentimento.ts     # hash/registro/revogação
src/lib/inscricoes/protocolo.ts
src/lib/crypto/campos.ts                # AES-256-GCM + índice cego
src/lib/atleta/identidade.ts            # atual/entrar/sair — fronteira para SSO futuro
src/lib/atleta/sessao.ts                # cookie felpma-atleta, login/logout
src/lib/rate-limit.ts
src/lib/email.ts                        # adaptador + templates
src/app/(frontend)/inscricoes/[evento]/page.tsx
src/app/(frontend)/inscricoes/[evento]/formulario/page.tsx
src/app/(frontend)/inscricoes/[evento]/actions.ts
src/app/(frontend)/area/**              # entrar, criar-conta, recuperar, meus-dados…
src/components/inscricoes/Formulario.tsx
src/components/inscricoes/Campo.tsx
src/components/inscricoes/Consentimentos.tsx
src/components/admin/**                 # CPF mascarado, respostas, badge, prévia
src/migrations/<timestamp>_inscricoes.ts
```

### 12.2 Alterados
`payload.config.ts` (coleções, `jobs`, `email`, `csrf`), `Competicoes.ts`,
`Configuracoes.ts`, `constants.ts` (bases legais, status, tipos de campo), `format.ts`,
`competicoes.ts`, `calendario/[slug]/page.tsx`, `calendario/page.tsx`, `layout.tsx`
(consentimento de analytics), `Header/HeaderClient/Footer` (link da área), `globals.css`,
`docker-compose*.yml` + `Dockerfile` (volume `uploads-inscricoes`), `deploy/backup/backup.sh`
(cifra + volume), `.env.example`, `README.md`, `seed/index.ts` (evento + formulário de exemplo),
`payload-types.ts`, `importMap.js`.

### 12.3 Pontos de atenção de plataforma
- **Next 16**: `params` é `Promise`; `middleware` virou `proxy.ts`; `cookies()` é assíncrono;
  Server Actions exigem `Origin` válido — ler `node_modules/next/dist/docs/01-app` antes de codar.
- **Payload 3.91**: campo com `validate` próprio **substitui** o validador nativo (lição do
  projeto) — reimplementar min/max no hook se usar validação customizada.
- **Migrations**: `pnpm migrate:create` + `pnpm generate:types`; em produção rodam no boot.
  Lembrete do projeto: `payload` regrava `payload-types.ts` sem prettier — rodar o formatador.
- **`importMap`**: qualquer componente custom de admin exige `pnpm generate:importmap`.
- **Node**: build local precisa do Node 22 (`~/.local/bin/node`), não o shim do asdf.

---

## 13. Operação, deploy e infraestrutura

| Item | Mudança |
|---|---|
| Volume de upload privado | `uploads-inscricoes` em `docker-compose.yml` e no overlay de produção + `mkdir` no Dockerfile + inclusão no `backup.sh` |
| Backup | Cifrar com `age` antes do `r2`; guardar a chave fora do servidor; testar restore com o arquivo cifrado |
| E-mail transacional | `@payloadcms/email-resend` + `RESEND_API_KEY`; ativação de conta, recuperação de senha e confirmação de inscrição |
| Chave de campos | `LGPD_CHAVE_CAMPOS` (32 bytes base64) + `LGPD_HASH_SALT`; rotação documentada |
| Migrations | 1 migration inicial das 5 coleções + índices |
| Seed | Evento de exemplo com formulário publicado e janela aberta para testar o fluxo inteiro |
| CI | Adicionar `pnpm test` se aprovado o vitest (decisão aberta nº 9) |
| Saúde | `/healthz` continua igual; job de expurgo loga sucesso/falha |

---

## 14. Fases, esforço e critérios de aceite

### 14.1 Área do filiado — Nível 1 (escopo fechado)

**Telas públicas (`/area`), todas `no-store`:**

| Rota | O que faz |
|---|---|
| `/area/entrar` | E-mail + senha; link para criar conta e recuperar senha |
| `/area/criar-conta` | Nome, e-mail, senha, CPF, nascimento, telefone, cidade/UF + aceite do aviso de privacidade. Entra como **pendente de ativação** |
| `/area/ativar` | Confirma o token do e-mail e libera a conta (sem aprovação manual) |
| `/area/recuperar-senha` | Pede o link por e-mail (só quando houver Resend configurado) |
| `/area/redefinir-senha` | Define nova senha e revoga as sessões antigas |
| `/area` | Painel: inscrições (protocolo, evento, status), atalhos |
| `/area/inscricoes/[protocolo]` | Detalhe da inscrição + cancelar dentro do prazo |
| `/area/meus-dados` | Editar contato; CPF mascarado; trocar senha |
| `/area/consentimentos` | Ver e revogar consentimento não essencial |
| `/area/privacidade` | Exportar dados (JSON/CSV) e pedir eliminação |

**No painel:** Contas de atleta (busca, aprovar, bloquear, anonimizar) e o atalho
**Cadastros pendentes** com contador, que abre a lista filtrada por `status = pendente` — o resto
das telas do módulo Inscrições já está descrito na seção 5.

**Regras do Nível 1:**
- Cadastro só com e-mail único e CPF único (índice cego); e-mail tem de ser verificado para
  entrar (a conta fica `pendente` até lá).
- Senha mínima de 10 caracteres; bloqueio após 5 tentativas por 10 minutos.
- Sessão de 8h, revogável; trocar senha derruba todas as sessões.
- Nada de rascunho de formulário no dispositivo.
- Exportação e eliminação são self-service; o que tiver obrigação legal é anonimizado, não
  apagado, com explicação na tela.
- Atleta nunca vê o painel, nunca lista outra conta e nunca lê inscrição alheia.

**Fora do Nível 1:** perfil esportivo, upload de documentos pessoais, vínculo com CT/clube,
anuidade, pagamento, carteirinha, múltiplos atletas por conta (a confirmar).

### Fase 1 — MVP (14–18 dias)
**Refatoração dos helpers de acesso** (collection-aware) + testes de isolamento + contas de
atleta + login/cadastro/verificação + formulário no admin + página e formulário públicos +
LGPD do formulário (consentimentos, prova, aviso) + área do atleta Nível 1 + migration +
seed + CSS.

**Aceite:** evento fechado não permite envio nem por link direto; atleta sem login é
redirecionado; menor sem responsável não envia; consentimento obrigatório sem marcar não
envia; inscrição grava protocolo e prova; atleta vê só a própria inscrição; nenhum campo de
PII aparece no snapshot do Ndovu.

### Fase 2 — Gestão e LGPD operacional (10–12 dias)
Lista/filtros/status, revelação auditada, upload privado, trilha, expurgo automático,
exportação, direitos do titular (exportar/eliminar/revogar), cifra de backups, mascaramento no
admin, papel `lgpd`.

**Aceite:** revelar CPF gera evento na trilha; expurgo roda e registra; exportação traz todos
os dados do titular; revogação surte efeito; backup restaurado de arquivo cifrado.

### Fase 3 — Extras (6–8 dias)
Vagas + lista de espera, e-mail transacional completo, relatórios, exportação CSV por evento,
CAPTCHA, MFA do painel, SSO com a área do filiado oficial.

### Fora do escopo (a menos que você peça)
Pagamento de taxa de inscrição; carteirinha; ranking; aplicativo; inscrição de vários atletas
por um técnico/CT em uma única conta; integração com sistema da confederação.

---

## 15. Riscos e decisões abertas (precisam da sua resposta)

1. **Uma conta = um atleta?** (recomendado) Ou um responsável/técnico com N atletas na mesma
   conta? A segunda opção muda o modelo de dados e a tela inicial.
2. **O formulário coleta dado de saúde/atestado?** Se sim, entra o art. 11 (consentimento
   específico destacado) e o RIPD é obrigatório. Se não, muito do peso de LGPD diminui.
3. **Quem é o encarregado (DPO) e qual o canal público?** Sem isso, a política de privacidade
   fica incompleta.
4. **Prazo de retenção padrão** (proposta: 12 meses após o evento; 5 anos para o que tem
   obrigação fiscal). Confirmar com a contabilidade/jurídico.
5. **Provedor de e-mail**: Resend (decidido em 09/11/2026). Sem ele não há ativação de conta,
   recuperação de senha nem confirmação de inscrição.
6. **Área do filiado oficial**: vamos construir a nossa agora e depois integrar, ou já existe
   um sistema que deve ser o dono do login?
7. **GA4/Ndovu**: incluímos o banner de consentimento neste projeto (recomendado, porque a
   área de inscrição aumenta o risco) ou fica para depois?
8. **Pagamento de inscrição** está fora? (assumido fora)
9. **Testes automatizados**: introduzir vitest para as regras de janela, validação e
   consentimento (recomendado) ou manter só lint/typecheck/build?
10. **Cifra do disco da VPS** (LUKS) entra no escopo de infra ou fica como recomendação?
11. ~~**Área do filiado — qual nível agora?**~~ **Resolvido: Nível 1** (30/10/2026).
12. **Forma de login**: e-mail + senha (recomendado: mais previsível para o público do
    interior) ou link mágico por e-mail (menos senha para gerenciar, mais dependência do
    provedor de e-mail)?

---

## 16. Próximo passo sugerido

1. Você responde as decisões 1–5 (as que travam o modelo de dados).
2. Eu fecho o desenho de telas do painel e do formulário (baixa fidelidade) para validar antes
   de codar.
3. Implemento a Fase 1 com migration, seed e checklist de aceite, e entregamos o módulo
   testável de ponta a ponta em ambiente local.
4. Em paralelo, a federação nomeia o encarregado e encomenda a revisão jurídica dos textos —
   que entram no código como versão 1 do aviso.
