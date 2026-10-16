import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { Icon } from '@/components/Icon'
import { RichText } from '@/components/RichText'
import { DocRow, Midia, PageHero, StatusBadge } from '@/components/ui'
import { ROTULO_TIPO, TIPOS_CONVOCACAO, labelOf } from '@/lib/constants'
import { dataCurta, dataLonga, isDocumento, isMedia, mediaUrl, periodo } from '@/lib/format'
import { getPayloadClient } from '@/lib/payload'

type Props = { params: Promise<{ slug: string }> }

const getCompeticao = cache(async (slug: string) => {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'competicoes',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 1,
  })
  return res.docs[0] ?? null
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await getCompeticao((await params).slug)
  if (!c) return {}
  const img = mediaUrl(c.imagem, 'card')
  return {
    title: c.nome,
    description: `${ROTULO_TIPO[c.tipo]} · ${periodo(c.dataInicio, c.dataFim)} · ${c.cidade}`,
    openGraph: { images: img ? [img] : undefined },
  }
}

export default async function CompeticaoPage({ params }: Props) {
  const c = await getCompeticao((await params).slug)
  if (!c) notFound()

  const payload = await getPayloadClient()
  const [convocacoes, resultados] = await Promise.all([
    payload.find({
      collection: 'convocacoes',
      where: { competicao: { equals: c.id } },
      sort: '-dataPublicacao',
      depth: 1,
      limit: 20,
    }),
    payload.find({
      collection: 'resultados',
      where: { competicao: { equals: c.id } },
      depth: 0,
      limit: 5,
    }),
  ])

  const eventoJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: c.nome,
    startDate: c.dataInicio,
    endDate: c.dataFim ?? c.dataInicio,
    sport: 'Weightlifting',
    eventStatus:
      c.status === 'cancelado'
        ? 'https://schema.org/EventCancelled'
        : 'https://schema.org/EventScheduled',
    location: {
      '@type': 'Place',
      name: c.local ?? c.cidade,
      address: `${c.cidade} - ${c.uf ?? 'MA'}`,
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventoJsonLd) }}
      />
      <PageHero
        titulo={c.nome}
        crumbs={[{ href: '/calendario', label: 'Calendário' }, { label: c.nome }]}
      >
        <div className="comp-card__tags">
          <span className="tag">{c.area || ROTULO_TIPO[c.tipo]}</span>
          {c.categorias ? <span className="tag tag--cinza">{c.categorias}</span> : null}
          <StatusBadge c={c} />
        </div>
      </PageHero>

      <div className="container layout-2col">
        <div className="layout-2col__main" style={{ gap: 28 }}>
          {isMedia(c.imagem) ? (
            <Midia
              media={c.imagem}
              size="hero"
              priority
              className="artigo__capa"
              sizes="(max-width: 900px) 100vw, 800px"
            />
          ) : null}
          {c.descricao ? (
            <RichText data={c.descricao} />
          ) : (
            <p className="muted">Mais informações serão publicadas em breve.</p>
          )}

          {convocacoes.docs.length ? (
            <section aria-labelledby="conv">
              <h2 id="conv" className="eyebrow">
                Convocações
              </h2>
              <div className="doc-list">
                {convocacoes.docs.map((cv) =>
                  isDocumento(cv.documento) ? (
                    <DocRow
                      key={cv.id}
                      doc={{
                        ...cv.documento,
                        titulo: cv.titulo,
                        descricao: [labelOf(TIPOS_CONVOCACAO, cv.tipo), cv.detalhe]
                          .filter(Boolean)
                          .join(' · '),
                        dataPublicacao: cv.dataPublicacao,
                      }}
                    />
                  ) : null,
                )}
              </div>
            </section>
          ) : null}

          {resultados.docs.length ? (
            <section aria-labelledby="res" className="cta-faixa">
              <div>
                <strong id="res">Resultados publicados</strong>
                <span>Confira a classificação completa e a súmula oficial.</span>
              </div>
              {resultados.docs.map((r) => (
                <Link key={r.id} href={`/resultados/${r.slug}`} className="btn btn--azul">
                  {resultados.docs.length > 1 ? r.titulo : 'Ver resultados'}
                </Link>
              ))}
            </section>
          ) : null}
        </div>

        <aside className="layout-2col__aside">
          <div className="card card--pad">
            <ul className="info-list">
              <li>
                <Icon name="calendario" />
                <div>
                  <small>Data</small>
                  {periodo(c.dataInicio, c.dataFim)}
                </div>
              </li>
              <li>
                <Icon name="local" />
                <div>
                  <small>Local</small>
                  {[c.local, `${c.cidade}/${c.uf ?? 'MA'}`].filter(Boolean).join(' · ')}
                </div>
              </li>
              {c.inscricoesAte ? (
                <li>
                  <Icon name="carteirinha" />
                  <div>
                    <small>Inscrições até</small>
                    {dataLonga(c.inscricoesAte)}
                  </div>
                </li>
              ) : null}
              {c.pesagem ? (
                <li>
                  <Icon name="balanca" />
                  <div>
                    <small>Pesagem oficial</small>
                    {c.pesagem}
                  </div>
                </li>
              ) : null}
            </ul>
            {c.linkInscricao ? (
              <a
                href={c.linkInscricao}
                className="btn btn--azul btn--bloco"
                target="_blank"
                rel="noopener"
              >
                {c.tipo === 'curso' || c.tipo === 'evento' ? 'Inscrever-se' : 'Inscrever atleta'}
              </a>
            ) : null}
            {isDocumento(c.regulamento) && c.regulamento.url ? (
              <a
                href={c.regulamento.url}
                className="btn btn--contorno btn--bloco"
                target="_blank"
                rel="noopener"
              >
                <Icon name="download" size={18} />
                Regulamento
              </a>
            ) : null}
          </div>
          <a href="/calendario.ics" className="link-seta" style={{ fontSize: 14 }}>
            <Icon name="calendario" size={16} />
            Adicionar o calendário à sua agenda
          </a>
          <span className="muted" style={{ fontSize: 13 }}>
            Atualizado em {dataCurta(c.updatedAt)}
          </span>
        </aside>
      </div>
    </>
  )
}
