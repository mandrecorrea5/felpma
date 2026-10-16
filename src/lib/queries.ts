import 'server-only'
import type { Where } from 'payload'
import { getPayloadClient } from './payload'
import { hojeISO } from './format'

/** Próximas competições/eventos (inclui as que estão acontecendo). */
export async function proximasCompeticoes({
  limit = 6,
  tipos,
}: { limit?: number; tipos?: string[] } = {}) {
  const payload = await getPayloadClient()
  const hoje = hojeISO().toISOString()
  const where: Where = {
    or: [
      { dataFim: { greater_than_equal: hoje } },
      { and: [{ dataFim: { exists: false } }, { dataInicio: { greater_than_equal: hoje } }] },
    ],
  }
  const res = await payload.find({
    collection: 'competicoes',
    where: tipos ? { and: [where, { tipo: { in: tipos } }] } : where,
    sort: 'dataInicio',
    limit,
    depth: 1,
  })
  return res.docs
}

/** Competição que vai para o topo da home. */
export async function competicaoDestaque() {
  const payload = await getPayloadClient()
  const home = await payload.findGlobal({ slug: 'home', depth: 2 })
  if (home.destaque && typeof home.destaque === 'object') return { home, competicao: home.destaque }

  const hoje = hojeISO().toISOString()
  const marcada = await payload.find({
    collection: 'competicoes',
    where: {
      and: [{ destaqueHome: { equals: true } }, { dataInicio: { greater_than_equal: hoje } }],
    },
    sort: 'dataInicio',
    limit: 1,
    depth: 1,
  })
  if (marcada.docs[0]) return { home, competicao: marcada.docs[0] }

  const estaduais = await proximasCompeticoes({ limit: 1, tipos: ['estadual'] })
  if (estaduais[0]) return { home, competicao: estaduais[0] }
  const qualquer = await proximasCompeticoes({ limit: 1 })
  return { home, competicao: qualquer[0] ?? null }
}

export async function ultimasNoticias(limit = 5) {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'noticias',
    where: { _status: { equals: 'published' } },
    sort: '-dataPublicacao',
    limit,
    depth: 1,
  })
  // Notícia em destaque vai para a primeira posição.
  const docs = [...res.docs]
  const i = docs.findIndex((n) => n.destaque)
  if (i > 0) docs.unshift(...docs.splice(i, 1))
  return docs
}

export async function ultimasConvocacoes(limit = 3) {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'convocacoes',
    sort: '-dataPublicacao',
    limit,
    depth: 1,
  })
  return res.docs
}

export async function cidadesComCentro() {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'centros',
    limit: 500,
    depth: 0,
    select: { cidade: true },
  })
  return [...new Set(res.docs.map((c) => c.cidade).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  )
}
