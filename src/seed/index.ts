/**
 * Popula o banco com conteúdo de EXEMPLO para desenvolvimento.
 * Uso: pnpm seed            (apaga o conteúdo existente e recria)
 *
 * Tudo que está entre colchetes, como [Nome], é placeholder para a federação substituir.
 */
import { getPayload, type CollectionSlug } from 'payload'
import config from '@payload-config'
import crypto from 'node:crypto'

const payload = await getPayload({ config })
const log = (m: string) => payload.logger.info(`[seed] ${m}`)

// ---------- helpers ----------
const dias = (n: number) => {
  const d = new Date()
  d.setUTCHours(15, 0, 0, 0) // meio-dia em Fortaleza, evita "pular" de dia
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString()
}

const texto = (...paragrafos: string[]) => ({
  root: {
    type: 'root',
    format: '' as const,
    indent: 0,
    version: 1,
    direction: 'ltr' as const,
    children: paragrafos.map((p) =>
      p.startsWith('## ')
        ? {
            type: 'heading',
            tag: 'h2',
            format: '',
            indent: 0,
            version: 1,
            direction: 'ltr',
            children: [
              {
                type: 'text',
                text: p.slice(3),
                format: 0,
                detail: 0,
                mode: 'normal',
                style: '',
                version: 1,
              },
            ],
          }
        : {
            type: 'paragraph',
            format: '',
            indent: 0,
            version: 1,
            direction: 'ltr',
            textFormat: 0,
            children: [
              {
                type: 'text',
                text: p,
                format: 0,
                detail: 0,
                mode: 'normal',
                style: '',
                version: 1,
              },
            ],
          },
    ),
  },
})

/** PDF mínimo válido com uma linha de texto. */
const pdf = (titulo: string) => {
  const safe = titulo
    .normalize('NFD')
    .replace(/[^\x20-\x7e]/g, '')
    .replace(/[()\\]/g, '')
  const stream = `BT /F1 18 Tf 72 760 Td (${safe}) Tj 0 -28 Td /F1 11 Tf (Documento de exemplo - substitua pelo arquivo oficial.) Tj ET`
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let out = '%PDF-1.4\n'
  const offs: number[] = []
  objs.forEach((o, i) => {
    offs.push(out.length)
    out += `${i + 1} 0 obj\n${o}\nendobj\n`
  })
  const xref = out.length
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return Buffer.from(out, 'latin1')
}

const doc = async (titulo: string, categoria: string, extra: Record<string, unknown> = {}) => {
  const nome = titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const buf = pdf(titulo)
  return payload.create({
    collection: 'documentos',
    data: { titulo, categoria: categoria as never, ...extra },
    file: { data: buf, mimetype: 'application/pdf', name: `${nome}.pdf`, size: buf.length },
  })
}

// ---------- limpeza ----------
const limpar: CollectionSlug[] = [
  'convocacoes',
  'resultados',
  'recordes',
  'competicoes',
  'noticias',
  'centros',
  'diretoria',
  'paginas',
  'mensagens',
  'documentos',
  'media',
]
for (const c of limpar) {
  await payload.delete({ collection: c, where: { id: { exists: true } } })
}
log('conteúdo anterior removido')

// ---------- usuário admin ----------
const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@felpma.org.br'
const existente = await payload.find({
  collection: 'users',
  where: { email: { equals: adminEmail } },
  limit: 1,
})
if (!existente.docs.length) {
  const senha = process.env.SEED_ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url')
  await payload.create({
    collection: 'users',
    data: { email: adminEmail, password: senha, nome: 'Administrador', role: 'admin' },
  })
  log(`usuário admin criado: ${adminEmail} / senha: ${senha}  (troque no primeiro acesso)`)
}

// ---------- documentos ----------
const ano = new Date().getFullYear()
const estatuto = await doc('Estatuto social', 'estatuto', {
  descricao: 'Versão consolidada',
  dataPublicacao: dias(-400),
})
const regGeral = await doc(`Regulamento geral de competições ${ano}`, 'regulamento', { ano })
const calendarioOficial = await doc(`Calendário oficial ${ano}`, 'calendario', { ano })
const fichaAtleta = await doc('Ficha de inscrição de atletas', 'formulario')
const fichaFiliacao = await doc('Ficha de filiação', 'formulario')
await doc(`Prestação de contas ${ano - 1}`, 'prestacao-contas', {
  ano: ano - 1,
  descricao: 'Balanço patrimonial e demonstrativos',
})
await doc(`Prestação de contas ${ano - 2}`, 'prestacao-contas', {
  ano: ano - 2,
  descricao: 'Balanço patrimonial e demonstrativos',
})
await doc(`Ata da assembleia geral ordinária ${ano}`, 'ata', { ano, dataPublicacao: dias(-120) })
await doc('Nota oficial nº 01', 'edital', { ano, descricao: '[Assunto da nota oficial]' })
const regMaranhense = await doc(`Regulamento — Campeonato Maranhense ${ano}`, 'regulamento', {
  ano,
})
const regCurso = await doc('Edital — Curso de Formação de Árbitros', 'edital', { ano })
log('documentos criados')

