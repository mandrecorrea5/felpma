import { dataLonga } from '@/lib/format'
import type { RespostaSnapshot } from './validacao'

/**
 * Como uma resposta aparece no corpo de um e-mail.
 *
 * O e-mail não é lugar para dado sensível: mesmo a confirmação que vai para o
 * próprio titular e a cópia que vai para a federação usam o mesmo marcador.
 * Quem precisa do valor completo lê pela área do atleta / painel, com auditoria.
 */
export const TEXTO_PROTEGIDO = 'Informação protegida — disponível na área do atleta'

export type DetalheRespostaEmail = { rotulo: string; valor: string }

export const exibirResposta = (resposta: RespostaSnapshot): string => {
  if (resposta.sensivel) return TEXTO_PROTEGIDO
  if (resposta.exibicao) return resposta.exibicao
  if (typeof resposta.valor === 'boolean') return resposta.valor ? 'Sim' : 'Não'
  if (Array.isArray(resposta.valor)) return resposta.valor.join(', ')
  if (resposta.tipo === 'data' && typeof resposta.valor === 'string') {
    return dataLonga(resposta.valor)
  }
  return String(resposta.valor ?? '—')
}

export const detalhesDasRespostas = (
  respostas: RespostaSnapshot[],
): DetalheRespostaEmail[] =>
  respostas.map((resposta) => ({
    rotulo: resposta.rotulo,
    valor: exibirResposta(resposta),
  }))
