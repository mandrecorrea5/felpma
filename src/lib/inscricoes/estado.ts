import type { Competicao } from '@/payload-types'

/**
 * Regra única de disponibilidade da inscrição.
 *
 * Usada na página do evento, na página do formulário e na server action que
 * grava. O cliente nunca decide: link salvo, cache ou aba aberta não furam a
 * janela definida pelo evento.
 */

export const TZ_INSCRICAO = 'America/Fortaleza'

export type EstadoInscricao =
  | 'aberto'
  | 'cancelado'
  | 'em-breve'
  | 'encerrado'
  | 'esgotado'
  | 'fechado'
  | 'inscrito'
  | 'sem-formulario'

export type ResultadoEstado = {
  detalhe: string
  estado: EstadoInscricao
  podeInscrever: boolean
  rotulo: string
}

export type EventoParaInscricao = Pick<
  Competicao,
  'dataFim' | 'dataInicio' | 'inscricoesAte' | 'status'
> & {
  avisoForaDoPeriodo?: null | string
  inscricoesAbertas?: boolean | null
  inscricoesDe?: null | string
  limiteVagas?: null | number
  linkInscricao?: null | string
}

export type ContextoInscricao = {
  agora?: Date
  inscritos?: number
  /**
   * Quantas inscrições ativas o atleta já tem neste evento.
   *
   * Pode passar de 1: a mesma pessoa se inscreve em mais de uma categoria de
   * idade (Sub-17, Sub-20, Adulto...), desde que a categoria de peso seja a
   * mesma. Quem limita é o `limitePorAtleta` do formulário.
   */
  inscricoesDoAtleta?: number
  /** Limite configurado no formulário. Ausente = 1 (uma inscrição por atleta). */
  limitePorAtleta?: number
  temFormulario?: boolean
}

const diaLocal = (iso: string): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ_INSCRICAO }).format(new Date(iso))

const inicioDoDia = (iso: string): Date => new Date(`${diaLocal(iso)}T00:00:00-03:00`)
const fimDoDia = (iso: string): Date => new Date(`${diaLocal(iso)}T23:59:59.999-03:00`)

const dataCurta = (iso: string): string =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    new Date(iso),
  )

export function estadoInscricao(
  evento: EventoParaInscricao,
  contexto: ContextoInscricao = {},
): ResultadoEstado {
  const agora = contexto.agora ?? new Date()
  const aviso = evento.avisoForaDoPeriodo?.trim()

  if (evento.status === 'cancelado') {
    return {
      estado: 'cancelado',
      rotulo: 'Evento cancelado',
      detalhe: aviso || 'A inscrição deste evento foi cancelada.',
      podeInscrever: false,
    }
  }

  if (evento.status === 'adiado') {
    return {
      estado: 'cancelado',
      rotulo: 'Evento adiado',
      detalhe: aviso || 'As inscrições voltam quando a nova data for publicada.',
      podeInscrever: false,
    }
  }

  if (!contexto.temFormulario) {
    return {
      estado: 'sem-formulario',
      rotulo: evento.linkInscricao ? 'Inscrição externa' : 'Inscrição indisponível',
      detalhe: evento.linkInscricao
        ? 'As inscrições deste evento são feitas em outro endereço.'
        : 'Este evento ainda não tem formulário de inscrição.',
      podeInscrever: false,
    }
  }

  if (!evento.inscricoesAbertas) {
    return {
      estado: 'fechado',
      rotulo: 'Inscrições não abertas',
      detalhe: aviso || 'A federação ainda não liberou as inscrições deste evento.',
      podeInscrever: false,
    }
  }

  if (!evento.inscricoesDe || !evento.inscricoesAte) {
    return {
      estado: 'fechado',
      rotulo: 'Inscrições não abertas',
      detalhe: aviso || 'O período de inscrição ainda não foi definido.',
      podeInscrever: false,
    }
  }

  if (agora < inicioDoDia(evento.inscricoesDe)) {
    return {
      estado: 'em-breve',
      rotulo: 'Inscrições em breve',
      detalhe:
        aviso || `As inscrições abrem em ${dataCurta(evento.inscricoesDe)}.`,
      podeInscrever: false,
    }
  }

  if (agora > fimDoDia(evento.inscricoesAte)) {
    return {
      estado: 'encerrado',
      rotulo: 'Inscrições encerradas',
      detalhe:
        aviso || `As inscrições foram encerradas em ${dataCurta(evento.inscricoesAte)}.`,
      podeInscrever: false,
    }
  }

  if (evento.limiteVagas && (contexto.inscritos ?? 0) >= evento.limiteVagas) {
    return {
      estado: 'esgotado',
      rotulo: 'Vagas esgotadas',
      detalhe: aviso || 'Todas as vagas deste evento foram preenchidas.',
      podeInscrever: false,
    }
  }

  // Quantas inscrições ativas o atleta já tem e quantas o formulário permite.
  const feitas = Math.max(0, Math.trunc(contexto.inscricoesDoAtleta ?? 0))
  const limite = Math.max(1, Math.trunc(contexto.limitePorAtleta ?? 1))

  if (feitas >= limite) {
    return {
      estado: 'inscrito',
      rotulo: 'Inscrição já recebida',
      detalhe:
        limite > 1
          ? `Você já usou as ${limite} inscrições deste evento.`
          : 'Você já tem uma inscrição neste evento.',
      podeInscrever: false,
    }
  }

  return {
    estado: 'aberto',
    rotulo: 'Inscrições abertas',
    detalhe:
      feitas > 0
        ? `Você já tem ${feitas === 1 ? 'uma inscrição' : `${feitas} inscrições`} neste evento: ` +
          'pode se inscrever em outra categoria de idade, mantendo a mesma categoria de peso. ' +
          `Encerra em ${dataCurta(evento.inscricoesAte)}.`
        : `Encerra em ${dataCurta(evento.inscricoesAte)}.`,
    podeInscrever: true,
  }
}
