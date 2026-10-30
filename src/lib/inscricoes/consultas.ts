import 'server-only'
import type { Competicao, FormularioInscricao, Inscricao } from '@/payload-types'
import { getPayloadClient } from '@/lib/payload'

export async function eventoPorSlug(slug: string): Promise<Competicao | null> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'competicoes',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 1,
  })
  return docs[0] ?? null
}

export async function eventoPorId(id: number | string): Promise<Competicao | null> {
  const payload = await getPayloadClient()
  return (await payload.findByID({
    collection: 'competicoes',
    id,
    depth: 1,
  })) as Competicao
}

/** O formulário publicado mais recente do evento (o rascunho nunca vai ao ar). */
export async function formularioPublicado(
  eventoId: number | string,
): Promise<FormularioInscricao | null> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'formularios-inscricao',
    where: {
      and: [{ evento: { equals: eventoId } }, { _status: { equals: 'published' } }],
    },
    sort: '-versao',
    limit: 1,
    depth: 1,
  })
  return docs[0] ?? null
}

/** Quantas inscrições válidas o evento já tem (usado no limite de vagas). */
export async function inscritosNoEvento(eventoId: number | string): Promise<number> {
  const payload = await getPayloadClient()
  const { totalDocs } = await payload.count({
    collection: 'inscricoes',
    where: {
      and: [
        { evento: { equals: eventoId } },
        { status: { not_in: ['cancelada', 'rejeitada'] } },
      ],
    },
  })
  return totalDocs
}

export async function inscricaoDoAtleta(
  eventoId: number | string,
  atletaId: number | string,
): Promise<Inscricao | null> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'inscricoes',
    where: {
      and: [{ evento: { equals: eventoId } }, { atleta: { equals: atletaId } }],
    },
    sort: '-enviadaEm',
    limit: 1,
    depth: 1,
  })
  return docs[0] ?? null
}

export async function inscricoesDoAtleta(atletaId: number | string): Promise<Inscricao[]> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'inscricoes',
    where: { atleta: { equals: atletaId } },
    sort: '-enviadaEm',
    limit: 100,
    depth: 2,
  })
  return docs
}
