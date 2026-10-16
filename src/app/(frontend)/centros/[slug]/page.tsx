import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { CentrosMap } from '@/components/CentrosMap'
import { Icon } from '@/components/Icon'
import { RichText } from '@/components/RichText'
import { Midia, PageHero } from '@/components/ui'
import { pontosDosCentros } from '@/lib/centros'
import { TAGS_CENTRO, labelOf } from '@/lib/constants'
import { instagramLink, isMedia, mediaUrl, whatsappLink } from '@/lib/format'
import { getPayloadClient } from '@/lib/payload'

type Props = { params: Promise<{ slug: string }> }

const getCentro = cache(async (slug: string) => {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'centros',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 1,
  })
  return res.docs[0] ?? null
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ct = await getCentro((await params).slug)
  if (!ct) return {}
  const img = mediaUrl(ct.capa, 'card')
  return {
    title: ct.nome,
    description: `${ct.endereco} · ${ct.cidade}/MA`,
    openGraph: { images: img ? [img] : undefined },
  }
}

export default async function CentroPage({ params }: Props) {
  const ct = await getCentro((await params).slug)
  if (!ct) notFound()

  const wpp = whatsappLink(ct.whatsapp)
  const insta = instagramLink(ct.instagram)
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    ct.latitude && ct.longitude
      ? `${ct.latitude},${ct.longitude}`
      : `${ct.endereco}, ${ct.cidade} - MA`,
  )}`
  const galeria = (ct.galeria ?? []).filter(isMedia)

  return (
    <>
      <PageHero
        titulo={ct.nome}
        crumbs={[{ href: '/centros', label: 'Centros de Treinamento' }, { label: ct.nome }]}
      >
        {ct.tags?.length ? (
          <div className="pills" style={{ gap: 6 }}>
            {ct.tags.map((t) => (
              <span key={t} className="tag">
                {labelOf(TAGS_CENTRO, t)}
              </span>
            ))}
          </div>
        ) : null}
      </PageHero>
      <div className="container layout-2col">
        <div className="layout-2col__main" style={{ gap: 28 }}>
          {isMedia(ct.capa) ? (
            <Midia
              media={ct.capa}
              size="hero"
              priority
              className="artigo__capa"
              sizes="(max-width: 900px) 100vw, 800px"
            />
          ) : null}
          {ct.descricao ? <RichText data={ct.descricao} /> : null}
          {ct.horarios ? (
            <section aria-labelledby="horarios">
              <h2 id="horarios" className="eyebrow">
                Horários de treino
              </h2>
              <p style={{ whiteSpace: 'pre-line', fontSize: 16, lineHeight: 1.7 }}>{ct.horarios}</p>
            </section>
          ) : null}
          {galeria.length ? (
            <section aria-labelledby="fotos">
              <h2 id="fotos" className="eyebrow">
                Fotos
              </h2>
              <div className="galeria">
                {galeria.map((m) => (
                  <Image
                    key={m.id}
                    src={mediaUrl(m, 'card')!}
                    alt={m.alt}
                    width={360}
                    height={270}
                    sizes="(max-width: 720px) 50vw, 240px"
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
        <aside className="layout-2col__aside">
          <div className="card card--pad">
            <ul className="info-list">
              <li>
                <Icon name="local" />
                <div>
                  <small>Endereço</small>
                  {ct.endereco}
                  {ct.bairro ? ` · ${ct.bairro}` : ''}
                  <br />
                  {ct.cidade}/MA{ct.cep ? ` · CEP ${ct.cep}` : ''}
                </div>
              </li>
              {ct.tecnicoResponsavel ? (
                <li>
                  <Icon name="usuario" />
                  <div>
                    <small>Técnico responsável</small>
                    {ct.tecnicoResponsavel}
                    {ct.cref ? ` · CREF ${ct.cref}` : ''}
                  </div>
                </li>
              ) : null}
              {ct.telefone ? (
                <li>
                  <Icon name="telefone" />
                  <div>
                    <small>Telefone</small>
                    <a href={`tel:${ct.telefone.replace(/\D/g, '')}`}>{ct.telefone}</a>
                  </div>
                </li>
              ) : null}
              {insta ? (
                <li>
                  <Icon name="instagram" />
                  <div>
                    <small>Instagram</small>
                    <a href={insta} target="_blank" rel="noopener">
                      {ct.instagram}
                    </a>
                  </div>
                </li>
              ) : null}
            </ul>
            {wpp ? (
              <a href={wpp} className="btn btn--azul btn--bloco" target="_blank" rel="noopener">
                <Icon name="whatsapp" size={18} />
                Chamar no WhatsApp
              </a>
            ) : null}
            <a
              href={mapsUrl}
              className="btn btn--contorno btn--bloco"
              target="_blank"
              rel="noopener"
            >
              Como chegar
            </a>
          </div>
          <CentrosMap pontos={pontosDosCentros([ct])} className="mapa" />
        </aside>
      </div>
    </>
  )
}