// ---------- competições ----------
const comp = (data: Record<string, unknown>) =>
  payload.create({ collection: 'competicoes', data: data as never })

const capital = await comp({
  nome: 'Campeonato Maranhense — Etapa Capital',
  tipo: 'estadual',
  categorias: 'Sub-15, Sub-17, Sub-20 e Sênior',
  dataInicio: dias(24),
  dataFim: dias(25),
  inscricoesAte: dias(12),
  local: '[Ginásio]',
  cidade: 'São Luís',
  pesagem: '[Data e horário]',
  regulamento: regMaranhense.id,
  linkInscricao: 'https://forms.gle/[seu-formulario]',
  destaqueHome: true,
  descricao: texto(
    'Primeira etapa do Campeonato Maranhense, aberta a atletas filiados nas categorias Sub-15, Sub-17, Sub-20 e Sênior, masculino e feminino.',
    '## Inscrições',
    'As inscrições são feitas pelo clube ou CT filiado, dentro do prazo indicado. Consulte o regulamento para categorias de peso e documentação.',
    '## Pesagem',
    'A pesagem oficial acontece no local da competição, conforme cronograma publicado pela organização.',
  ),
})
const brasileiro17 = await comp({
  nome: 'Campeonato Brasileiro Sub-17',
  tipo: 'nacional',
  categorias: 'Sub-17',
  dataInicio: dias(46),
  dataFim: dias(49),
  local: '[Local]',
  cidade: '[Cidade]',
  uf: 'SP',
  status: 'convocacao-publicada',
})
await comp({
  nome: 'Curso de Formação de Árbitros Estaduais',
  tipo: 'curso',
  area: 'Arbitragem',
  categorias: 'Arbitragem',
  dataInicio: dias(33),
  dataFim: dias(34),
  inscricoesAte: dias(28),
  local: '[Local]',
  cidade: 'São Luís',
  regulamento: regCurso.id,
  linkInscricao: 'https://forms.gle/[seu-formulario]',
  descricao: texto('Formação teórica e prática para novos árbitros do quadro estadual.'),
})
await comp({
  nome: 'Clínica Técnica: Arranco e Arremesso',
  tipo: 'curso',
  area: 'Técnicos',
  dataInicio: dias(60),
  local: '[Local]',
  cidade: 'Imperatriz',
})
await comp({
  nome: 'Campeonato Maranhense — Etapa Interior',
  tipo: 'estadual',
  categorias: 'Sub-15 a Sênior',
  dataInicio: dias(75),
  dataFim: dias(76),
  local: '[Local]',
  cidade: 'Imperatriz',
})
await comp({
  nome: 'Copa Norte-Nordeste',
  tipo: 'regional',
  categorias: 'Sub-20 e Sênior',
  dataInicio: dias(95),
  dataFim: dias(97),
  cidade: '[Cidade]',
  uf: 'PE',
})
await comp({
  nome: 'Festival Escolar de Levantamento de Pesos',
  tipo: 'evento',
  area: 'Base',
  categorias: 'Iniciação',
  dataInicio: dias(110),
  local: '[Escola]',
  cidade: 'São Luís',
})
const abertura = await comp({
  nome: 'Torneio de Abertura da Temporada',
  tipo: 'estadual',
  categorias: 'Sub-17 a Sênior',
  dataInicio: dias(-40),
  dataFim: dias(-40),
  local: '[Local]',
  cidade: 'São Luís',
})
log('competições criadas')

