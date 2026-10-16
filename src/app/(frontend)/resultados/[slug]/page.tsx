import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { Icon } from '@/components/Icon'
import { PageHero } from '@/components/ui'
import type { Resultado } from '@/payload-types'
import { CATEGORIAS_IDADE, SEXOS, labelOf } from '@/lib/constants'
import { dataLonga, isDocumento, kg } from '@/lib/format'
import { getPayloadClient } from '@/lib/payload'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ sexo?: string; idade?: string }>
}

const getResultado = cache(async (slug: string) => {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'resultados',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 1,
  })
  return res.docs[0] ?? null
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await getResultado((await params).slug)
  return r ? { title: `Resultados — ${r.titulo}` } : {}
}

type Linha = NonNullable<Resultado['linhas']>[number]

/** Ordena categorias de peso numericamente ("+109 kg" fica depois de "109 kg"). */
const pesoNum = (p: string) => {
  const n = Number.parseFloat(p.replace(/[^\d.,]/g, '').replace(',', '.')) || 0
  return p.trim().startsWith('+') ? n + 0.5 : n
}

export default async function ResultadoPage({ params, searchParams }: Props) {
  const [{ slug }, { sexo, idade }] = await Promise.all([params, searchParams])
  const r = await getResultado(slug)
  if (!r) notFound()

  const comp = typeof r.competicao === 'object' ? r.competicao : null
  const linhas = (r.linhas ?? []).filter(
    (l) => (!sexo || l.sexo === sexo) && (!idade || l.categoriaIdade === idade),
  )
  const idadesPresentes = CATEGORIAS_IDADE.filter((c) =>
    r.linhas?.some((l) => l.categoriaIdade === c.value),
  )

  // Agrupa por sexo + idade + peso, cada grupo ordenado por colocação.
  const grupos = new Map<string, Linha[]>()
  linhas.forEach((l) => {
    const k = `${l.sexo}|${l.categoriaIdade}|${l.categoriaPeso}`
    grupos.set(k, [...(grupos.get(k) ?? []), l])
  })
  const ordemIdade = (v: string) => CATEGORIAS_IDADE.findIndex((c) => c.value === v)
  const chaves = [...grupos.keys()].sort((a, b) => {
    const [sa, ia, pa] = a.split('|')
    const [sb, ib, pb] = b.split('|')
    return sa.localeCompare(sb) || ordemIdade(ia) - ordemIdade(ib) || pesoNum(pa) - pesoNum(pb)
  })

  const filtro = (s?: string, i?: string) => {
    const sp = new URLSearchParams()
    if (s) sp.set('sexo', s)
    if (i) sp.set('idade', i)
    return `/resultados/${slug}${sp.size ? `?${sp}` : ''}`
  }

  return (
    <>
      <PageHero
        titulo={r.titulo}
        crumbs={[{ href: '/resultados', label: 'Resultados' }, { label: r.titulo }]}
      >
        <div className="meta" style={{ fontSize: 15 }}>
          <span>
            <Icon name="calendario" size={18} />
            {dataLonga(r.data)}
          </span>
          {r.cidade || comp?.cidade ? (
            <span>
              <Icon name="local" size={18} />
              {r.cidade ?? comp?.cidade}
            </span>
          ) : null}
          {comp ? <Link href={`/calendario/${comp.slug}`}>Página da competição</Link> : null}
        </div>
      </PageHero>

      <div
        className="container"
        style={{
          paddingTop: 32,
          paddingBottom: 64,
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        <div className="toolbar">
          {r.linhas?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <nav className="pills" aria-label="Filtrar por sexo">
                <Link
                  href={filtro(undefined, idade)}
                  className="pill"
                  aria-current={!sexo ? 'true' : undefined}
                >
                  Todos
                </Link>
                {SEXOS.map((s) => (
                  <Link
                    key={s.value}
                    href={filtro(s.value, idade)}
                    className="pill"
                    aria-current={sexo === s.value ? 'true' : undefined}
                  >
                    {s.label}
                  </Link>
                ))}
              </nav>
              {idadesPresentes.length > 1 ? (
                <nav className="pills" aria-label="Filtrar por categoria de idade">
                  <Link
                    href={filtro(sexo)}
                    className="pill"
                    aria-current={!idade ? 'true' : undefined}
                  >
                    Todas as idades
                  </Link>
                  {idadesPresentes.map((c) => (
                    <Link
                      key={c.value}
                      href={filtro(sexo, c.value)}
                      className="pill"
                      aria-current={idade === c.value ? 'true' : undefined}
                    >
                      {c.label}
                    </Link>
                  ))}
                </nav>
              ) : null}
            </div>
          ) : (
            <span />
          )}
          {isDocumento(r.sumula) && r.sumula.url ? (
            <a href={r.sumula.url} className="btn btn--contorno" target="_blank" rel="noopener">
              <Icon name="download" size={18} />
              Súmula oficial (PDF)
            </a>
          ) : null}
        </div>

        {r.observacoes ? (
          <p style={{ color: 'var(--texto-2)', whiteSpace: 'pre-line' }}>{r.observacoes}</p>
        ) : null}

        {chaves.length ? (
          chaves.map((k) => {
            const [s, i, p] = k.split('|')
            const rows = [...grupos.get(k)!].sort(
              (a, b) => (a.colocacao ?? 99) - (b.colocacao ?? 99),
            )
            return (
              <div key={k} className="tabela-wrap">
                <table className="tabela">
                  <caption>
                    {labelOf(SEXOS, s)} · {labelOf(CATEGORIAS_IDADE, i)} · {p}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Pos.</th>
                      <th scope="col">Atleta</th>
                      <th scope="col">Clube / CT</th>
                      <th scope="col" className="num">
                        Peso corp.
                      </th>
                      <th scope="col" className="num">
                        Arranco
                      </th>
                      <th scope="col" className="num">
                        Arremesso
                      </th>
                      <th scope="col" className="num">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((l) => (
                      <tr key={l.id}>
                        <td>
                          {l.colocacao ? (
                            <span
                              className={`medal ${l.colocacao <= 3 ? `medal--${l.colocacao}` : ''}`}
                            >
                              {l.colocacao}º
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="destaque">{l.atleta}</td>
                        <td>{l.clube ?? '—'}</td>
                        <td className="num">
                          {l.pesoCorporal ? l.pesoCorporal.toLocaleString('pt-BR') : '—'}
                        </td>
                        <td className="num">{kg(l.arranco)}</td>
                        <td className="num">{kg(l.arremesso)}</td>
                        <td className="num destaque">{l.total ? kg(l.total) : 'N/T'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })
        ) : r.linhas?.length ? (
          <div className="empty">Nenhum atleta com esse filtro.</div>
        ) : (
          <div className="empty">A classificação detalhada está na súmula oficial em PDF.</div>
        )}
        {r.linhas?.length ? (
          <p className="muted" style={{ fontSize: 13 }}>
            Marcas em quilos. N/T = sem total (não completou os dois movimentos).
          </p>
        ) : null}
      </div>
    </>
  )
}
