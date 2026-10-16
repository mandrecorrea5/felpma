import type { Metadata } from 'next'
import Link from 'next/link'
import { Empty, PageHero } from '@/components/ui'
import type { Recorde } from '@/payload-types'
import { CATEGORIAS_IDADE, SEXOS, labelOf } from '@/lib/constants'
import { dataCurta, kg } from '@/lib/format'
import { getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = {
  title: 'Recordes estaduais',
  description:
    'Recordes maranhenses de levantamento de pesos vigentes, por categoria de idade, sexo e peso.',
}

type Props = { searchParams: Promise<{ idade?: string; sexo?: string }> }

const pesoNum = (p: string) => {
  const n = Number.parseFloat(p.replace(/[^\d.,]/g, '').replace(',', '.')) || 0
  return p.trim().startsWith('+') ? n + 0.5 : n
}

export default async function RecordesPage({ searchParams }: Props) {
  const sp = await searchParams
  const payload = await getPayloadClient()
  const todos = await payload.find({ collection: 'recordes', limit: 1000, depth: 0 })

  const idadesPresentes = CATEGORIAS_IDADE.filter((c) =>
    todos.docs.some((r) => r.categoriaIdade === c.value),
  )
  const idade =
    sp.idade ??
    idadesPresentes.find((c) => c.value === 'senior')?.value ??
    idadesPresentes[0]?.value
  const sexo = sp.sexo === 'M' ? 'M' : 'F'

  const lista = todos.docs.filter((r) => r.categoriaIdade === idade && r.sexo === sexo)
  const porPeso = new Map<string, Partial<Record<Recorde['movimento'], Recorde>>>()
  lista.forEach((r) =>
    porPeso.set(r.categoriaPeso, { ...porPeso.get(r.categoriaPeso), [r.movimento]: r }),
  )
  const pesos = [...porPeso.keys()].sort((a, b) => pesoNum(a) - pesoNum(b))

  const href = (i?: string, s?: string) =>
    `/recordes?${new URLSearchParams({ ...(i ? { idade: i } : {}), ...(s ? { sexo: s } : {}) })}`

  return (
    <>
      <PageHero
        titulo="Recordes estaduais"
        intro="Marcas maranhenses vigentes, homologadas pela federação, por categoria de idade, sexo e peso corporal."
        crumbs={[{ href: '/resultados', label: 'Resultados' }, { label: 'Recordes estaduais' }]}
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
        {todos.docs.length ? (
          <>
            <div className="toolbar">
              <nav className="pills" aria-label="Categoria de idade">
                {idadesPresentes.map((c) => (
                  <Link
                    key={c.value}
                    href={href(c.value, sexo)}
                    className="pill"
                    aria-current={idade === c.value ? 'true' : undefined}
                  >
                    {c.label}
                  </Link>
                ))}
              </nav>
              <nav className="pills" aria-label="Sexo">
                {SEXOS.map((s) => (
                  <Link
                    key={s.value}
                    href={href(idade, s.value)}
                    className="pill"
                    aria-current={sexo === s.value ? 'true' : undefined}
                  >
                    {s.label}
                  </Link>
                ))}
              </nav>
            </div>

            {pesos.length ? (
              <div className="tabela-wrap">
                <table className="tabela">
                  <caption>
                    {labelOf(CATEGORIAS_IDADE, idade)} · {labelOf(SEXOS, sexo)}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Categoria</th>
                      <th scope="col">Arranco</th>
                      <th scope="col">Arremesso</th>
                      <th scope="col">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pesos.map((p) => {
                      const m = porPeso.get(p)!
                      return (
                        <tr key={p}>
                          <th
                            scope="row"
                            style={{
                              background: 'transparent',
                              fontSize: 15,
                              color: 'var(--texto)',
                              textTransform: 'none',
                              letterSpacing: 0,
                            }}
                          >
                            {p}
                          </th>
                          {(['arranco', 'arremesso', 'total'] as const).map((mov) => (
                            <td key={mov}>
                              {m[mov] ? (
                                <>
                                  <span
                                    className="destaque"
                                    style={{ fontSize: 17, fontVariantNumeric: 'tabular-nums' }}
                                  >
                                    {kg(m[mov]!.marca)}
                                  </span>
                                  <span className="tabela__sub" style={{ display: 'block' }}>
                                    {m[mov]!.atleta}
                                    {m[mov]!.clube ? ` · ${m[mov]!.clube}` : ''}
                                  </span>
                                  <span className="tabela__sub" style={{ display: 'block' }}>
                                    {[dataCurta(m[mov]!.data), m[mov]!.competicao]
                                      .filter(Boolean)
                                      .join(' · ')}
                                  </span>
                                </>
                              ) : (
                                <span className="muted">—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>Nenhum recorde cadastrado para esta categoria.</Empty>
            )}
          </>
        ) : (
          <Empty>A tabela de recordes estaduais será publicada em breve.</Empty>
        )}
      </div>
    </>
  )
}
