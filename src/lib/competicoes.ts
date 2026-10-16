import 'server-only'
import type { Competicao, Convocacao, Resultado } from '@/payload-types'
import { getPayloadClient } from './payload'
import { GRUPO_POR_TIPO, type TipoCompeticao } from './constants'
import { anoDe, statusCompeticao } from './format'

export const GRUPOS_FILTRO = [
  { id: 'todos', label: 'Todos' },
  { id: 'estadual', label: 'Estaduais' },
  { id: 'nacional', label: 'Nacionais e regionais' },
  { id: 'eventos', label: 'Eventos e cursos' },
] as const

export const tiposDoGrupo = (grupo?: string): TipoCompeticao[] | undefined => {
  if (!grupo || grupo === 'todos') return undefined
  return (Object.keys(GRUPO_POR_TIPO) as TipoCompeticao[]).filter(
    (t) => GRUPO_POR_TIPO[t] === grupo,
  )
}

export async function temporadas() {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'competicoes',
    limit: 2000,
    depth: 0,
    select: { dataInicio: true },
  })
  const anos = new Set(res.docs.map((c) => anoDe(c.dataInicio)).filter((a): a is number => !!a))
  anos.add(new Date().getFullYear())
  return [...anos].sort((a, b) => b - a)
}

/** Convocações e resultados ligados a cada competição (para os botões de ação). */
export async function relacionados(ids: (number | string)[]) {
  if (ids.length === 0)
    return { convocacoes: new Map<string, Convocacao>(), resultados: new Map<string, Resultado>() }
  const payload = await getPayloadClient()
  const [conv, res] = await Promise.all([
    payload.find({
      collection: 'convocacoes',
      where: { competicao: { in: ids } },
      limit: 500,
      depth: 0,
      sort: '-dataPublicacao',
    }),
    payload.find({
      collection: 'resultados',
      where: { competicao: { in: ids } },
      limit: 500,
      depth: 0,
      select: { slug: true, competicao: true, titulo: true },
    }),
  ])
  const convocacoes = new Map<string, Convocacao>()
  conv.docs.forEach((c) => {
    const k = String(typeof c.competicao === 'object' ? c.competicao?.id : c.competicao)
    if (!convocacoes.has(k)) convocacoes.set(k, c)
  })
  const resultados = new Map<string, Resultado>()
  res.docs.forEach((r) =>
    resultados.set(
      String(typeof r.competicao === 'object' ? r.competicao?.id : r.competicao),
      r as Resultado,
    ),
  )
  return { convocacoes, resultados }
}

/** Ação principal do cartão: resultado > inscrição > convocação > detalhes. */
export function acaoPrincipal(c: Competicao, rel: Awaited<ReturnType<typeof relacionados>>) {
  const status = statusCompeticao(c)
  const resultado = rel.resultados.get(String(c.id))
  if (resultado?.slug) return { href: `/resultados/${resultado.slug}`, label: 'Ver resultados' }
  if (status.label === 'Inscrições abertas' && c.linkInscricao)
    return {
      href: c.linkInscricao,
      label: c.tipo === 'curso' || c.tipo === 'evento' ? 'Inscrever-se' : 'Inscrever atleta',
    }
  if (rel.convocacoes.has(String(c.id))) return { href: '/convocacoes', label: 'Ver convocação' }
  return { href: `/calendario/${c.slug}`, label: 'Detalhes' }
}