// ---------- convocações ----------
await payload.create({
  collection: 'convocacoes',
  data: {
    titulo: 'Seleção Maranhense — Brasileiro Sub-17',
    tipo: 'atletas',
    detalhe: '[Nº] atletas · [Nº] técnicos',
    competicao: brasileiro17.id,
    dataPublicacao: dias(-3),
    prazoConfirmacao: dias(10),
    documento: (await doc('Convocação — Seleção Maranhense Sub-17', 'edital')).id,
  },
})
await payload.create({
  collection: 'convocacoes',
  data: {
    titulo: 'Quadro de arbitragem — Campeonato Maranhense',
    tipo: 'arbitros',
    detalhe: 'Etapa Capital',
    competicao: capital.id,
    dataPublicacao: dias(-6),
    documento: (await doc('Convocação — Arbitragem Maranhense', 'edital')).id,
  },
})
await payload.create({
  collection: 'convocacoes',
  data: {
    titulo: 'Comissão técnica — Brasileiro Sub-17',
    tipo: 'tecnicos',
    detalhe: 'Técnicos e staff',
    competicao: brasileiro17.id,
    dataPublicacao: dias(-3),
    documento: (await doc('Convocação — Comissão técnica Sub-17', 'edital')).id,
  },
})
log('convocações criadas')

// ---------- resultados (exemplo) ----------
const L = (
  sexo: 'F' | 'M',
  categoriaIdade: string,
  categoriaPeso: string,
  colocacao: number,
  n: number,
  clube: string,
  pc: number,
  a: number,
  b: number,
) => ({
  sexo,
  categoriaIdade,
  categoriaPeso,
  colocacao,
  atleta: `[Atleta ${n}]`,
  clube,
  pesoCorporal: pc,
  arranco: a,
  arremesso: b,
})
await payload.create({
  collection: 'resultados',
  data: {
    titulo: 'Torneio de Abertura da Temporada',
    competicao: abertura.id,
    data: dias(-40),
    cidade: 'São Luís',
    sumula: (await doc('Súmula — Torneio de Abertura', 'outros')).id,
    observacoes: 'Resultados de exemplo. Substitua pelos dados oficiais da súmula.',
    linhas: [
      L('F', 'senior', '59 kg', 1, 1, '[CT 1]', 58.4, 70, 88),
      L('F', 'senior', '59 kg', 2, 2, '[CT 2]', 58.9, 65, 84),
      L('F', 'senior', '59 kg', 3, 3, '[CT 1]', 57.7, 61, 78),
      L('F', 'sub17', '49 kg', 1, 4, '[CT 3]', 48.6, 48, 60),
      L('F', 'sub17', '49 kg', 2, 5, '[CT 2]', 47.9, 45, 58),
      L('M', 'senior', '73 kg', 1, 6, '[CT 1]', 72.6, 112, 140),
      L('M', 'senior', '73 kg', 2, 7, '[CT 3]', 72.1, 105, 133),
      L('M', 'senior', '89 kg', 1, 8, '[CT 2]', 88.0, 120, 151),
      L('M', 'sub17', '61 kg', 1, 9, '[CT 1]', 60.2, 82, 101),
      L('M', 'sub17', '61 kg', 2, 10, '[CT 3]', 59.8, 0, 96),
    ] as never,
  },
})
log('resultados criados')

// ---------- recordes (exemplo) ----------
const rec = (
  categoriaIdade: string,
  sexo: 'F' | 'M',
  categoriaPeso: string,
  movimento: 'arranco' | 'arremesso' | 'total',
  marca: number,
  n: number,
) =>
  payload.create({
    collection: 'recordes',
    data: {
      categoriaIdade: categoriaIdade as never,
      sexo,
      categoriaPeso,
      movimento,
      marca,
      atleta: `[Atleta ${n}]`,
      clube: '[CT]',
      data: dias(-40 - n * 30),
      competicao: '[Competição]',
    },
  })
for (const [peso, a, b, n] of [
  ['49 kg', 62, 80, 1],
  ['59 kg', 72, 90, 2],
  ['71 kg', 80, 100, 3],
] as const) {
  await rec('senior', 'F', peso, 'arranco', a, n)
  await rec('senior', 'F', peso, 'arremesso', b, n)
  await rec('senior', 'F', peso, 'total', a + b, n)
}
for (const [peso, a, b, n] of [
  ['61 kg', 98, 122, 4],
  ['73 kg', 115, 142, 5],
  ['89 kg', 125, 155, 6],
] as const) {
  await rec('senior', 'M', peso, 'arranco', a, n)
  await rec('senior', 'M', peso, 'arremesso', b, n)
  await rec('senior', 'M', peso, 'total', a + b, n)
}
await rec('sub17', 'F', '49 kg', 'total', 110, 7)
await rec('sub17', 'M', '61 kg', 'total', 186, 8)
log('recordes criados')

// ---------- notícias ----------
const noticia = (
  titulo: string,
  categoria: string,
  diasAtras: number,
  resumo: string,
  destaque = false,
) =>
  payload.create({
    collection: 'noticias',
    data: {
      titulo,
      categoria: categoria as never,
      resumo,
      destaque,
      dataPublicacao: dias(-diasAtras),
      _status: 'published',
      conteudo: texto(
        resumo,
        '[Texto completo da notícia. Edite no painel em Conteúdo › Notícias.]',
      ),
    },
  })
