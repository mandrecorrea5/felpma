import type { Metadata } from 'next'
import Link from 'next/link'
import type { Where } from 'payload'
import { Icon } from '@/components/Icon'
import { Paginacao, paginaDe } from '@/components/Paginacao'
import { PageHero } from '@/components/ui'
import { TIPOS_CONVOCACAO, labelOf } from '@/lib/constants'
import { dataCurta, isDocumento } from '@/lib/format'
import { getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = {
  title: 'Convocações',
  description:
    'Listas oficiais de atletas, técnicos e árbitros convocados para representar o Maranhão.',
}

const BADGE: Record<string, string> = {
  atletas: 'tag',
  arbitros: 'tag tag--vermelho',
  tecnicos: 'tag tag--preto',
}

type Props = { searchParams: Promise<{ tipo?: string; q?: string; pagina?: string }> }

export default async function ConvocacoesPage({ searchParams }: Props) {
  const { tipo, q, pagina } = await searchParams
  const termo = q?.trim()
  const payload = await getPayloadClient()

  const and: Where[] = []
  if (tipo) and.push({ tipo: { equals: tipo } })
  if (termo)
    and.push({
      or: [
        { titulo: { like: termo } },
        { detalhe: { like: termo } },
        { 'competicao.nome': { like: termo } },
      ],
    })

  const res = await payload.find({
    collection: 'convocacoes',
    where: and.length ? { and } : undefined,
    sort: '-dataPublicacao',
    limit: 20,
    page: paginaDe(pagina),
    depth: 1,
  })

  const tabs = [{ value: '', label: 'Todas' }, ...TIPOS_CONVOCACAO]

  return (
    <>
      <PageHero
        variante="azul"
        titulo="Convocações"
        intro="Listas oficiais de atletas, técnicos e árbitros convocados para representar o Maranhão."
        crumbs={[{ label: 'Convocações' }]}
      />
      <div
        className="container"
        style={{
          paddingTop: 32,
          paddingBottom: 64,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <div className="toolbar">
          <nav className="pills" aria-label="Filtrar convocações">
            {tabs.map((t) => {
              const sp = new URLSearchParams()
              if (t.value) sp.set('tipo', t.value)
              if (termo) sp.set('q', termo)
              return (
                <Link
                  key={t.value}
                  href={`/convocacoes${sp.size ? `?${sp}` : ''}`}
                  className="pill"
                  aria-current={(tipo ?? '') === t.value ? 'true' : undefined}
                >
                  {t.label}
                </Link>
              )
            })}
          </nav>
          <form action="/convocacoes" className="search-box" role="search">
            {tipo ? <input type="hidden" name="tipo" value={tipo} /> : null}
            <label htmlFor="busca" className="sr-only">
              Buscar convocação ou competição
            </label>
            <Icon name="busca" size={18} />
            <input
              id="busca"
              name="q"
              type="search"
              className="input"
              placeholder="Buscar por competição ou título"
              defaultValue={termo}
            />
            <button type="submit" className="btn btn--sm btn--azul">
              Buscar
            </button>
          </form>
        </div>

        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th scope="col" style={{ width: '40%' }}>
                  Convocação
                </th>
                <th scope="col">Tipo</th>
                <th scope="col">Competição</th>
                <th scope="col">Publicada em</th>
                <th scope="col">
                  <span className="sr-only">Documento</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {res.docs.map((r) => {
                const comp = typeof r.competicao === 'object' ? r.competicao : null
                const doc = isDocumento(r.documento) ? r.documento : null
                return (
                  <tr key={r.id}>
                    <td>
                      <span className="tabela__titulo">{r.titulo}</span>
                      <span className="tabela__sub">
                        {[
                          r.detalhe,
                          r.prazoConfirmacao
                            ? `Confirmar até ${dataCurta(r.prazoConfirmacao)}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </td>
                    <td>
                      <span className={BADGE[r.tipo] ?? 'tag'}>
                        {labelOf(TIPOS_CONVOCACAO, r.tipo)}
                      </span>
                    </td>
                    <td style={{ fontSize: 14, color: 'var(--texto-2)' }}>
                      {comp ? <Link href={`/calendario/${comp.slug}`}>{comp.nome}</Link> : '—'}
                    </td>
                    <td style={{ fontSize: 14, color: 'var(--texto-2)', whiteSpace: 'nowrap' }}>
                      {dataCurta(r.dataPublicacao)}
                    </td>
                    <td>
                      {doc?.url ? (
                        <a
                          href={doc.url}
                          className="btn btn--sm btn--contorno"
                          target="_blank"
                          rel="noopener"
                          style={{ whiteSpace: 'nowrap' }}
                        >
                          <Icon name="download" size={16} />
                          Baixar PDF<span className="sr-only">: {r.titulo}</span>
                        </a>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
              {res.docs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{ textAlign: 'center', padding: '40px 22px', color: 'var(--texto-3)' }}
                  >
                    Nenhuma convocação encontrada{termo ? ' para essa busca' : ''}.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <Paginacao
          pagina={res.page ?? 1}
          total={res.totalPages}
          base="/convocacoes"
          params={{ tipo, q: termo }}
        />

        <div className="cta-faixa">
          <div>
            <strong>Foi convocado?</strong>
            <span>
              Confirme sua presença e envie a documentação dentro do prazo indicado no documento
              oficial.
            </span>
          </div>
          <Link href="/contato?assunto=competicoes" className="btn btn--azul">
            Falar com a federação
          </Link>
        </div>
      </div>
    </>
  )
}
