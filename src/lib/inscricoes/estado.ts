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
  jaInscrito?: boolean
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

  if (contexto.jaInscrito) {
    return {
      estado: 'inscrito',
      rotulo: 'Inscrição já recebida',
      detalhe: 'Você já tem uma inscrição neste evento.',
      podeInscrever: false,
    }
  }

  return {
    estado: 'aberto',
    rotulo: 'Inscrições abertas',
    detalhe: `Encerra em ${dataCurta(evento.inscricoesAte)}.`,
    podeInscrever: true,
  }
}
