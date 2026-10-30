import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PageHero } from '@/components/ui'
import { exigirAtleta } from '@/lib/atleta/guarda'
import { labelOf, STATUS_INSCRICAO } from '@/lib/constants'
import { decifrar, ehCifrado } from '@/lib/crypto/campos'
import { mascararCpf } from '@/lib/cpf'
import { dataCurta, dataLonga } from '@/lib/format'
import { getPayloadClient } from '@/lib/payload'
import { cancelarInscricao } from './actions'

export const metadata: Metadata = { title: 'Inscrição', robots: { index: false } }
export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ protocolo: string }>
  searchParams: Promise<{ cancelada?: string; erro?: string }>
}

type Snapshot = {
  campo: string
  cifrado?: boolean
  exibicao?: null | string
  rotulo: string
  sensivel?: boolean
  tipo: string
  valor: boolean | number | string | string[]
}

const TOM: Record<string, string> = {
  recebida: 'status--blue',
  'em-analise': 'status--blue',
  aprovada: 'status--green',
  'lista-espera': 'status--gray',
  rejeitada: 'status--red',
  cancelada: 'status--muted',
}

const exibir = (s: Snapshot): string => {
  if (s.exibicao) return s.exibicao
  if (typeof s.valor === 'boolean') return s.valor ? 'Sim' : 'Não'
  if (Array.isArray(s.valor)) return s.valor.join(', ')
  if (s.tipo === 'data' && typeof s.valor === 'string') return dataLonga(s.valor)
  return String(s.valor ?? '—')
}

export default async function InscricaoPage({ params, searchParams }: Props) {
  const { protocolo } = await params
  const sp = await searchParams
  const atleta = await exigirAtleta(`/area/inscricoes/${protocolo}`)

  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'inscricoes',
    where: {
      and: [{ protocolo: { equals: protocolo } }, { atleta: { equals: atleta.id } }],
    },
    limit: 1,
    depth: 2,
    overrideAccess: true,
  })

  const inscricao = docs[0]
  if (!inscricao) notFound()

  const evento = typeof inscricao.evento === 'object' ? inscricao.evento : null
  const respostas = (Array.isArray(inscricao.respostas) ? inscricao.respostas : [])
    .map((r) => {
      const item = r as Snapshot
      // O titular vê o próprio dado: aqui o valor cifrado é decifrado.
      if (item.cifrado && typeof item.valor === 'string' && ehCifrado(item.valor)) {
        try {
          return { ...item, cifrado: false, valor: JSON.parse(decifrar(item.valor)) as Snapshot['valor'] }
        } catch {
          return item
        }
      }
      return item
    }) as Snapshot[]
  const podeCancelar = ['recebida', 'em-analise'].includes(inscricao.status)
  const responsavel = (inscricao.responsavel ?? {}) as {
    nome?: null | string
    parentesco?: null | string
    telefone?: null | string
    cpf?: null | string
  }
  const cpfResponsavel = responsavel.cpf
    ? mascararCpf(ehCifrado(responsavel.cpf) ? decifrar(responsavel.cpf) : responsavel.cpf)
    : null

  return (
    <>
      <PageHero
        titulo={`Inscrição ${inscricao.protocolo}`}
        intro={evento?.nome ?? 'Evento'}
        crumbs={[
          { href: '/area', label: 'Área do atleta' },
          { label: inscricao.protocolo ?? 'Inscrição' },
        ]}
      >
        <div className="comp-card__tags">
          <span className={`status ${TOM[inscricao.status] ?? 'status--blue'}`}>
            {labelOf(STATUS_INSCRICAO, inscricao.status)}
          </span>
          <span className="tag tag--cinza">Enviada em {dataCurta(inscricao.enviadaEm)}</span>
        </div>
      </PageHero>

      <div className="container section" style={{ display: 'grid', gap: 28, maxWidth: 820 }}>
        {sp.cancelada ? (
          <div className="alerta alerta--ok" role="status">
            Inscrição cancelada.
          </div>
        ) : null}
        {sp.erro === 'status' ? (
          <div className="alerta alerta--erro" role="alert">
            Esta inscrição não pode mais ser cancelada por aqui. Fale com a federação.
          </div>
        ) : null}
        {inscricao.status === 'rejeitada' && inscricao.motivoRejeicao ? (
          <div className="alerta alerta--erro" role="alert">
            <strong>Motivo:</strong> {inscricao.motivoRejeicao}
          </div>
        ) : null}

        <section aria-labelledby="respostas">
          <h2 id="respostas" style={{ fontSize: 20 }}>
            O que você respondeu
          </h2>
          <div className="card card--pad" style={{ marginTop: 12 }}>
            <ul className="info-list">
              {respostas.map((r) => (
                <li key={r.campo}>
                  <div>
                    <small>{r.rotulo}</small>
                    {exibir(r)}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {inscricao.menorDeIdade && responsavel.nome ? (
          <section aria-labelledby="responsavel">
            <h2 id="responsavel" style={{ fontSize: 20 }}>
              Responsável
            </h2>
            <div className="card card--pad" style={{ marginTop: 12 }}>
              <ul className="info-list">
                <li>
                  <div>
                    <small>Nome</small>
                    {responsavel.nome}
                  </div>
                </li>
                <li>
                  <div>
                    <small>Parentesco</small>
                    {responsavel.parentesco ?? '—'}
                  </div>
                </li>
                <li>
                  <div>
                    <small>Telefone</small>
                    {responsavel.telefone ?? '—'}
                  </div>
                </li>
                <li>
                  <div>
                    <small>CPF</small>
                    {cpfResponsavel ?? '—'}
                  </div>
                </li>
              </ul>
            </div>
          </section>
        ) : null}

        <section aria-labelledby="consentimentos">
          <h2 id="consentimentos" style={{ fontSize: 20 }}>
            Consentimentos
          </h2>
          <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
            {(inscricao.consentimentos ?? []).map((c) => (
              <div key={c.id ?? c.identificador} className="consentimento">
                <p style={{ margin: 0, fontSize: 14 }}>{c.texto ?? '—'}</p>
                <p className="muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
                  Versão {c.versao} ·{' '}
                  {c.aceito ? `aceito em ${dataCurta(c.aceitoEm)}` : 'não aceito'}
                </p>
              </div>
            ))}
          </div>
        </section>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/area" className="btn btn--contorno">
            Voltar
          </Link>
          {podeCancelar ? (
            <form action={cancelarInscricao}>
              <input type="hidden" name="protocolo" value={inscricao.protocolo ?? ''} />
              <button type="submit" className="btn btn--vermelho">
                Cancelar inscrição
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </>
  )
}
