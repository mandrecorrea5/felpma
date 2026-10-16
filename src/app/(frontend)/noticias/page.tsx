import type { Metadata } from 'next'
import Link from 'next/link'
import type { Where } from 'payload'
import { Paginacao, paginaDe } from '@/components/Paginacao'
import { Empty, Midia, PageHero } from '@/components/ui'
import { CATEGORIAS_NOTICIA, labelOf } from '@/lib/constants'
import { dataCurta } from '@/lib/format'
import { getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = { title: 'Notícias' }

type Props = { searchParams: Promise<{ categoria?: string; pagina?: string }> }

export default async function NoticiasPage({ searchParams }: Props) {
  const { categoria, pagina } = await searchParams
  const payload = await getPayloadClient()
  const where: Where = { _status: { equals: 'published' } }
  if (categoria) where.categoria = { equals: categoria }

  const res = await payload.find({
    collection: 'noticias',
    where,
    sort: '-dataPublicacao',
    limit: 12,
    page: paginaDe(pagina),
    depth: 1,
  })

  return (
    <>
      <PageHero
        titulo="Notícias"
        intro="Competições, seleção maranhense, arbitragem e a vida da federação."
        crumbs={[{ label: 'Notícias' }]}
      />
      <div
        className="container section"
        style={{ display: 'flex', flexDirection: 'column', gap: 28 }}
      >
        <nav className="pills" aria-label="Filtrar por categoria">
          <Link href="/noticias" className="pill" aria-current={!categoria ? 'true' : undefined}>
            Todas
          </Link>
          {CATEGORIAS_NOTICIA.map((c) => (
            <Link
              key={c.value}
              href={`/noticias?categoria=${c.value}`}
              className="pill"
              aria-current={categoria === c.value ? 'true' : undefined}
            >
              {c.label}
            </Link>
          ))}
        </nav>

        {res.docs.length ? (
          <div className="news-grid">
            {res.docs.map((n) => (
              <Link key={n.id} href={`/noticias/${n.slug}`} className="news-card">
                <Midia
                  media={n.capa}
                  className="news-card__img"
                  sizes="(max-width: 720px) 100vw, 33vw"
                />
                <div className="data-meta">
                  <span className="tag">{labelOf(CATEGORIAS_NOTICIA, n.categoria)}</span>
                  <span>{dataCurta(n.dataPublicacao)}</span>
                </div>
                <h2>{n.titulo}</h2>
                <p>{n.resumo}</p>
              </Link>
            ))}
          </div>
        ) : (
          <Empty>Nenhuma notícia nesta categoria ainda.</Empty>
        )}

        <Paginacao
          pagina={res.page ?? 1}
          total={res.totalPages}
          base="/noticias"
          params={{ categoria }}
        />
      </div>
    </>
  )
}
