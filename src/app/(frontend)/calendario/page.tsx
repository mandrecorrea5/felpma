import type { Metadata } from 'next'
import Link from 'next/link'
import type { Where } from 'payload'
import { AutoSubmitSelect } from '@/components/AutoSubmitSelect'
import { CompeticaoCard } from '@/components/CompeticaoCard'
import { Empty, PageHero } from '@/components/ui'
import {
  GRUPOS_FILTRO,
  acaoPrincipal,
  relacionados,
  temporadas,
  tiposDoGrupo,
} from '@/lib/competicoes'
import { hojeISO } from '@/lib/format'
import { getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = {
  title: 'Calendário de competições',
  description:
    'Competições estaduais, nacionais e eventos da temporada de levantamento de pesos no Maranhão.',
}

type Props = { searchParams: Promise<{ tipo?: string; ano?: string }> }

export default async function CalendarioPage({ searchParams }: Props) {
  const { tipo = 'todos', ano: anoParam } = await searchParams
  const payload = await getPayloadClient()
  const anos = await temporadas()
  // Sem ano escolhido, mostra as próximas competições (inclusive as da virada do ano).
  const ano = Number(anoParam) || null
  const hoje = hojeISO().toISOString()

  const where: Where = ano
    ? {
        and: [
          { dataInicio: { greater_than_equal: `${ano}-01-01T00:00:00-03:00` } },
          { dataInicio: { less_than: `${ano + 1}-01-01T00:00:00-03:00` } },
        ],
      }
    : {
        and: [
          {
            or: [
              { dataFim: { greater_than_equal: hoje } },
              { dataInicio: { greater_than_equal: hoje } },
            ],
          },
        ],
      }
  const tipos = tiposDoGrupo(tipo)
  if (tipos) (where.and as Where[]).push({ tipo: { in: tipos } })

  const [res, docs] = await Promise.all([
    payload.find({ collection: 'competicoes', where, sort: 'dataInicio', limit: 200, depth: 1 }),
    payload.find({
      collection: 'documentos',
      where: { categoria: { in: ['calendario', 'regulamento', 'formulario'] } },
      sort: '-dataPublicacao',
      limit: 4,
      depth: 0,
    }),
  ])
  const rel = await relacionados(res.docs.map((c) => c.id))
  const qtd = res.docs.length

  return (
    <>
      <PageHero
        titulo="Calendário de competições"
        intro="Competições estaduais, nacionais e eventos da temporada. Filtre por tipo e acesse regulamentos, inscrições e resultados em um só lugar."
        crumbs={[{ label: 'Calendário' }]}
      />
      <div className="container layout-2col">
        <div className="layout-2col__main">
          <div className="toolbar">
            <nav className="pills" aria-label="Filtrar por tipo">
              {GRUPOS_FILTRO.map((g) => (
                <Link
                  key={g.id}
                  href={`/calendario?${new URLSearchParams({ ...(g.id !== 'todos' ? { tipo: g.id } : {}), ...(ano ? { ano: String(ano) } : {}) })}`}
                  className="pill"
                  aria-current={tipo === g.id ? 'true' : undefined}
                >
                  {g.label}
                </Link>
              ))}
            </nav>
            <form className="select-label" action="/calendario">
              {tipo !== 'todos' ? <input type="hidden" name="tipo" value={tipo} /> : null}
              <label htmlFor="ano">Temporada</label>
              <AutoSubmitSelect
                id="ano"
                name="ano"
                feature="competicoes"
                className="select"
                defaultValue={ano ? String(ano) : ''}
                style={{ height: 44 }}
              >
                <option value="">Próximas</option>
                {anos.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </AutoSubmitSelect>
              <noscript>
                <button type="submit" className="btn btn--sm btn--contorno">
                  Aplicar
                </button>
              </noscript>
            </form>
          </div>

          <span className="muted" style={{ fontSize: 14 }} aria-live="polite">
            {qtd} {qtd === 1 ? 'competição encontrada' : 'competições encontradas'}
          </span>

          {qtd ? (
            res.docs.map((c) => <CompeticaoCard key={c.id} c={c} acao={acaoPrincipal(c, rel)} />)
          ) : (
            <Empty>
              {ano
                ? `Nenhuma competição cadastrada para este filtro em ${ano}.`
                : 'Nenhuma competição agendada para este filtro. Veja as temporadas anteriores no seletor.'}
            </Empty>
          )}
        </div>

        <aside className="layout-2col__aside">
          <div className="card card--pad">
            <h2 className="card__titulo">Legenda</h2>
            <span className="legend-item">
              <i />
              Estadual (FELPMA)
            </span>
            <span className="legend-item">
              <i style={{ background: 'var(--preto)' }} />
              Nacional / Regional
            </span>
            <span className="legend-item">
              <i style={{ background: 'var(--vermelho)' }} />
              Eventos e cursos
            </span>
          </div>
          <div className="card card--azul card--pad">
            <h2 className="card__titulo">Receba o calendário</h2>
            <p style={{ fontSize: 14, lineHeight: 1.5 }}>
              Assine o calendário no Google Agenda, Outlook ou iPhone e receba as datas atualizadas
              automaticamente.
            </p>
            <a href="/calendario.ics" className="btn btn--branco" style={{ fontSize: 14 }}>
              Adicionar à agenda
            </a>
          </div>
          {docs.docs.length ? (
            <div className="card card--pad" style={{ gap: 0 }}>
              <h2 className="card__titulo" style={{ marginBottom: 4 }}>
                Documentos da temporada
              </h2>
              <div className="doc-list">
                {docs.docs.map((d) => (
                  <a
                    key={d.id}
                    href={d.url ?? '#'}
                    target="_blank"
                    rel="noopener"
                    style={{ padding: '10px 0', fontWeight: 500, fontSize: 15 }}
                  >
                    {d.titulo}
                  </a>
                ))}
              </div>
              <Link href="/documentos" className="link-seta" style={{ marginTop: 8, fontSize: 14 }}>
                Todos os documentos
              </Link>
            </div>
          ) : null}
        </aside>
      </div>
    </>
  )
}
