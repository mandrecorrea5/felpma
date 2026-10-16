import type { Metadata } from 'next'
import Link from 'next/link'
import type { Where } from 'payload'
import { DocRow, Empty, PageHero } from '@/components/ui'
import { CATEGORIAS_DOCUMENTO } from '@/lib/constants'
import { getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = {
  title: 'Estatuto e documentos',
  description:
    'Estatuto, regulamentos, editais, formulários e demais documentos oficiais da federação.',
}

type Props = { searchParams: Promise<{ categoria?: string; q?: string }> }

export default async function DocumentosPage({ searchParams }: Props) {
  const { categoria, q } = await searchParams
  const termo = q?.trim()
  const payload = await getPayloadClient()
  const and: Where[] = []
  if (categoria) and.push({ categoria: { equals: categoria } })
  if (termo) and.push({ or: [{ titulo: { like: termo } }, { descricao: { like: termo } }] })

  const res = await payload.find({
    collection: 'documentos',
    where: and.length ? { and } : undefined,
    sort: '-dataPublicacao',
    limit: 500,
    depth: 0,
  })

  const presentes = CATEGORIAS_DOCUMENTO.filter((c) =>
    res.docs.some((d) => d.categoria === c.value),
  )

  return (
    <>
      <PageHero
        titulo="Estatuto e documentos"
        intro="Documentos oficiais da federação: estatuto, regulamentos de competição, editais, notas oficiais e formulários."
        crumbs={[{ href: '/federacao', label: 'A Federação' }, { label: 'Documentos' }]}
      />
      <div
        className="container"
        style={{
          paddingTop: 32,
          paddingBottom: 72,
          display: 'flex',
          flexDirection: 'column',
          gap: 28,
        }}
      >
        <div className="toolbar">
          <nav className="pills" aria-label="Filtrar por categoria">
            <Link
              href="/documentos"
              className="pill"
              aria-current={!categoria ? 'true' : undefined}
            >
              Todos
            </Link>
            {CATEGORIAS_DOCUMENTO.map((c) => (
              <Link
                key={c.value}
                href={`/documentos?categoria=${c.value}`}
                className="pill"
                aria-current={categoria === c.value ? 'true' : undefined}
              >
                {c.label}
              </Link>
            ))}
          </nav>
        </div>
        <form
          action="/documentos"
          className="search-box"
          role="search"
          style={{ flexBasis: 'auto', maxWidth: 520 }}
        >
          {categoria ? <input type="hidden" name="categoria" value={categoria} /> : null}
          <label htmlFor="busca-doc" className="sr-only">
            Buscar documento
          </label>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            id="busca-doc"
            name="q"
            type="search"
            className="input"
            placeholder="Buscar pelo nome do documento"
            defaultValue={termo}
          />
          <button type="submit" className="btn btn--sm btn--azul">
            Buscar
          </button>
        </form>

        {res.docs.length ? (
          presentes.map((c) => (
            <section key={c.value} className="doc-grupo" aria-labelledby={`cat-${c.value}`}>
              <h2 id={`cat-${c.value}`}>{c.label}</h2>
              <div className="doc-list">
                {res.docs
                  .filter((d) => d.categoria === c.value)
                  .map((d) => (
                    <DocRow key={d.id} doc={d} />
                  ))}
              </div>
            </section>
          ))
        ) : (
          <Empty>Nenhum documento encontrado.</Empty>
        )}
      </div>
    </>
  )
}
