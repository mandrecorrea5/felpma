import 'server-only'
import type { Where } from 'payload'
import type { Competicao } from '@/payload-types'
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

/**
 * Competições que vão para o topo da home, em ordem de prazo.
 *
 * A escolhida em *Página inicial › Destaque* vem primeiro, depois as marcadas
 * com "Destaque na página inicial" e, se faltar, as próximas competições — todas
 * por data. **Evento encerrado sai da lista sozinho**: o destaque não fica
 * preso na home depois que o prazo acabou (antes, a escolha manual ignorava a
 * data e o card continuava lá para sempre).
 */
export async function competicaoDestaque(limit = 3) {
  const payload = await getPayloadClient()
  const home = await payload.findGlobal({ slug: 'home', depth: 2 })
  const hoje = hojeISO().toISOString()

  // Só concorre quem ainda não terminou (evento sem dataFim usa a dataInicio).
  const vigente = (competicao: { dataFim?: null | string; dataInicio?: null | string }) => {
    const fim = competicao.dataFim ?? competicao.dataInicio
    return typeof fim === 'string' && fim >= hoje
  }

  const lista: Competicao[] = []
  const vistos = new Set<string>()
  const adicionar = (competicao: unknown) => {
    if (!competicao || typeof competicao !== 'object' || !('id' in competicao)) return
    const doc = competicao as Competicao
    if (!vigente(doc)) return
    if (vistos.has(String(doc.id))) return
    vistos.add(String(doc.id))
    lista.push(doc)
  }

  adicionar(home.destaque)

  const marcadas = await payload.find({
    collection: 'competicoes',
    where: {
      and: [
        { destaqueHome: { equals: true } },
        {
          or: [
            { dataFim: { greater_than_equal: hoje } },
            {
              and: [
                { dataFim: { exists: false } },
                { dataInicio: { greater_than_equal: hoje } },
              ],
            },
          ],
        },
      ],
    },
    sort: 'dataInicio',
    limit: 10,
    depth: 1,
  })
  for (const competicao of marcadas.docs) adicionar(competicao)

  if (lista.length < limit) {
    for (const competicao of await proximasCompeticoes({ limit: 12 })) adicionar(competicao)
  }

  return { home, competicao: lista[0] ?? null, lista: lista.slice(0, limit) }
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
