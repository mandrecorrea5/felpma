import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { RichText } from '@/components/RichText'
import { PageHero } from '@/components/ui'
import { dataCurta } from '@/lib/format'
import { getPayloadClient } from '@/lib/payload'

type Props = { params: Promise<{ slug: string }> }

const getPagina = cache(async (slug: string) => {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'paginas',
    where: { and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }] },
    limit: 1,
    depth: 1,
  })
  return res.docs[0] ?? null
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getPagina((await params).slug)
  return p ? { title: p.titulo, description: p.resumo ?? undefined } : {}
}

export default async function PaginaInstitucional({ params }: Props) {
  const p = await getPagina((await params).slug)
  if (!p) notFound()
  return (
    <>
      <PageHero
        titulo={p.titulo}
        intro={p.resumo}
        crumbs={[{ href: '/federacao', label: 'A Federação' }, { label: p.titulo }]}
      />
      <article className="container artigo">
        <RichText data={p.conteudo} />
        <p className="muted" style={{ fontSize: 13 }}>
          Atualizado em {dataCurta(p.updatedAt)}
        </p>
      </article>
    </>
  )
}
