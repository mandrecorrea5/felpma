import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { RichText } from '@/components/RichText'
import { Midia, PageHero } from '@/components/ui'
import { CATEGORIAS_NOTICIA, labelOf } from '@/lib/constants'
import { dataCurta, dataLonga, isMedia, mediaUrl } from '@/lib/format'
import { getPayloadClient } from '@/lib/payload'

type Props = { params: Promise<{ slug: string }> }

const getNoticia = cache(async (slug: string) => {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'noticias',
    where: { and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }] },
    limit: 1,
    depth: 2,
  })
  return res.docs[0] ?? null
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const n = await getNoticia((await params).slug)
  if (!n) return {}
  const img = mediaUrl(n.capa, 'card')
  return {
    title: n.titulo,
    description: n.resumo,
    openGraph: {
      type: 'article',
      title: n.titulo,
      description: n.resumo,
      publishedTime: n.dataPublicacao,
      images: img ? [img] : undefined,
    },
  }
}

export default async function NoticiaPage({ params }: Props) {
  const { slug } = await params
  const n = await getNoticia(slug)
  if (!n) notFound()

  const payload = await getPayloadClient()
  const relacionadas = await payload.find({
    collection: 'noticias',
    where: {
      and: [
        { _status: { equals: 'published' } },
        { id: { not_equals: n.id } },
        { categoria: { equals: n.categoria } },
      ],
    },
    sort: '-dataPublicacao',
    limit: 3,
    depth: 0,
  })

  return (
    <>
      <PageHero
        titulo={n.titulo}
        crumbs={[
          { href: '/noticias', label: 'Notícias' },
          { label: labelOf(CATEGORIAS_NOTICIA, n.categoria) },
        ]}
      >
        <div className="data-meta">
          <Link href={`/noticias?categoria=${n.categoria}`} className="tag tag--solido">
            {labelOf(CATEGORIAS_NOTICIA, n.categoria)}
          </Link>
          <time dateTime={n.dataPublicacao}>{dataLonga(n.dataPublicacao)}</time>
        </div>
      </PageHero>
      <article className="container artigo">
        <p className="artigo__lead">{n.resumo}</p>
        {isMedia(n.capa) ? (
          <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Midia
              media={n.capa}
              size="hero"
              priority
              className="artigo__capa"
              sizes="(max-width: 900px) 100vw, 880px"
            />
            {n.capa.credito ? (
              <figcaption className="muted" style={{ fontSize: 13 }}>
                Foto: {n.capa.credito}
              </figcaption>
            ) : null}
          </figure>
        ) : null}
        <RichText data={n.conteudo} />

        {relacionadas.docs.length ? (
          <aside
            aria-labelledby="rel"
            style={{ borderTop: '1px solid var(--borda)', paddingTop: 28, marginTop: 12 }}
          >
            <h2 id="rel" className="eyebrow">
              Leia também
            </h2>
            <ul className="lista-links">
              {relacionadas.docs.map((r) => (
                <li key={r.id}>
                  <Link href={`/noticias/${r.slug}`}>{r.titulo}</Link>{' '}
                  <span className="muted" style={{ fontSize: 13 }}>
                    · {dataCurta(r.dataPublicacao)}
                  </span>
                </li>
              ))}
            </ul>
          </aside>
        ) : null}
      </article>
    </>
  )
}
