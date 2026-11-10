import 'server-only'
import { getPayloadClient } from '@/lib/payload'
import { registrarAcesso } from './auditoria'

/**
 * Expurgo por prazo de retenção (LGPD art. 15/16).
 *
 * Cada inscrição carrega `retencaoAte`, calculado no envio a partir do prazo do
 * formulário. Passada a data, a inscrição e os arquivos privados dela (atestado,
 * comprovante) deixam de ter base legal para ficar: são eliminados.
 *
 * O que NÃO é apagado: a conta do atleta. O prazo é da inscrição — apagar a
 * conta junto tiraria do titular o acesso aos próprios dados de outras
 * inscrições ainda vigentes.
 *
 * Desligar: `EXPURGO_DESATIVADO=1`. Existe porque uma data de retenção
 * configurada errada no formulário apagaria dado bom — o freio é explícito.
 */

const LOTE = 100
const DIAS_ORFAO = 30

const agoraISO = (): string => new Date().toISOString()

const diasAtras = (dias: number): string =>
  new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString()

export type ResultadoExpurgo = { arquivos: number; inscricoes: number }

export async function expurgarInscricoesVencidas(): Promise<ResultadoExpurgo> {
  if (process.env.EXPURGO_DESATIVADO === '1') return { arquivos: 0, inscricoes: 0 }

  const payload = await getPayloadClient()
  let inscricoes = 0
  let arquivos = 0

  // Em lotes: `delete` por id, para o hook de upload remover o binário do disco
  // e não estourar uma transação única com muitos documentos.
  for (;;) {
    const { docs } = await payload.find({
      collection: 'inscricoes',
      where: {
        and: [
          { retencaoAte: { exists: true } },
          { retencaoAte: { less_than_equal: agoraISO() } },
        ],
      },
      limit: LOTE,
      depth: 0,
      sort: 'retencaoAte',
      overrideAccess: true,
    })

    if (docs.length === 0) break

    for (const inscricao of docs) {
      const removidos = await payload.delete({
        collection: 'arquivos-inscricao',
        where: { inscricao: { equals: inscricao.id } },
        overrideAccess: true,
      })
      arquivos += removidos?.docs?.length ?? 0

      await payload.delete({
        collection: 'inscricoes',
        id: inscricao.id,
        overrideAccess: true,
      })
      inscricoes += 1
    }

    if (docs.length < LOTE) break
  }

  // Arquivo órfão: upload gravado e nunca vinculado (falha entre o upload e a
  // criação da inscrição). Tem dado pessoal igual, então não pode ficar para
  // sempre. A janela evita apagar upload em andamento.
  const orfaos = await payload.delete({
    collection: 'arquivos-inscricao',
    where: {
      and: [
        { inscricao: { exists: false } },
        { createdAt: { less_than: diasAtras(DIAS_ORFAO) } },
      ],
    },
    overrideAccess: true,
  })
  arquivos += orfaos?.docs?.length ?? 0

  if (inscricoes > 0 || arquivos > 0) {
    registrarAcesso({
      acao: 'expurgo',
      colecao: 'inscricoes',
      detalhe: { arquivos, inscricoes },
    })
  }

  return { arquivos, inscricoes }
}
