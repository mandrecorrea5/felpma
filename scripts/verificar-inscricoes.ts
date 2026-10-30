/**
 * Verificação de ponta a ponta do módulo de inscrições (dev).
 *
 *   PATH=~/.asdf/installs/nodejs/22.23.2/bin:$PATH node_modules/.bin/payload run scripts/verificar-inscricoes.ts
 *
 * Exige o site rodando em NEXT_PUBLIC_SERVER_URL (para os testes de HTTP).
 * Cria dados de teste marcados com [TESTE] e não apaga nada — o ambiente é dev.
 */
import { getPayload } from 'payload'
import config from '../src/payload.config'

const base = (process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000').replace(/\/+$/, '')

const cpfValidoFake = (base9: string): string => {
  const digitos = base9.split('').map(Number)
  const calc = (ate: number) => {
    let soma = 0
    for (let i = 0; i < ate; i++) soma += digitos[i] * (ate + 1 - i)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }
  digitos.push(calc(9))
  digitos.push(calc(10))
  return digitos.join('')
}

const rico = (texto: string) => ({
  root: {
    type: 'root',
    children: [
      { type: 'paragraph', children: [{ type: 'text', text: texto, version: 1 }], version: 1 },
    ],
    direction: null,
    format: '' as const,
    indent: 0,
    version: 1,
  },
})

const resultados: Array<{ ok: boolean; teste: string; detalhe?: string }> = []
const verificar = (teste: string, ok: boolean, detalhe?: string) => {
  resultados.push({ ok, teste, detalhe })
  console.log(`${ok ? '✓' : '✗'} ${teste}${detalhe ? ` — ${detalhe}` : ''}`)
}

const payload = await getPayload({ config })

// ---------------------------------------------------------------- evento
const hoje = new Date()
const iso = (d: Date) => d.toISOString()
const menos = (dias: number) => new Date(hoje.getTime() - dias * 86_400_000)
const mais = (dias: number) => new Date(hoje.getTime() + dias * 86_400_000)

const dadosEvento = {
  nome: '[TESTE] Copa de Inscrições 2027',
  slug: 'teste-inscricao-2027',
  tipo: 'estadual' as const,
  dataInicio: iso(mais(40)),
  dataFim: iso(mais(42)),
  cidade: 'São Luís',
  uf: 'MA',
  inscricoesAbertas: true,
  inscricoesDe: iso(menos(1)),
  inscricoesAte: iso(mais(30)),
  status: 'auto' as const,
}

const eventoExistente = await payload.find({
  collection: 'competicoes',
  where: { slug: { equals: dadosEvento.slug } },
  limit: 1,
  overrideAccess: true,
})

const evento = eventoExistente.docs[0]
  ? await payload.update({
      collection: 'competicoes',
      id: eventoExistente.docs[0].id,
      data: dadosEvento,
      overrideAccess: true,
    })
  : await payload.create({ collection: 'competicoes', data: dadosEvento, overrideAccess: true })

verificar('evento de teste criado', Boolean(evento.id), String(evento.id))

// -------------------------------------------------------------- formulário
const formExistente = await payload.find({
  collection: 'formularios-inscricao',
  where: { evento: { equals: evento.id } },
  limit: 1,
  overrideAccess: true,
})

const dadosFormulario: Record<string, unknown> = {
  titulo: '[TESTE] Inscrição — Copa 2027',
  evento: evento.id,
  _status: 'published' as const,
  descricao: rico('Preencha com atenção. Campos com * são obrigatórios.'),
  campos: [
    { blockType: 'secao', titulo: 'Dados esportivos', descricao: 'Conte como você compete.' },
    {
      blockType: 'texto',
      nome: 'clube',
      rotulo: 'Clube ou CT',
      obrigatorio: true,
      sensivel: false,
      maxLength: 120,
    },
    {
      blockType: 'selecao',
      nome: 'categoria',
      rotulo: 'Categoria',
      obrigatorio: true,
      opcoes: [
        { valor: 'sub17', rotulo: 'Sub-17' },
        { valor: 'senior', rotulo: 'Sênior' },
      ],
    },
    {
      blockType: 'texto',
      nome: 'condicao-saude',
      rotulo: 'Condição de saúde relevante',
      obrigatorio: false,
      sensivel: true,
      ajuda: 'Só preencha se houver algo que a equipe médica precise saber.',
    },
    {
      blockType: 'aceite',
      nome: 'declaracao-regulamento',
      texto: 'Declaro que li e aceito o regulamento da competição.',
      obrigatorio: true,
    },
  ],
  lgpd: {
    finalidade: 'Organizar a inscrição e a ordem de entrada na competição.',
    baseLegal: 'contrato' as const,
    prazoRetencaoMeses: 12,
    justificativaRetencao: 'Prazo de defesa em processo disciplinar.',
    versaoAviso: '2026-10',
    avisoPrivacidade: rico(
      'Usamos seus dados para a inscrição. Você pode pedir acesso, correção ou exclusão na área do atleta.',
    ),
  },
  consentimentos: [
    {
      identificador: 'tratamento-inscricao',
      finalidade: 'inscricao' as const,
      obrigatorio: true,
      texto: 'Autorizo o uso dos meus dados para a inscrição neste evento.',
    },
    {
      identificador: 'uso-imagem',
      finalidade: 'imagem' as const,
      obrigatorio: false,
      texto: 'Autorizo o uso da minha imagem em fotos e vídeos do evento.',
    },
  ],
}

const formulario = formExistente.docs[0]
  ? await payload.update({
      collection: 'formularios-inscricao',
      id: formExistente.docs[0].id,
      data: dadosFormulario as never,
      overrideAccess: true,
    })
  : await payload.create({ collection: 'formularios-inscricao', data: dadosFormulario as never, overrideAccess: true })

verificar('formulário publicado', formulario._status === 'published', `versão ${formulario.versao}`)

// ---------------------------------------------------------------- atleta
const cpf = cpfValidoFake('123456789')
const email = 'teste.inscricao@felpma.test'
const senha = 'TesteSeguro2027'

const atletaExistente = await payload.find({
  collection: 'atletas',
  where: { email: { equals: email } },
  limit: 1,
  overrideAccess: true,
})

let atleta = atletaExistente.docs[0]
if (!atleta) {
  atleta = await payload.create({
    collection: 'atletas',
    overrideAccess: true,
    data: {
      nome: 'Atleta de Teste',
      email,
      password: senha,
      cpf,
      dataNascimento: '2009-05-12T00:00:00-03:00',
      telefone: '98999990000',
      cidade: 'São Luís',
      uf: 'MA',
      aceitePrivacidade: { versao: '2026-10', aceitoEm: new Date().toISOString() },
    },
  })
}

// Conta de teste: criada pelo painel já nasce ativa (o cadastro pelo site entra pendente).
atleta = await payload.update({
  collection: 'atletas',
  id: atleta.id,
  data: { status: 'ativo' },
  overrideAccess: true,
})

verificar('CPF gravado cifrado', String(atleta.cpf ?? '').startsWith('enc:v1:'), String(atleta.cpfMascara))
verificar('índice cego do CPF presente', Boolean(atleta.cpfHash))

// ------------------------------------------------------- login + isolamento
const login = await payload.login({
  collection: 'atletas',
  data: { email, password: senha },
  overrideAccess: true,
})
const token = login.token ?? ''
verificar('login do atleta devolve token', Boolean(token))

const chamar = async (caminho: string, init: RequestInit = {}) => {
  const resposta = await fetch(`${base}${caminho}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      ...(token ? { Authorization: `JWT ${token}` } : {}),
    },
  })
  return resposta
}

const usuarios = await chamar('/api/users')
verificar('token de atleta não lista usuários do painel', usuarios.status === 403, `HTTP ${usuarios.status}`)

const escrita = await chamar('/api/competicoes', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ nome: 'invasão' }),
})
verificar('token de atleta não cria competição', escrita.status === 403, `HTTP ${escrita.status}`)

const edicaoUsuario = await chamar('/api/users/1', {
  method: 'PATCH',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ role: 'admin' }),
})
verificar('token de atleta não edita usuário do painel', edicaoUsuario.status === 403, `HTTP ${edicaoUsuario.status}`)

const listarAtletas = await chamar('/api/atletas')
verificar('token de atleta não lista contas de atleta', listarAtletas.status === 403, `HTTP ${listarAtletas.status}`)

const endpointLogin = await fetch(`${base}/api/atletas/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email, password: senha }),
})
verificar('endpoint de login do Payload bloqueado', endpointLogin.status === 404, `HTTP ${endpointLogin.status}`)

