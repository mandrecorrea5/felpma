import type { Metadata } from 'next'
import Link from 'next/link'
import type { Competicao } from '@/payload-types'
import { Empty, Midia, PageHero } from '@/components/ui'
import { ROTULO_TIPO } from '@/lib/constants'
import { hojeISO, periodo } from '@/lib/format'
import { getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = {
  title: 'Eventos, cursos e capacitações',
  description:
    'Cursos de arbitragem, clínicas técnicas, festivais e capacitações promovidos pela federação.',
}

export default async function EventosPage() {
  const payload = await getPayloadClient()
  const hoje = hojeISO().toISOString()
  const [proximos, anteriores] = await Promise.all([
    payload.find({
      collection: 'competicoes',
      where: {
        and: [{ tipo: { in: ['curso', 'evento'] } }, { dataInicio: { greater_than_equal: hoje } }],
      },
      sort: 'dataInicio',
      limit: 50,
      depth: 1,
    }),
    payload.find({
      collection: 'competicoes',
      where: { and: [{ tipo: { in: ['curso', 'evento'] } }, { dataInicio: { less_than: hoje } }] },
      sort: '-dataInicio',
      limit: 6,
      depth: 1,
    }),
  ])

  return (
    <>
      <PageHero
        titulo="Eventos, cursos e capacitações"
        intro="Formação de árbitros e técnicos, clínicas, festivais e ações de base do levantamento de pesos maranhense."
        crumbs={[{ label: 'Eventos' }]}
      />
      <div
        className="container section"
        style={{ display: 'flex', flexDirection: 'column', gap: 48 }}
      >
        <section aria-labelledby="prox">
          <h2 id="prox" className="eyebrow">
            Próximos
          </h2>
          {proximos.docs.length ? (
            <Grade itens={proximos.docs} />
          ) : (
            <Empty>Nenhum evento agendado no momento.</Empty>
          )}
        </section>
        {anteriores.docs.length ? (
          <section aria-labelledby="ant">
            <h2 id="ant" className="eyebrow">
              Realizados
            </h2>
            <Grade itens={anteriores.docs} passado />
          </section>
        ) : null}
      </div>
    </>
  )
}

function Grade({ itens, passado }: { itens: Competicao[]; passado?: boolean }) {
  return (
    <div className="event-grid">
      {itens.map((e, i) => {
        return (
          <article
            key={e.id}
            className="event-card"
            style={passado ? { opacity: 0.85 } : undefined}
          >
            <Midia
              media={e.imagem}
              className="event-card__img"
              sizes="(max-width: 720px) 100vw, 33vw"
            />
            <div className="event-card__body">
              <span className={i % 2 ? 'kicker kicker--vermelho' : 'kicker'}>
                {e.area || ROTULO_TIPO[e.tipo]}
              </span>
              <h3>
                <Link href={`/calendario/${e.slug}`}>{e.nome}</Link>
              </h3>
              <span className="muted" style={{ fontSize: 14 }}>
                {periodo(e.dataInicio, e.dataFim)} · {e.local || e.cidade}
              </span>
              {!passado && e.linkInscricao ? (
                <a
                  href={e.linkInscricao}
                  className="event-card__cta"
                  target="_blank"
                  rel="noopener"
                >
                  Inscreva-se
                </a>
              ) : (
                <Link href={`/calendario/${e.slug}`} className="event-card__cta">
                  {passado ? 'Ver detalhes' : 'Saiba mais'}
                </Link>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}