await noticia(
  'Atletas maranhenses garantem medalhas no Campeonato Brasileiro',
  'competicoes',
  2,
  '[Resumo com os principais resultados e destaques da delegação maranhense.]',
  true,
)
await noticia(
  `Abertas as filiações e renovações para a temporada ${ano}`,
  'filiacao',
  5,
  'Atletas, técnicos, árbitros e clubes já podem se filiar ou renovar o registro para a nova temporada.',
)
await noticia(
  'Curso de formação de árbitros estaduais: inscrições abertas',
  'arbitragem',
  8,
  'A federação abre vagas para o curso de formação de novos árbitros do quadro estadual.',
)
await noticia(
  'Divulgada a convocação da seleção maranhense Sub-17',
  'selecao',
  3,
  'Confira a lista de atletas e comissão técnica que representarão o Maranhão no Campeonato Brasileiro Sub-17.',
)
await noticia(
  '[Título da notícia institucional]',
  'institucional',
  14,
  '[Resumo da notícia institucional.]',
)
log('notícias criadas')

// ---------- centros ----------
const centro = (data: Record<string, unknown>) =>
  payload.create({ collection: 'centros', data: data as never })
await centro({
  nome: '[Nome do CT 1]',
  cidade: 'São Luís',
  bairro: '[Bairro]',
  endereco: '[Endereço]',
  latitude: -2.5307,
  longitude: -44.3068,
  tecnicoResponsavel: '[Nome]',
  tags: ['alto-rendimento', 'base'],
  horarios: 'Segunda a sexta: [horários]\nSábado: [horários]',
  whatsapp: '98900000000',
  descricao: texto('[Apresentação do CT: estrutura, equipamentos, histórico e conquistas.]'),
})
await centro({
  nome: '[Nome do CT 2]',
  cidade: 'São Luís',
  endereco: '[Endereço]',
  latitude: -2.5021,
  longitude: -44.2512,
  tecnicoResponsavel: '[Nome]',
  tags: ['iniciacao', 'projeto-social'],
})
await centro({
  nome: '[Nome do CT 3]',
  cidade: 'Imperatriz',
  endereco: '[Endereço]',
  latitude: -5.5264,
  longitude: -47.4917,
  tecnicoResponsavel: '[Nome]',
  tags: ['base', 'paradesporto'],
})
await centro({
  nome: '[Nome do CT 4]',
  cidade: 'Caxias',
  endereco: '[Endereço]',
  latitude: -4.8589,
  longitude: -43.3561,
  tecnicoResponsavel: '[Nome]',
  tags: ['iniciacao'],
})
log('centros criados')

// ---------- diretoria ----------
const membros: [string, string, number][] = [
  ['Presidente', 'diretoria', 1],
  ['Vice-presidente', 'diretoria', 2],
  ['Diretor(a) técnico(a)', 'diretoria', 3],
  ['Diretor(a) financeiro(a)', 'diretoria', 4],
  ['Presidente do conselho fiscal', 'conselho-fiscal', 10],
  ['Conselheiro(a) fiscal', 'conselho-fiscal', 11],
  ['Coordenador(a) de arbitragem', 'arbitragem', 20],
]
for (const [cargo, grupo, ordem] of membros) {
  await payload.create({
    collection: 'diretoria',
    data: { nome: `[Nome — ${cargo}]`, cargo, grupo: grupo as never, ordem, mandato: '[Mandato]' },
  })
}
log('diretoria criada')

// ---------- páginas ----------
await payload.create({
  collection: 'paginas',
  data: {
    titulo: 'Política de privacidade',
    slug: 'politica-de-privacidade',
    resumo: 'Como a federação trata os dados pessoais coletados neste site.',
    _status: 'published',
    conteudo: texto(
      '[Texto da política de privacidade em conformidade com a LGPD. Revise com a assessoria jurídica da federação.]',
      '## Dados coletados',
      'O formulário de contato coleta nome, e-mail, telefone (opcional) e a mensagem enviada, usados exclusivamente para responder ao contato.',
      '## Cookies',
      'Este site não usa cookies de rastreamento nem ferramentas de publicidade.',
    ),
  },
})

