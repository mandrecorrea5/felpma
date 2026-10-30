import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHero } from '@/components/ui'
import { exigirAtleta } from '@/lib/atleta/guarda'
import { labelOf, STATUS_INSCRICAO } from '@/lib/constants'
import { dataCurta } from '@/lib/format'
import { inscricoesDoAtleta } from '@/lib/inscricoes/consultas'
import { sairAction } from './actions'

export const metadata: Metadata = { title: 'Área do atleta' }
export const dynamic = 'force-dynamic'

const TOM: Record<string, string> = {
  recebida: 'status--blue',
  'em-analise': 'status--blue',
  aprovada: 'status--green',
  'lista-espera': 'status--gray',
  rejeitada: 'status--red',
  cancelada: 'status--muted',
}

export default async function AreaPage() {
  const atleta = await exigirAtleta('/area')
  const inscricoes = await inscricoesDoAtleta(atleta.id)

  return (
    <>
      <PageHero
        titulo={`Olá, ${atleta.nome.split(' ')[0]}`}
        intro="Suas inscrições, seus dados e suas escolhas de privacidade."
        crumbs={[{ label: 'Área do atleta' }]}
      >
        <div className="comp-card__tags">
          <span className="tag">{inscricoes.length} inscrição(ões)</span>
          <span className="tag tag--cinza">{atleta.email}</span>
        </div>
      </PageHero>

      <div className="container section" style={{ display: 'grid', gap: 32 }}>
        <section aria-labelledby="minhas-inscricoes">
          <h2 id="minhas-inscricoes" className="eyebrow">
            Minhas inscrições
          </h2>

          {inscricoes.length === 0 ? (
            <div className="empty">
              Você ainda não tem inscrições. Veja o <Link href="/calendario">calendário</Link> de
              eventos.
            </div>
          ) : (
            <div className="card card--pad" style={{ display: 'grid', gap: 16 }}>
              {inscricoes.map((i) => {
                const evento = typeof i.evento === 'object' ? i.evento : null
                return (
                  <div
                    key={i.id}
                    style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}
                  >
                    <div style={{ flex: '1 1 260px' }}>
                      <strong>{evento?.nome ?? 'Evento'}</strong>
                      <div className="muted" style={{ fontSize: 14 }}>
                        Protocolo {i.protocolo} · enviada em {dataCurta(i.enviadaEm)}
                      </div>
                    </div>
                    <span className={`status ${TOM[i.status] ?? 'status--blue'}`}>
                      {labelOf(STATUS_INSCRICAO, i.status)}
                    </span>
                    <Link href={`/area/inscricoes/${i.protocolo}`} className="btn btn--sm btn--contorno">
                      Ver detalhes
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section aria-labelledby="atalhos">
          <h2 id="atalhos" className="eyebrow">
            Conta
          </h2>
          <div className="tiles">
            <Link href="/area/meus-dados" className="tile">
              <span className="tile__titulo">Meus dados</span>
              <span className="muted">Contato e senha</span>
            </Link>
            <Link href="/area/consentimentos" className="tile">
              <span className="tile__titulo">Consentimentos</span>
              <span className="muted">Ver e revogar</span>
            </Link>
            <Link href="/area/privacidade" className="tile">
              <span className="tile__titulo">Privacidade</span>
              <span className="muted">Exportar ou excluir</span>
            </Link>
            <form action={sairAction}>
              <button type="submit" className="btn btn--contorno">
                Sair da conta
              </button>
            </form>
          </div>
        </section>
      </div>
    </>
  )
}
