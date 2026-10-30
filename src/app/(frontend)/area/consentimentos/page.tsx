import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHero } from '@/components/ui'
import { exigirAtleta } from '@/lib/atleta/guarda'
import { dataCurta } from '@/lib/format'
import { inscricoesDoAtleta } from '@/lib/inscricoes/consultas'
import { revogarConsentimentoForm } from './actions'

export const metadata: Metadata = { title: 'Consentimentos', robots: { index: false } }
export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ revogado?: string }> }

export default async function ConsentimentosPage({ searchParams }: Props) {
  const atleta = await exigirAtleta('/area/consentimentos')
  const { revogado } = await searchParams
  const inscricoes = await inscricoesDoAtleta(atleta.id)

  return (
    <>
      <PageHero
        titulo="Consentimentos"
        intro="Aqui você vê o que aceitou em cada inscrição e pode revogar o que não é obrigatório."
        crumbs={[{ href: '/area', label: 'Área do atleta' }, { label: 'Consentimentos' }]}
      />
      <div className="container section" style={{ display: 'grid', gap: 24 }}>
        {revogado ? (
          <div className="alerta alerta--ok" role="status">
            Consentimento revogado.
          </div>
        ) : null}

        {inscricoes.length === 0 ? (
          <div className="empty">Você ainda não tem inscrições com consentimentos registrados.</div>
        ) : null}

        {inscricoes.map((i) => {
          const evento = typeof i.evento === 'object' ? i.evento : null
          return (
            <section key={i.id} className="card card--pad" aria-labelledby={`ins-${i.id}`}>
              <h2 id={`ins-${i.id}`} style={{ fontSize: 18 }}>
                {evento?.nome ?? 'Evento'} · {i.protocolo}
              </h2>
              <div style={{ display: 'grid', gap: 14, marginTop: 14 }}>
                {(i.consentimentos ?? []).map((c) => {
                  const revogadoEm = (c as { revogadoEm?: null | string }).revogadoEm
                  return (
                    <div key={c.id ?? c.identificador} className="consentimento">
                      <p style={{ margin: 0, fontSize: 14 }}>{c.texto ?? '(texto não registrado)'}</p>
                      <p className="muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
                        Versão {c.versao} · aceito em {dataCurta(c.aceitoEm)} ·{' '}
                        {c.obrigatorio ? 'obrigatório' : 'opcional'}
                        {revogadoEm ? ` · revogado em ${dataCurta(revogadoEm)}` : ''}
                      </p>
                      {!c.obrigatorio && c.aceito && !revogadoEm ? (
                        <form action={revogarConsentimentoForm} style={{ marginTop: 8 }}>
                          <input type="hidden" name="inscricao" value={i.id} />
                          <input type="hidden" name="identificador" value={c.identificador ?? ''} />
                          <button type="submit" className="btn btn--sm btn--contorno">
                            Revogar este consentimento
                          </button>
                        </form>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}

        <p className="muted" style={{ fontSize: 14 }}>
          O que é obrigatório para a inscrição não pode ser revogado sem cancelar a inscrição.
          Dúvidas: <Link href="/contato">fale com a federação</Link>.
        </p>
      </div>
    </>
  )
}
