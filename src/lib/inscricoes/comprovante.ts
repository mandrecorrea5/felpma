import 'server-only'
import type { ArquivoInscricao, Inscricao } from '@/payload-types'
import { getPayloadClient } from '@/lib/payload'
import {
  ehComprovantePagamento,
  eventoCobraInscricao,
  statusTemPendenciaDeComprovante,
} from './comprovante-regra'

export { eventoCobraInscricao }

export type Comprovante = {
  criadoEm: string
  id: number
  mimetype: null | string
  nome: string
  tamanho: number
}

/** Quantos comprovantes o atleta pode enviar por competição. */
export const MAX_COMPROVANTES_POR_EVENTO = 3

const paraResumo = (arquivo: ArquivoInscricao): Comprovante => ({
  criadoEm: arquivo.createdAt,
  id: arquivo.id,
  mimetype: arquivo.mimeType ?? null,
  nome: arquivo.titulo || arquivo.filename || 'Comprovante',
  tamanho: Number(arquivo.filesize ?? 0),
})

/**
 * A que evento o comprovante pertence.
 *
 * O comprovante é do **atleta na competição**, não da inscrição: quem entrou em
 * Sub-17 e Sub-20 paga uma vez e manda um comprovante só, que vale pelas duas.
 * Arquivos antigos (gravados antes do campo `evento`) caem no evento da
 * inscrição vinculada.
 */
const eventoDoArquivo = (arquivo: ArquivoInscricao): null | string => {
  if (arquivo.evento != null) {
    return String(typeof arquivo.evento === 'object' ? arquivo.evento.id : arquivo.evento)
  }

  const inscricao = typeof arquivo.inscricao === 'object' ? arquivo.inscricao : null
  const evento = inscricao?.evento
  if (evento == null) return null
  return String(typeof evento === 'object' ? evento.id : evento)
}

/**
 * A inscrição está pendente de comprovante?
 *
 * A regra é derivada dos arquivos, não de um campo que precisa ser sincronizado:
 * qualquer comprovante do atleta naquele evento quita todas as inscrições dele
 * ali (a lista chega por evento). Cancelada ou rejeitada nunca entra como
 * pendência.
 */
export const estaPendenteDeComprovante = (
  inscricao: Pick<Inscricao, 'status'>,
  comprovantes: Comprovante[] | undefined,
  evento?: { valorInscricao?: null | number } | null,
): boolean => {
  if (!statusTemPendenciaDeComprovante(inscricao.status)) return false
  // Evento gratuito não cobra comprovante de ninguém.
  if (evento !== undefined && !eventoCobraInscricao(evento)) return false
  return !comprovantes || comprovantes.length === 0
}

/** Id do evento de uma inscrição (a relação pode vir expandida ou só o id). */
export const eventoDaInscricao = (inscricao: Pick<Inscricao, 'evento'>): null | string => {
  const evento = inscricao.evento
  if (evento == null) return null
  return String(typeof evento === 'object' ? evento.id : evento)
}

/**
 * Comprovantes do atleta agrupados por **competição** (id do evento → arquivos).
 *
 * É a chave usada na área do atleta e no painel: cada competição é independente,
 * um comprovante nunca vale para outro evento, e o mesmo atleta pode ter mais de
 * um comprovante no mesmo evento (pagamento dividido).
 */
export async function comprovantesDoAtleta(
  atletaId: number | string,
): Promise<Map<string, Comprovante[]>> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'arquivos-inscricao',
    where: { atleta: { equals: atletaId } },
    sort: '-createdAt',
    limit: 500,
    // Precisa do evento da inscrição para os arquivos gravados antes do campo
    // `evento` existir.
    depth: 1,
    overrideAccess: true,
  })

  const porEvento = new Map<string, Comprovante[]>()
  for (const arquivo of docs) {
    if (!ehComprovantePagamento(arquivo)) continue
    const eventoId = eventoDoArquivo(arquivo)
    if (!eventoId) continue
    const lista = porEvento.get(eventoId) ?? []
    lista.push(paraResumo(arquivo))
    porEvento.set(eventoId, lista)
  }
  return porEvento
}

/** Comprovantes do atleta numa competição, do mais novo para o mais antigo. */
export async function comprovantesDoEvento(
  atletaId: number | string,
  eventoId: number | string,
): Promise<Comprovante[]> {
  const mapa = await comprovantesDoAtleta(atletaId)
  return mapa.get(String(eventoId)) ?? []
}

/** Quantos comprovantes o atleta já enviou nesta competição. */
export async function quantosComprovantesNoEvento(
  atletaId: number | string,
  eventoId: number | string,
): Promise<number> {
  const lista = await comprovantesDoEvento(atletaId, eventoId)
  return lista.length
}
