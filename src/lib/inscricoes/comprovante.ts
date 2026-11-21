import 'server-only'
import type { ArquivoInscricao } from '@/payload-types'
import { CAMPO_COMPROVANTE } from '@/lib/constants'
import { getPayloadClient } from '@/lib/payload'

export type Comprovante = {
  criadoEm: string
  id: number
  mimetype: null | string
  nome: string
  tamanho: number
}

const paraResumo = (arquivo: ArquivoInscricao): Comprovante => ({
  criadoEm: arquivo.createdAt,
  id: arquivo.id,
  mimetype: arquivo.mimeType ?? null,
  nome: arquivo.titulo || arquivo.filename || 'Comprovante',
  tamanho: Number(arquivo.filesize ?? 0),
})

const inscricaoDoArquivo = (arquivo: ArquivoInscricao): null | string => {
  const relacao = arquivo.inscricao
  if (relacao == null) return null
  return String(typeof relacao === 'object' ? relacao.id : relacao)
}

/**
 * Comprovantes do atleta agrupados pela inscrição (id da inscrição → arquivos).
 *
 * É a consulta da tela "Comprovantes": o atleta pode ter mais de um comprovante
 * por competição, por isso a lista, e não um único arquivo.
 */
export async function comprovantesDoAtleta(
  atletaId: number | string,
): Promise<Map<string, Comprovante[]>> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'arquivos-inscricao',
    where: {
      and: [{ atleta: { equals: atletaId } }, { campo: { equals: CAMPO_COMPROVANTE } }],
    },
    sort: '-createdAt',
    limit: 500,
    depth: 0,
    overrideAccess: true,
  })

  const porInscricao = new Map<string, Comprovante[]>()
  for (const arquivo of docs) {
    const inscricaoId = inscricaoDoArquivo(arquivo)
    if (!inscricaoId) continue
    const lista = porInscricao.get(inscricaoId) ?? []
    lista.push(paraResumo(arquivo))
    porInscricao.set(inscricaoId, lista)
  }
  return porInscricao
}

/** Comprovantes de uma inscrição específica, do mais novo para o mais antigo. */
export async function comprovantesDaInscricao(
  atletaId: number | string,
  inscricaoId: number | string,
): Promise<Comprovante[]> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'arquivos-inscricao',
    where: {
      and: [
        { atleta: { equals: atletaId } },
        { inscricao: { equals: inscricaoId } },
        { campo: { equals: CAMPO_COMPROVANTE } },
      ],
    },
    sort: '-createdAt',
    limit: 100,
    depth: 0,
    overrideAccess: true,
  })
  return docs.map((arquivo) => paraResumo(arquivo))
}
