import { getPayloadClient } from '@/lib/payload'
import { ROTULO_TIPO } from '@/lib/constants'
import { TZ } from '@/lib/format'

export const dynamic = 'force-dynamic'

const ymd = (iso: string, addDays = 0) => {
  const d = new Date(iso)
  d.setUTCDate(d.getUTCDate() + addDays)
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d).replaceAll('-', '')
}

const esc = (s: string) =>
  s
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/[,;]/g, (m) => `\\${m}`)

/** Feed iCalendar: assinável no Google Agenda, Outlook e Apple Calendário. */
export async function GET() {
  const payload = await getPayloadClient()
  const desde = new Date()
  desde.setFullYear(desde.getFullYear() - 1)
  const res = await payload.find({
    collection: 'competicoes',
    where: { dataInicio: { greater_than_equal: desde.toISOString() } },
    sort: 'dataInicio',
    limit: 500,
    depth: 0,
  })
  const base = process.env.NEXT_PUBLIC_SERVER_URL || ''
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')

  const eventos = res.docs.map((c) =>
    [
      'BEGIN:VEVENT',
      `UID:competicao-${c.id}@felpma`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(c.dataInicio)}`,
      `DTEND;VALUE=DATE:${ymd(c.dataFim ?? c.dataInicio, 1)}`,
      `SUMMARY:${esc(c.nome)}`,
      `LOCATION:${esc([c.local, c.cidade, c.uf].filter(Boolean).join(', '))}`,
      `DESCRIPTION:${esc(`${ROTULO_TIPO[c.tipo]}${c.categorias ? ` · ${c.categorias}` : ''}`)}`,
      c.status === 'cancelado' ? 'STATUS:CANCELLED' : 'STATUS:CONFIRMED',
      base && c.slug ? `URL:${base}/calendario/${c.slug}` : null,
      'END:VEVENT',
    ]
      .filter(Boolean)
      .join('\r\n'),
  )

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FELPMA//Calendario//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:FELPMA — Competições',
    `X-WR-TIMEZONE:${TZ}`,
    ...eventos,
    'END:VCALENDAR',
  ].join('\r\n')

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="felpma-calendario.ics"',
    },
  })
}
