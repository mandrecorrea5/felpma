import type { Metadata } from 'next'
import Link from 'next/link'
import type { Where } from 'payload'
import { CentrosMap } from '@/components/CentrosMap'
import { Icon } from '@/components/Icon'
import { Empty, Midia, PageHero } from '@/components/ui'
import { pontosDosCentros } from '@/lib/centros'
import { TAGS_CENTRO, labelOf } from '@/lib/constants'
import { getPayloadClient } from '@/lib/payload'
import { cidadesComCentro } from '@/lib/queries'

export const metadata: Metadata = {
  title: 'Centros de Treinamento',
  description:
    'Clubes e CTs filiados em todo o Maranhão. Encontre o mais perto de você e comece a treinar.',
}

type Props = { searchParams: Promise<{ cidade?: string; perfil?: string }> }

export default async function CentrosPage({ searchParams }: Props) {
  const { cidade, perfil } = await searchParams
  const payload = await getPayloadClient()
  const and: Where[] = []
  if (cidade) and.push({ cidade: { equals: cidade } })
  if (perfil) and.push({ tags: { contains: perfil } })

  const [res, cidades] = await Promise.all([
    payload.find({
      collection: 'centros',
      where: and.length ? { and } : undefined,
      sort: 'nome',
      limit: 200,
      depth: 1,
    }),
    cidadesComCentro(),
  ])
  const qtd = res.docs.length

  const href = (c?: string) => {
    const sp = new URLSearchParams()
    if (c) sp.set('cidade', c)
    if (perfil) sp.set('perfil', perfil)
    return `/centros${sp.size ? `?${sp}` : ''}`
  }

  return (
    <>
      <PageHero
        titulo="Centros de Treinamento"
        intro="Clubes e CTs filiados à federação em todo o Maranhão. Encontre o mais perto de você e comece a treinar."
        crumbs={[{ label: 'Centros de Treinamento' }]}
      />
      <div className="container layout-2col" style={{ gap: 28 }}>
        <div className="layout-2col__main" style={{ flexBasis: 600, gap: 18 }}>
          <nav className="pills" aria-label="Filtrar por cidade">
            <Link href={href()} className="pill" aria-current={!cidade ? 'true' : undefined}>
              Todas
            </Link>
            {cidades.map((c) => (
              <Link
                key={c}
                href={href(c)}
                className="pill"
                aria-current={cidade === c ? 'true' : undefined}
              >
                {c}
              </Link>
            ))}
          </nav>
          {perfil ? (
            <p style={{ fontSize: 14 }}>
              Perfil: <strong>{labelOf(TAGS_CENTRO, perfil)}</strong> ·{' '}
              <Link href={cidade ? `/centros?cidade=${encodeURIComponent(cidade)}` : '/centros'}>
                remover filtro
              </Link>
            </p>
          ) : null}
          <span className="muted" style={{ fontSize: 14 }}>
            {qtd} {qtd === 1 ? 'centro encontrado' : 'centros encontrados'}
          </span>

          {qtd ? (
            <div className="ct-grid">
              {res.docs.map((ct) => {
                const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  ct.latitude && ct.longitude
                    ? `${ct.latitude},${ct.longitude}`
                    : `${ct.endereco}, ${ct.cidade} - MA`,
                )}`
                return (
                  <article key={ct.id} className="ct-card">
                    <Midia
                      media={ct.capa}
                      className="ct-card__img"
                      sizes="(max-width: 720px) 100vw, 33vw"
                    />
                    <div className="ct-card__body">
                      <h2>{ct.nome}</h2>
                      <span className="ct-card__linha">
                        <Icon name="local" size={16} />
                        {ct.endereco} · {ct.cidade}
                      </span>
                      {ct.tecnicoResponsavel ? (
                        <span className="ct-card__linha">
                          Técnico responsável: {ct.tecnicoResponsavel}
                        </span>
                      ) : null}
                      {ct.tags?.length ? (
                        <div className="pills" style={{ gap: 6 }}>
                          {ct.tags.map((t) => (
                            <span key={t} className="tag">
                              {labelOf(TAGS_CENTRO, t)}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <div className="ct-card__acoes">
                        <Link href={`/centros/${ct.slug}`} className="btn btn--sm btn--azul">
                          Ver detalhes<span className="sr-only"> de {ct.nome}</span>
                        </Link>
                        <a
                          href={mapsUrl}
                          className="btn btn--sm btn--contorno"
                          target="_blank"
                          rel="noopener"
                        >
                          Como chegar
                        </a>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <Empty>Nenhum centro encontrado com esse filtro.</Empty>
          )}
        </div>

        <aside className="layout-2col__aside" style={{ flexBasis: 340, gap: 18 }}>
          <CentrosMap pontos={pontosDosCentros(res.docs)} />
          <div className="card card--preto card--pad" style={{ padding: 24, borderRadius: 18 }}>
            <h2 className="card__titulo" style={{ fontSize: 19 }}>
              Tem um CT e quer filiar?
            </h2>
            <p style={{ fontSize: 14, lineHeight: 1.5 }}>
              Clubes filiados aparecem aqui, podem inscrever atletas e sediar competições.
            </p>
            <Link
              href="/filiacao?perfil=clube"
              className="btn btn--vermelho"
              style={{ fontSize: 14 }}
            >
              Filiar meu clube
            </Link>
          </div>
        </aside>
      </div>
    </>
  )
}
