import type { Metadata } from 'next'
import Link from 'next/link'
import { RichText } from '@/components/RichText'
import { DocRow, Empty, PageHero } from '@/components/ui'
import { CATEGORIAS_DOCUMENTO, CATEGORIAS_TRANSPARENCIA } from '@/lib/constants'
import { getConfiguracoes, getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = {
  title: 'Transparência',
  description: 'Prestação de contas, atas, convênios e documentos institucionais da federação.',
}

type Props = { searchParams: Promise<{ ano?: string }> }

export default async function TransparenciaPage({ searchParams }: Props) {
  const { ano } = await searchParams
  const payload = await getPayloadClient()
  const [config, fed, docs] = await Promise.all([
    getConfiguracoes(),
    payload.findGlobal({ slug: 'federacao', depth: 0 }),
    payload.find({
      collection: 'documentos',
      where: { categoria: { in: [...CATEGORIAS_TRANSPARENCIA] } },
      sort: '-dataPublicacao',
      limit: 1000,
      depth: 0,
    }),
  ])

  const anos = [...new Set(docs.docs.map((d) => d.ano).filter((a): a is number => !!a))].sort(
    (a, b) => b - a,
  )
  const filtrados = ano ? docs.docs.filter((d) => String(d.ano) === ano) : docs.docs
  const ouvidoria = fed.emailOuvidoria ?? config.email

  return (
    <>
      <PageHero
        titulo="Transparência"
        intro={fed.transparenciaIntro}
        crumbs={[{ href: '/federacao', label: 'A Federação' }, { label: 'Transparência' }]}
      />
      <div className="container layout-2col">
        <div className="layout-2col__main" style={{ gap: 28 }}>
          {anos.length > 1 ? (
            <nav className="pills" aria-label="Filtrar por ano">
              <Link href="/transparencia" className="pill" aria-current={!ano ? 'true' : undefined}>
                Todos os anos
              </Link>
              {anos.map((a) => (
                <Link
                  key={a}
                  href={`/transparencia?ano=${a}`}
                  className="pill"
                  aria-current={ano === String(a) ? 'true' : undefined}
                >
                  {a}
                </Link>
              ))}
            </nav>
          ) : null}

          {filtrados.length ? (
            CATEGORIAS_TRANSPARENCIA.map((cat) => {
              const lista = filtrados.filter((d) => d.categoria === cat)
              if (!lista.length) return null
              const label = CATEGORIAS_DOCUMENTO.find((c) => c.value === cat)?.label
              return (
                <section
                  key={cat}
                  className="doc-grupo"
                  aria-labelledby={`t-${cat}`}
                  style={{ marginTop: 0 }}
                >
                  <h2 id={`t-${cat}`}>{label}</h2>
                  <div className="doc-list">
                    {lista.map((d) => (
                      <DocRow key={d.id} doc={d} />
                    ))}
                  </div>
                </section>
              )
            })
          ) : (
            <Empty>Os documentos de transparência serão publicados aqui.</Empty>
          )}

          {fed.transparenciaTexto ? <RichText data={fed.transparenciaTexto} /> : null}
        </div>
        <aside className="layout-2col__aside">
          <div className="card card--azul card--pad">
            <h2 className="card__titulo">Solicite uma informação</h2>
            <p style={{ fontSize: 14, lineHeight: 1.5 }}>
              Não encontrou o que procura? Envie sua solicitação à federação.
            </p>
            {ouvidoria ? (
              <a href={`mailto:${ouvidoria}`} className="btn btn--branco" style={{ fontSize: 14 }}>
                {ouvidoria}
              </a>
            ) : (
              <Link href="/contato" className="btn btn--branco" style={{ fontSize: 14 }}>
                Formulário de contato
              </Link>
            )}
          </div>
          <div className="card card--pad">
            <h2 className="card__titulo">Dados da entidade</h2>
            <p style={{ fontSize: 14, color: 'var(--texto-2)', lineHeight: 1.6 }}>
              {config.nomeCompleto}
              {config.cnpj ? (
                <>
                  <br />
                  CNPJ {config.cnpj}
                </>
              ) : null}
              {config.endereco ? (
                <>
                  <br />
                  {config.endereco}, {config.cidade}/MA
                </>
              ) : null}
            </p>
            <Link href="/federacao#diretoria" className="link-seta" style={{ fontSize: 14 }}>
              Diretoria e comissões
            </Link>
          </div>
        </aside>
      </div>
    </>
  )
}
