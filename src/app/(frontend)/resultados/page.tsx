import type { Metadata } from 'next'
import Link from 'next/link'
import { Icon } from '@/components/Icon'
import { Paginacao, paginaDe } from '@/components/Paginacao'
import { Empty, PageHero } from '@/components/ui'
import { dataCurta, isDocumento } from '@/lib/format'
import { getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = {
  title: 'Resultados',
  description:
    'Resultados oficiais e súmulas das competições de levantamento de pesos no Maranhão.',
}

type Props = { searchParams: Promise<{ pagina?: string }> }

export default async function ResultadosPage({ searchParams }: Props) {
  const { pagina } = await searchParams
  const payload = await getPayloadClient()
  const [res, recordes] = await Promise.all([
    payload.find({
      collection: 'resultados',
      sort: '-data',
      limit: 20,
      page: paginaDe(pagina),
      depth: 1,
    }),
    payload.count({ collection: 'recordes' }),
  ])

  return (
    <>
      <PageHero
        titulo="Resultados"
        intro="Classificações oficiais, súmulas e marcas das competições organizadas e disputadas pela federação."
        crumbs={[{ label: 'Resultados' }]}
      />
      <div className="container layout-2col">
        <div className="layout-2col__main">
          {res.docs.length ? (
            <div className="tabela-wrap">
              <table className="tabela">
                <thead>
                  <tr>
                    <th scope="col">Competição</th>
                    <th scope="col">Data</th>
                    <th scope="col">Cidade</th>
                    <th scope="col" className="num">
                      Atletas
                    </th>
                    <th scope="col">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {res.docs.map((r) => {
                    const comp = typeof r.competicao === 'object' ? r.competicao : null
                    return (
                      <tr key={r.id}>
                        <td>
                          <Link href={`/resultados/${r.slug}`} className="tabela__titulo">
                            {r.titulo}
                          </Link>
                          {comp ? <span className="tabela__sub">{comp.categorias}</span> : null}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>{dataCurta(r.data)}</td>
                        <td>{r.cidade ?? comp?.cidade ?? '—'}</td>
                        <td className="num">{r.linhas?.length || '—'}</td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', gap: 8 }}>
                            {isDocumento(r.sumula) && r.sumula.url ? (
                              <a
                                href={r.sumula.url}
                                className="btn btn--sm btn--contorno"
                                target="_blank"
                                rel="noopener"
                              >
                                <Icon name="download" size={16} />
                                Súmula
                              </a>
                            ) : null}
                            <Link href={`/resultados/${r.slug}`} className="btn btn--sm btn--azul">
                              Ver<span className="sr-only"> resultados de {r.titulo}</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>Nenhum resultado publicado ainda.</Empty>
          )}
          <Paginacao pagina={res.page ?? 1} total={res.totalPages} base="/resultados" />
        </div>
        <aside className="layout-2col__aside">
          <Link href="/recordes" className="tile" style={{ padding: 24 }}>
            <span className="tile__icon">
              <Icon name="trofeu" size={22} />
            </span>
            <span className="tile__titulo">Recordes estaduais</span>
            <span className="tile__texto">
              {recordes.totalDocs
                ? `${recordes.totalDocs} marcas vigentes por categoria e movimento.`
                : 'Marcas vigentes por categoria e movimento.'}
            </span>
          </Link>
          <Link href="/calendario" className="tile" style={{ padding: 24 }}>
            <span className="tile__icon tile__icon--vermelho">
              <Icon name="calendario" size={22} />
            </span>
            <span className="tile__titulo">Próximas competições</span>
            <span className="tile__texto">
              Veja o calendário da temporada e as inscrições abertas.
            </span>
          </Link>
        </aside>
      </div>
    </>
  )
}