// Garante que existe um rascunho para provar que o atleta não o enxerga.
const tituloRascunho = '[TESTE] Notícia em rascunho'
const rascunhoExistente = await payload.find({
  collection: 'noticias',
  where: { titulo: { equals: tituloRascunho } },
  limit: 1,
  overrideAccess: true,
})
if (rascunhoExistente.docs.length === 0) {
  await payload.create({
    collection: 'noticias',
    overrideAccess: true,
    data: {
      titulo: tituloRascunho,
      resumo: 'Documento de teste do script de verificação.',
      conteudo: rico('Não deve aparecer para atletas.'),
      categoria: 'competicoes',
      _status: 'draft',
    } as never,
  })
}

const publicadas = await payload.count({
  collection: 'noticias',
  where: { _status: { equals: 'published' } },
  overrideAccess: true,
})

const rascunhos = await chamar('/api/noticias?limit=50')
if (rascunhos.status === 200) {
  const corpo = (await rascunhos.json()) as {
    docs: Array<{ _status?: string; titulo?: string }>
  }
  const soPublicadas = corpo.docs.every((d) => d._status === 'published')
  const semRascunho = !corpo.docs.some((d) => d.titulo === tituloRascunho)
  verificar(
    'token de atleta só enxerga notícia publicada',
    soPublicadas && semRascunho && corpo.docs.length === publicadas.totalDocs,
    `${corpo.docs.length} de ${publicadas.totalDocs} publicadas`,
  )
} else {
  verificar('token de atleta só enxerga notícia publicada', false, `HTTP ${rascunhos.status}`)
}

