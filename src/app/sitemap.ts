import type { MetadataRoute } from 'next'
import { getPayloadClient } from '@/lib/payload'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
  const payload = await getPayloadClient()
  const sel = { slug: true, updatedAt: true } as const
  const [noticias, competicoes, centros, resultados, paginas] = await Promise.all([
    payload.find({
      collection: 'noticias',
      where: { _status: { equals: 'published' } },
      limit: 5000,
      depth: 0,
      select: sel,
    }),
    payload.find({ collection: 'competicoes', limit: 5000, depth: 0, select: sel }),
    payload.find({ collection: 'centros', limit: 1000, depth: 0, select: sel }),
    payload.find({ collection: 'resultados', limit: 5000, depth: 0, select: sel }),
    payload.find({
      collection: 'paginas',
      where: { _status: { equals: 'published' } },
      limit: 200,
      depth: 0,
      select: sel,
    }),
  ])

  const fixas = [
    '',
    '/noticias',
    '/calendario',
    '/eventos',
    '/convocacoes',
    '/resultados',
    '/recordes',
    '/centros',
    '/filiacao',
    '/federacao',
    '/documentos',
    '/transparencia',
    '/contato',
  ]
  const map = (prefix: string, docs: { slug?: string | null; updatedAt: string }[]) =>
    docs
      .filter((d) => d.slug)
      .map((d) => ({ url: `${base}${prefix}/${d.slug}`, lastModified: d.updatedAt }))

  return [
    ...fixas.map((p) => ({ url: `${base}${p}` })),
    ...map('/noticias', noticias.docs),
    ...map('/calendario', competicoes.docs),
    ...map('/centros', centros.docs),
    ...map('/resultados', resultados.docs),
    ...map('/institucional', paginas.docs),
  ]
}
