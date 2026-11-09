import type { Payload } from 'payload'
import type { Atleta, Competicao, Inscricao } from '@/payload-types'
import { labelOf, STATUS_INSCRICAO } from '@/lib/constants'
import { emailConfirmacaoInscricao } from '@/lib/email-templates'
import { dataHora, dataLonga, periodo } from '@/lib/format'
import type { RespostaSnapshot } from './validacao'

/** Texto exibido para respostas sensíveis, que nunca saem no e-mail. */
const PROTEGIDO = 'Informação protegida — disponível na área do atleta'

const exibir = (resposta: RespostaSnapshot): string => {
  if (resposta.sensivel) return PROTEGIDO
  if (resposta.exibicao) return resposta.exibicao
  if (typeof resposta.valor === 'boolean') return resposta.valor ? 'Sim' : 'Não'
  if (Array.isArray(resposta.valor)) return resposta.valor.join(', ')
  if (resposta.tipo === 'data' && typeof resposta.valor === 'string') {
    return dataLonga(resposta.valor)
  }
  return String(resposta.valor ?? '—')
}

/**
 * Envia a confirmação da inscrição para o atleta.
 *
 * É best-effort: a inscrição já está gravada e não pode falhar por causa do
 * e-mail (limite diário do Resend, DNS do domínio, indisponibilidade). O erro
 * fica no log do servidor e o atleta continua vendo tudo pela área dele.
 */
export async function enviarConfirmacaoInscricao(args: {
  atleta: Pick<Atleta, 'email' | 'nome'>
  evento: Pick<Competicao, 'cidade' | 'dataFim' | 'dataInicio' | 'local' | 'nome' | 'uf'>
  inscricao: Pick<Inscricao, 'enviadaEm' | 'protocolo' | 'status'>
  payload: Payload
  respostas: RespostaSnapshot[]
}): Promise<boolean> {
  const { atleta, evento, inscricao, payload, respostas } = args
  const local = [evento.local, evento.cidade, evento.uf]
    .filter((parte): parte is string => Boolean(parte))
    .join(' · ')

  try {
    await payload.sendEmail({
      to: atleta.email,
      subject: `Inscrição confirmada — ${evento.nome}`,
      html: emailConfirmacaoInscricao({
        detalhes: respostas.map((resposta) => ({
          rotulo: resposta.rotulo,
          valor: exibir(resposta),
        })),
        enviadaEm: dataHora(inscricao.enviadaEm),
        evento: evento.nome,
        local: local || undefined,
        nome: atleta.nome,
        protocolo: inscricao.protocolo,
        quando: periodo(evento.dataInicio, evento.dataFim) || undefined,
        situacao: labelOf(STATUS_INSCRICAO, inscricao.status),
      }),
    })
    return true
  } catch (e) {
    console.error('Falha ao enviar o e-mail de confirmação da inscrição', e)
    return false
  }
}