// ------------------------------------------------------------- inscrição
const inscricao = await payload.create({
  collection: 'inscricoes',
  overrideAccess: true,
  data: {
    protocolo: `FEL-TESTE-${Date.now().toString().slice(-6)}`,
    enviadaEm: new Date().toISOString(),
    atleta: atleta.id,
    evento: evento.id,
    formulario: formulario.id,
    formularioVersao: formulario.versao ?? 1,
    status: 'recebida',
    idadeNaInscricao: 17,
    menorDeIdade: true,
    respostas: [
      { campo: 'clube', rotulo: 'Clube ou CT', tipo: 'texto', valor: 'CT Teste', sensivel: false },
      { campo: 'categoria', rotulo: 'Categoria', tipo: 'selecao', valor: 'sub17', exibicao: 'Sub-17', sensivel: false },
      {
        campo: 'condicao-saude',
        rotulo: 'Condição de saúde relevante',
        tipo: 'texto',
        valor: 'enc:v1:teste-nao-deve-ser-usado',
        cifrado: true,
        sensivel: true,
      },
    ],
    consentimentos: [
      {
        identificador: 'tratamento-inscricao',
        versao: '2026-10',
        finalidade: 'inscricao',
        obrigatorio: true,
        texto: 'Autorizo o uso dos meus dados para a inscrição neste evento.',
        textoHash: 'hash-de-teste',
        aceito: true,
        aceitoEm: new Date().toISOString(),
      },
    ],
    responsavel: { nome: 'Responsável de Teste', parentesco: 'mãe', cpf, telefone: '98999990001' },
  },
})

verificar('inscrição criada com prazo de retenção', Boolean(inscricao.retencaoAte), String(inscricao.retencaoAte))
verificar(
  'CPF do responsável cifrado',
  String((inscricao.responsavel as { cpf?: string } | undefined)?.cpf ?? '').startsWith('enc:v1:'),
)

const lida = await payload.findByID({ collection: 'inscricoes', id: inscricao.id, overrideAccess: true })
verificar('inscrição legível pelo admin', Boolean(lida.id))

// ------------------------------------------------------------------ resumo
const falhas = resultados.filter((r) => !r.ok)
console.log(`\n${resultados.length - falhas.length}/${resultados.length} verificações passaram`)
if (falhas.length > 0) {
  console.error('Falhas:', falhas)
}

// O pool do Postgres mantém o processo vivo; o script é de verificação e termina aqui.
process.exit(falhas.length > 0 ? 1 : 0)