// ---------- globals ----------
await payload.updateGlobal({
  slug: 'configuracoes',
  data: {
    sigla: 'FELPMA',
    nomeCompleto: 'Federação de Levantamento de Pesos do Maranhão',
    cnpj: '[00.000.000/0000-00]',
    endereco: '[Endereço da sede]',
    cidade: 'São Luís',
    cep: '[00000-000]',
    email: 'contato@felpma.org.br',
    telefone: '[(98) 0000-0000]',
    horarioAtendimento: '[Segunda a sexta, das 8h às 12h]',
    instagram: 'https://instagram.com/[usuario]',
    apoiadores: [
      { nome: '[Apoiador 1]' },
      { nome: '[Apoiador 2]' },
      { nome: '[Apoiador 3]' },
      { nome: '[Apoiador 4]' },
    ],
    linkAreaFiliado: '',
  },
})

await payload.updateGlobal({
  slug: 'home',
  data: {
    textoDestaque:
      'Categorias Sub-15, Sub-17, Sub-20 e Sênior, masculino e feminino. Confira o regulamento, a lista de inscritos e o cronograma de pesagem.',
    chamadaFiliacao: {
      titulo: 'Faça parte do levantamento de pesos maranhense',
      texto: 'Escolha seu perfil, veja os documentos necessários e comece sua filiação.',
    },
  },
})

await payload.updateGlobal({
  slug: 'filiacao',
  data: {
    perfis: [
      {
        nome: 'Atleta',
        descricao: 'Para competir em eventos oficiais e ser convocado.',
        formulario: fichaFiliacao.id,
        documentos: [
          'Documento de identidade (RG ou certidão de nascimento)',
          'CPF',
          'Foto 3x4 recente',
          'Atestado médico de aptidão esportiva',
          'Autorização do responsável (menores de 18 anos)',
        ].map((item) => ({ item })),
      },
      {
        nome: 'Técnico',
        descricao: 'Para atuar como treinador em competições.',
        documentos: [
          'Documento de identidade e CPF',
          'Registro no CREF',
          'Foto 3x4 recente',
          'Comprovante de vínculo com clube ou CT',
        ].map((item) => ({ item })),
      },
      {
        nome: 'Árbitro',
        descricao: 'Para compor o quadro de arbitragem estadual.',
        documentos: [
          'Documento de identidade e CPF',
          'Certificado de curso de arbitragem',
          'Foto 3x4 recente',
        ].map((item) => ({ item })),
      },
      {
        nome: 'Clube / CT',
        descricao: 'Para filiar sua entidade e inscrever atletas.',
        documentos: [
          'Estatuto social e ata de eleição',
          'CNPJ',
          'Dados do responsável legal',
          'Endereço e fotos do local de treino',
          'Técnico responsável filiado',
        ].map((item) => ({ item })),
      },
    ],
    passos: [
      { titulo: 'Reúna os documentos', texto: 'Confira a lista do seu perfil' },
      { titulo: 'Envie para a federação', texto: 'Pelo formulário ou por e-mail' },
      { titulo: 'Pague a anuidade', texto: 'Pix ou boleto' },
      { titulo: 'Receba a confirmação', texto: 'Após aprovação da federação' },
    ],
    faq: [
      {
        pergunta: 'Quanto tempo leva a aprovação?',
        resposta: '[Prazo de análise definido pela federação.]',
      },
      {
        pergunta: 'Menores de idade podem se filiar?',
        resposta: '[Regras para atletas menores, com autorização do responsável.]',
      },
      {
        pergunta: 'Preciso estar vinculado a um clube?',
        resposta: '[Regras de vínculo com clube ou CT filiado.]',
      },
      {
        pergunta: 'Como transferir meu registro de outro estado?',
        resposta: '[Procedimento de transferência.]',
      },
    ],
  },
})

await payload.updateGlobal({
  slug: 'federacao',
  data: {
    apresentacao:
      'A FELPMA organiza, fomenta e representa o levantamento de pesos olímpico no Maranhão.',
    historia: texto(
      '[História da federação: fundação, marcos, atletas de destaque e conquistas.]',
      '[Segundo parágrafo da história.]',
    ),
    missao: '[Missão da federação]',
    visao: '[Visão da federação]',
    valores: '[Valores da federação]',
    filiacoes: [{ nome: 'Confederação Brasileira de Levantamento de Pesos (CBLP)' }],
    transparenciaIntro:
      'Prestações de contas, atas, convênios e documentos institucionais, publicados em cumprimento à legislação esportiva.',
  },
})
log('páginas fixas atualizadas')

// Evita "variável não usada" para documentos que só existem para aparecer nas listagens.
void [estatuto, regGeral, calendarioOficial, fichaAtleta]

log('pronto! Rode `pnpm dev` e abra http://localhost:3000')
process.exit(0)
