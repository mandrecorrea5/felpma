import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHero } from '@/components/ui'
import { CATEGORIAS_DOCUMENTO, ROTULO_TIPO, labelOf } from '@/lib/constants'
import { dataCurta } from '@/lib/format'
import { getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = { title: 'Busca', robots: { index: false } }

type Props = { searchParams: Promise<{ q?: string }> }

type Item = { href: string; titulo: string; tipo: string; texto?: string | null; externo?: boolean }

export default async function BuscaPage({ searchParams }: Props) {
  const termo = (await searchParams).q?.trim() ?? ''
  let itens: Item[] = []

  if (termo.length >= 2) {
    const payload = await getPayloadClient()
    const like = { like: termo }
    const [noticias, competicoes, documentos, convocacoes, centros, resultados] = await Promise.all(
      [
        payload.find({
          collection: 'noticias',
          where: {
            and: [
              { _status: { equals: 'published' } },
              { or: [{ titulo: like }, { resumo: like }] },
            ],
          },
          limit: 10,
          depth: 0,
          sort: '-dataPublicacao',
        }),
        payload.find({
          collection: 'competicoes',
          where: { or: [{ nome: like }, { cidade: like }] },
          limit: 10,
          depth: 0,
          sort: '-dataInicio',
        }),
        payload.find({
          collection: 'documentos',
          where: { or: [{ titulo: like }, { descricao: like }] },
          limit: 10,
          depth: 0,
        }),
        payload.find({ collection: 'convocacoes', where: { titulo: like }, limit: 10, depth: 1 }),
        payload.find({
          collection: 'centros',
          where: { or: [{ nome: like }, { cidade: like }] },
          limit: 10,
          depth: 0,
        }),
        payload.find({ collection: 'resultados', where: { titulo: like }, limit: 10, depth: 0 }),
      ],
    )
    itens = [
      ...competicoes.docs.map((c) => ({
        href: `/calendario/${c.slug}`,
        titulo: c.nome,
        tipo: ROTULO_TIPO[c.tipo],
        texto: `${dataCurta(c.dataInicio)} · ${c.cidade}`,
      })),
      ...noticias.docs.map((n) => ({
        href: `/noticias/${n.slug}`,
        titulo: n.titulo,
        tipo: 'Notícia',
        texto: n.resumo,
      })),
      ...resultados.docs.map((r) => ({
        href: `/resultados/${r.slug}`,
        titulo: r.titulo,
        tipo: 'Resultado',
        texto: dataCurta(r.data),
      })),
      ...convocacoes.docs.map((c) => ({
        href:
          typeof c.documento === 'object' && c.documento?.url ? c.documento.url : '/convocacoes',
        titulo: c.titulo,
        tipo: 'Convocação',
        texto: `Publicada em ${dataCurta(c.dataPublicacao)}`,
        externo: true,
      })),
      ...centros.docs.map((c) => ({
        href: `/centros/${c.slug}`,
        titulo: c.nome,
        tipo: 'Centro de Treinamento',
        texto: `${c.endereco} · ${c.cidade}`,
      })),
      ...documentos.docs.map((d) => ({
        href: d.url ?? '/documentos',
        titulo: d.titulo,
        tipo: labelOf(CATEGORIAS_DOCUMENTO, d.categoria),
        texto: d.descricao,
        externo: true,
      })),
    ]
  }

  return (
    <>
      <PageHero titulo="Busca" crumbs={[{ label: 'Busca' }]}>
        <form
          action="/busca"
          role="search"
          style={{ display: 'flex', gap: 10, maxWidth: 640, flexWrap: 'wrap' }}
        >
          <label htmlFor="q" className="sr-only">
            Termo de busca
          </label>
          <input
            id="q"
            name="q"
            type="search"
            className="input"
            defaultValue={termo}
            placeholder="O que você procura?"
            style={{ flex: '1 1 260px' }}
          />
          <button type="submit" className="btn btn--azul">
            Buscar
          </button>
        </form>
      </PageHero>
      <div
        className="container"
        style={{
          paddingTop: 24,
          paddingBottom: 72,
          maxWidth: 880,
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        {termo.length >= 2 ? (
          <>
            <p className="muted" aria-live="polite">
              {itens.length} {itens.length === 1 ? 'resultado' : 'resultados'} para “{termo}”
            </p>
            {itens.map((i) => (
              <div key={i.tipo + i.href + i.titulo} className="resultado-busca">
                <span className="kicker">{i.tipo}</span>
                {i.externo ? (
                  <a href={i.href} target="_blank" rel="noopener">
                    {i.titulo}
                  </a>
                ) : (
                  <Link href={i.href}>{i.titulo}</Link>
                )}
                {i.texto ? <p>{i.texto}</p> : null}
              </div>
            ))}
          </>
        ) : termo ? (
          <p className="muted">Digite pelo menos 2 letras.</p>
        ) : null}
      </div>
    </>
  )
}
