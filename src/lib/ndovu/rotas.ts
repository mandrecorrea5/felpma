/**
 * Tabela de rotas do site.
 *
 * O `usePathname()` devolve a URL concreta (`/noticias/a-federação-publica...`), que no
 * dashboard do Ndovu viraria uma tela nova por notícia. Aqui a URL é reduzida ao padrão
 * do arquivo (`/noticias/[slug]`) — é isso que vira `screen`, e é o que permite ler
 * funil por página em vez de por slug.
 *
 * Toda rota de `src/app/(frontend)` precisa estar aqui. Rota fora da tabela cai em
 * `nao_mapeada`, que continua reportando (com o caminho cru em `metadados.caminho`)
 * para o buraco aparecer no dashboard em vez de sumir.
 */

export type Rota = {
  /** Padrão no disco, ex.: `/calendario/[slug]`. */
  padrao: string
  /** Nome legível, para leitura humana do dashboard. */
  nome: string
  /** Grande área do site, para agrupar no explorador. */
  area: string
}

const EXATAS: Record<string, Rota> = {
  '/': { padrao: '/', nome: 'Início', area: 'institucional' },
  // Área do atleta: telas privadas. Entram na tabela para o `screen` ser estável
  // (sem o protocolo na URL) e para o funil de cadastro/login não cair em
  // "rota fora da tabela".
  '/area': { padrao: '/area', nome: 'Área do atleta', area: 'area' },
  '/area/ativar': { padrao: '/area/ativar', nome: 'Ativar conta', area: 'area' },
  '/area/consentimentos': { padrao: '/area/consentimentos', nome: 'Consentimentos', area: 'area' },
  '/area/criar-conta': { padrao: '/area/criar-conta', nome: 'Criar conta', area: 'area' },
  '/area/entrar': { padrao: '/area/entrar', nome: 'Entrar', area: 'area' },
  '/area/meus-dados': { padrao: '/area/meus-dados', nome: 'Meus dados', area: 'area' },
  '/area/privacidade': { padrao: '/area/privacidade', nome: 'Privacidade', area: 'area' },
  '/area/recuperar-senha': { padrao: '/area/recuperar-senha', nome: 'Recuperar senha', area: 'area' },
  '/area/redefinir-senha': { padrao: '/area/redefinir-senha', nome: 'Redefinir senha', area: 'area' },
  '/busca': { padrao: '/busca', nome: 'Busca', area: 'busca' },
  '/calendario': { padrao: '/calendario', nome: 'Calendário', area: 'competicoes' },
  '/centros': { padrao: '/centros', nome: 'Centros de Treinamento', area: 'centros' },
  '/contato': { padrao: '/contato', nome: 'Contato', area: 'contato' },
  '/convocacoes': { padrao: '/convocacoes', nome: 'Convocações', area: 'competicoes' },
  '/documentos': { padrao: '/documentos', nome: 'Documentos', area: 'institucional' },
  '/eventos': { padrao: '/eventos', nome: 'Eventos', area: 'competicoes' },
  '/federacao': { padrao: '/federacao', nome: 'A Federação', area: 'institucional' },
  '/filiacao': { padrao: '/filiacao', nome: 'Filiação', area: 'filiacao' },
  '/noticias': { padrao: '/noticias', nome: 'Notícias', area: 'conteudo' },
  '/recordes': { padrao: '/recordes', nome: 'Recordes', area: 'competicoes' },
  '/resultados': { padrao: '/resultados', nome: 'Resultados', area: 'competicoes' },
  '/transparencia': { padrao: '/transparencia', nome: 'Transparência', area: 'institucional' },
}

/** Uma captura por segmento dinâmico, na ordem do disco. */
const DINAMICAS: { re: RegExp; rota: Rota }[] = [
  {
    re: /^\/area\/inscricoes\/([^/]+)$/,
    rota: { padrao: '/area/inscricoes/[protocolo]', nome: 'Inscrição', area: 'area' },
  },
  {
    re: /^\/calendario\/([^/]+)$/,
    rota: { padrao: '/calendario/[slug]', nome: 'Competição', area: 'competicoes' },
  },
  {
    re: /^\/centros\/([^/]+)$/,
    rota: { padrao: '/centros/[slug]', nome: 'Centro de Treinamento', area: 'centros' },
  },
  {
    re: /^\/institucional\/([^/]+)$/,
    rota: { padrao: '/institucional/[slug]', nome: 'Página institucional', area: 'institucional' },
  },
  {
    re: /^\/noticias\/([^/]+)$/,
    rota: { padrao: '/noticias/[slug]', nome: 'Notícia', area: 'conteudo' },
  },
  {
    re: /^\/resultados\/([^/]+)$/,
    rota: { padrao: '/resultados/[slug]', nome: 'Resultado de competição', area: 'competicoes' },
  },
]

const ADMIN: { re: RegExp; rota: Rota } = {
  re: /^\/admin(\/.*)?$/,
  rota: { padrao: '/admin/*', nome: 'Painel', area: 'admin' },
}

export type RotaIdentificada = Rota & {
  /** `exata` | `dinamica` | `admin` | `nao_mapeada` — diz se a tabela cobre o caso. */
  tipo: 'exata' | 'dinamica' | 'admin' | 'nao_mapeada'
  /** Parâmetro capturado do segmento dinâmico, quando houver. */
  parametro?: string
}

export function identificarRota(caminho: string): RotaIdentificada {
  const limpo = caminho.length > 1 ? caminho.replace(/\/+$/, '') || '/' : caminho

  const exata = EXATAS[limpo]
  if (exata) return { ...exata, tipo: 'exata' }

  for (const { re, rota } of DINAMICAS) {
    const m = re.exec(limpo)
    if (m) return { ...rota, tipo: 'dinamica', parametro: decodificar(m[1]) }
  }

  if (ADMIN.re.test(limpo)) return { ...ADMIN.rota, tipo: 'admin' }

  return {
    padrao: limpo,
    nome: 'Rota fora da tabela',
    area: 'nao_mapeado',
    tipo: 'nao_mapeada',
  }
}

/** Lista completa das telas known — usado por teste e por revisão de cobertura. */
export const ROTAS_KNOWN: Rota[] = [
  ...Object.values(EXATAS),
  ...DINAMICAS.map((d) => d.rota),
  ADMIN.rota,
]

function decodificar(v?: string): string | undefined {
  if (!v) return undefined
  try {
    return decodeURIComponent(v)
  } catch {
    return v
  }
}
