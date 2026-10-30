import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { RichText } from '@/components/RichText'
import { PageHero } from '@/components/ui'
import { atletaAtual } from '@/lib/atleta/sessao'
import { dataLonga, periodo } from '@/lib/format'
import { inscricaoDoAtleta, eventoPorSlug, formularioPublicado, inscritosNoEvento } from '@/lib/inscricoes/consultas'
import { estadoInscricao, type EventoParaInscricao } from '@/lib/inscricoes/estado'

export const metadata: Metadata = {
  title: 'Inscrição',
  robots: { index: false },
}
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ evento: string }> }

export default async function InscricaoEventoPage({ params }: Props) {
  const { evento: slug } = await params
  const evento = await eventoPorSlug(slug)
  if (!evento) notFound()

  const formulario = await formularioPublicado(evento.id)
  const atleta = await atletaAtual()
  const inscritos = await inscritosNoEvento(evento.id)
  const inscricao = atleta ? await inscricaoDoAtleta(evento.id, atleta.id) : null

  const estado = estadoInscricao(evento as EventoParaInscricao, {
    temFormulario: Boolean(formulario),
    inscritos,
    jaInscrito: Boolean(inscricao),
  })

  const retorno = encodeURIComponent(`/inscricoes/${slug}/formulario`)

  return (
    <>
      <PageHero
        titulo={`Inscrição — ${evento.nome}`}
        intro={periodo(evento.dataInicio, evento.dataFim)}
        crumbs={[
          { href: '/calendario', label: 'Calendário' },
          { href: `/calendario/${evento.slug}`, label: evento.nome },
          { label: 'Inscrição' },
        ]}
      >
        <div className="comp-card__tags">
          <span className={`status ${estado.estado === 'aberto' ? 'status--green' : 'status--gray'}`}>
            {estado.rotulo}
          </span>
          {evento.categorias ? <span className="tag tag--cinza">{evento.categorias}</span> : null}
        </div>
      </PageHero>

      <div className="container section" style={{ display: 'grid', gap: 28, maxWidth: 820 }}>
        <div className="card card--pad">
          <p style={{ margin: 0 }}>{estado.detalhe}</p>
          {evento.pesagem ? (
            <p className="muted" style={{ margin: '10px 0 0', fontSize: 14 }}>
              Pesagem oficial: {evento.pesagem}
            </p>
          ) : null}
          {evento.inscricoesAte ? (
            <p className="muted" style={{ margin: '6px 0 0', fontSize: 14 }}>
              Inscrições até {dataLonga(evento.inscricoesAte)}.
            </p>
          ) : null}

          <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {estado.estado === 'aberto' ? (
              atleta ? (
                <Link href={`/inscricoes/${slug}/formulario`} className="btn btn--azul">
                  Preencher inscrição
                </Link>
              ) : (
                <Link href={`/area/entrar?retorno=${retorno}`} className="btn btn--azul">
                  Entrar para se inscrever
                </Link>
              )
            ) : null}

            {estado.estado === 'inscrito' && inscricao ? (
              <Link href={`/area/inscricoes/${inscricao.protocolo}`} className="btn btn--azul">
                Ver minha inscrição
              </Link>
            ) : null}

            {estado.estado === 'sem-formulario' && evento.linkInscricao ? (
              <a
                href={evento.linkInscricao}
                className="btn btn--azul"
                target="_blank"
                rel="noopener"
              >
                Abrir inscrição externa
              </a>
            ) : null}

            <Link href={`/calendario/${evento.slug}`} className="btn btn--contorno">
              Detalhes do evento
            </Link>
          </div>
        </div>

        {formulario?.descricao ? (
          <section aria-labelledby="instrucoes">
            <h2 id="instrucoes" className="eyebrow">
              Antes de começar
            </h2>
            <RichText data={formulario.descricao} />
          </section>
        ) : null}

        <p className="muted" style={{ fontSize: 14 }}>
          Ao se inscrever, você informa dados pessoais. Leia o{' '}
          <Link href="/institucional/politica-de-privacidade">aviso de privacidade</Link> — os
          consentimentos são pedidos um a um, no formulário.
        </p>
      </div>
    </>
  )
}
