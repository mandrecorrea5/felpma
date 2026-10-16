import type { Competicao, Documento, Media } from '@/payload-types'

export const TZ = 'America/Fortaleza'

const fmt = (opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, ...opts })

export const dataCurta = (iso?: string | null) =>
  iso ? fmt({ day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso)) : ''

export const dataLonga = (iso?: string | null) =>
  iso ? fmt({ day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso)) : ''

export const dia = (iso?: string | null) =>
  iso ? fmt({ day: '2-digit' }).format(new Date(iso)) : '--'

export const mesAbrev = (iso?: string | null) =>
  iso ? fmt({ month: 'short' }).format(new Date(iso)).replace('.', '').toUpperCase() : ''

export const anoDe = (iso?: string | null) =>
  iso ? Number(fmt({ year: 'numeric' }).format(new Date(iso))) : undefined

/** "12 a 14 de março de 2027" ou "12 de março de 2027". */
export const periodo = (inicio?: string | null, fim?: string | null) => {
  if (!inicio) return ''
  if (!fim || dataCurta(inicio) === dataCurta(fim)) return dataLonga(inicio)
  const i = new Date(inicio)
  const f = new Date(fim)
  const mesmoMes =
    fmt({ month: 'numeric', year: 'numeric' }).format(i) ===
    fmt({ month: 'numeric', year: 'numeric' }).format(f)
  return mesmoMes
    ? `${dia(inicio)} a ${dataLonga(fim)}`
    : `${fmt({ day: 'numeric', month: 'long' }).format(i)} a ${dataLonga(fim)}`
}

/** Início do dia de hoje em Fortaleza, como Date. */
export const hojeISO = () => {
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
  return new Date(`${ymd}T00:00:00-03:00`)
}

export const diasAte = (iso?: string | null) => {
  if (!iso) return null
  const alvo = new Date(
    new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(iso)) + 'T00:00:00-03:00',
  )
  return Math.round((alvo.getTime() - hojeISO().getTime()) / 86_400_000)
}

export type StatusInfo = { label: string; tone: 'green' | 'blue' | 'gray' | 'muted' | 'red' }

const STATUS: Record<string, StatusInfo> = {
  'inscricoes-abertas': { label: 'Inscrições abertas', tone: 'green' },
  'convocacao-publicada': { label: 'Convocação publicada', tone: 'blue' },
  'em-breve': { label: 'Em breve', tone: 'gray' },
  'em-andamento': { label: 'Em andamento', tone: 'blue' },
  encerrado: { label: 'Encerrado', tone: 'muted' },
  adiado: { label: 'Adiado', tone: 'red' },
  cancelado: { label: 'Cancelado', tone: 'red' },
}

/** Status exibido: o manual, ou calculado pelas datas quando "auto". */
export const statusCompeticao = (
  c: Pick<Competicao, 'status' | 'dataInicio' | 'dataFim' | 'inscricoesAte'>,
): StatusInfo => {
  if (c.status && c.status !== 'auto') return STATUS[c.status]
  const hoje = hojeISO().getTime()
  const fim = new Date(c.dataFim ?? c.dataInicio).getTime()
  const inicio = new Date(c.dataInicio).getTime()
  if (fim < hoje) return STATUS.encerrado
  if (inicio <= hoje + 86_400_000 && fim >= hoje) return STATUS['em-andamento']
  if (c.inscricoesAte && new Date(c.inscricoesAte).getTime() >= hoje)
    return STATUS['inscricoes-abertas']
  return STATUS['em-breve']
}

export const isMedia = (m: unknown): m is Media => typeof m === 'object' && m !== null && 'url' in m

export const isDocumento = (d: unknown): d is Documento =>
  typeof d === 'object' && d !== null && 'filename' in d

export const mediaUrl = (m: unknown, size?: 'thumb' | 'card' | 'hero') => {
  if (!isMedia(m)) return null
  return (size && m.sizes?.[size]?.url) || m.url || null
}

export const tamanhoArquivo = (bytes?: number | null) => {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}

export const extensao = (d: Documento) => (d.filename?.split('.').pop() ?? 'pdf').toUpperCase()

export const kg = (n?: number | null) => (n ? `${n.toLocaleString('pt-BR')} kg` : '—')

export const whatsappLink = (n?: string | null) =>
  n ? `https://wa.me/55${n.replace(/\D/g, '')}` : null

export const instagramLink = (h?: string | null) =>
  h ? `https://instagram.com/${h.replace(/^@/, '').trim()}` : null
