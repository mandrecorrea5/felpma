import Link from 'next/link'
import { CentrosMap } from '@/components/CentrosMap'
import { Icon, type IconName } from '@/components/Icon'
import { Apoio } from '@/components/layout/Footer'
import {
  DateTile,
  DocLink,
  Empty,
  ListrasV,
  Midia,
  SectionHead,
  StatusBadge,
} from '@/components/ui'
import { pontosDosCentros } from '@/lib/centros'
import { CATEGORIAS_NOTICIA, ROTULO_TIPO, TAGS_CENTRO, labelOf } from '@/lib/constants'
import { dataCurta, diasAte, isDocumento, periodo, statusCompeticao } from '@/lib/format'
import { getConfiguracoes, getPayloadClient } from '@/lib/payload'
import {
  cidadesComCentro,
  competicaoDestaque,
  proximasCompeticoes,
  ultimasConvocacoes,
  ultimasNoticias,
} from '@/lib/queries'

const ATALHOS: {
  href: string
  titulo: string
  texto: string
  icon: IconName
  vermelho?: boolean
}[] = [
  {
    href: '/calendario',
    titulo: 'Calendário',
    texto: 'Competições estaduais e nacionais',
    icon: 'calendario',
  },
  {
    href: '/convocacoes',
    titulo: 'Convocações',
    texto: 'Seleção maranhense e listas oficiais',
    icon: 'megafone',
    vermelho: true,
  },
  {
    href: '/filiacao',
    titulo: 'Filiação',
    texto: 'Atletas, técnicos, árbitros e clubes',
    icon: 'carteirinha',
  },
  {
    href: '/centros',
    titulo: 'Centros de Treinamento',
    texto: 'Encontre onde treinar no estado',
    icon: 'local',
    vermelho: true,
  },
  {
    href: '/resultados',
    titulo: 'Resultados',
    texto: 'Súmulas, recordes e resultados oficiais',
    icon: 'trofeu',
  },
  {
    href: '/documentos',
    titulo: 'Documentos',
    texto: 'Estatuto, regulamentos e formulários',
    icon: 'documento',
    vermelho: true,
  },
]

export default async function HomePage() {
  const payload = await getPayloadClient()
  const [
    config,
    { home, competicao },
    noticias,
    calendario,
    convocacoes,
    eventos,
    cidades,
    centros,
    filiacao,
  ] = await Promise.all([
    getConfiguracoes(),
    competicaoDestaque(),
    ultimasNoticias(5),
    proximasCompeticoes({ limit: 4 }),
    ultimasConvocacoes(3),
    proximasCompeticoes({ limit: 3, tipos: ['curso', 'evento'] }),
    cidadesComCentro(),
    payload.find({ collection: 'centros', limit: 200, depth: 0 }),
    payload.findGlobal({ slug: 'filiacao', depth: 0 }),
  ])

  const [principal, ...outras] = noticias
  const dias = competicao ? diasAte(competicao.inscricoesAte ?? competicao.dataInicio) : null
  const foto = home.fotoDestaque ?? competicao?.imagem

  return (
    <>
      {/* Destaque: próxima competição */}
      {competicao ? (
        <section className="hero" aria-labelledby="destaque-titulo">
          <div className="container hero__inner">
            <div className="hero__texto">
              <span className="hero__badge">
                <i aria-hidden="true" />
                Próxima competição · {statusCompeticao(competicao).label}
              </span>
              <h1 id="destaque-titulo">{competicao.nome}</h1>
              {home.textoDestaque || competicao.categorias ? (
                <p className="hero__lead">
                  {home.textoDestaque ?? `Categorias: ${competicao.categorias}.`}
                </p>
              ) : null}
              <div className="meta">
                <span>
                  <Icon name="calendario" size={18} />
                  {periodo(competicao.dataInicio, competicao.dataFim)}
                </span>
                <span>
                  <Icon name="local" size={18} />
                  {[competicao.local, competicao.cidade].filter(Boolean).join(' · ')}
                </span>
              </div>
              <div className="acoes">
                {competicao.linkInscricao ? (
                  <a href={competicao.linkInscricao} className="btn btn--azul">
                    Inscrever atleta
                    <Icon name="seta" size={18} strokeWidth={2.2} />
                  </a>
                ) : (
                  <Link href={`/calendario/${competicao.slug}`} className="btn btn--azul">
                    Ver detalhes
                    <Icon name="seta" size={18} strokeWidth={2.2} />
                  </Link>
                )}
                {isDocumento(competicao.regulamento) ? (
                  <DocLink
                    doc={competicao.regulamento}
                    label="Regulamento (PDF)"
                    className="btn btn--contorno"
                  />
                ) : null}
              </div>
            </div>
            <div className={foto ? 'hero__visual hero__visual--foto' : 'hero__visual'}>
              {foto ? (
                <Midia
                  media={foto}
                  size="hero"
                  priority
                  sizes="(max-width: 720px) 100vw, 45vw"
                  style={{ position: 'absolute', inset: 0 }}
                />
              ) : null}
              <ListrasV />
              {dias !== null && dias >= 0 ? (
                <div className="hero__contagem">
                  <div>
                    <strong>{String(dias).padStart(2, '0')}</strong>
                    <small>{dias === 1 ? 'dia' : 'dias'}</small>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>
                      {competicao.inscricoesAte
                        ? `Inscrições encerram em ${dataCurta(competicao.inscricoesAte)}`
                        : `Começa em ${dataCurta(competicao.dataInicio)}`}
                    </div>
                    {competicao.pesagem ? (
                      <div style={{ fontSize: 13, color: 'var(--texto-3)' }}>
                        Pesagem oficial: {competicao.pesagem}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : (
        <section className="hero">
          <div className="container hero__inner">
            <div className="hero__texto">
              <h1>{config.nomeCompleto}</h1>
              <p className="hero__lead">
                Calendário, convocações, resultados e filiação do levantamento de pesos maranhense.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Acesso rápido */}
      <section
        aria-labelledby="acesso"
        className="container"
        style={{ paddingTop: 56, paddingBottom: 24 }}
      >
        <h2 id="acesso" className="eyebrow">
          O que você procura?
        </h2>
        <div className="tiles">
          {ATALHOS.map((a) => (
            <Link key={a.href} href={a.href} className="tile">
              <span className={a.vermelho ? 'tile__icon tile__icon--vermelho' : 'tile__icon'}>
                <Icon name={a.icon} size={22} />
              </span>
              <span className="tile__titulo">{a.titulo}</span>
              <span className="tile__texto">{a.texto}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Notícias */}
      <section id="noticias" aria-labelledby="t-noticias" className="container section">
        <SectionHead
          titulo="Notícias"
          id="t-noticias"
          link={{ href: '/noticias', label: 'Todas as notícias' }}
        />
        {principal ? (
          <div className="news">
            <Link href={`/noticias/${principal.slug}`} className="news__main">
              <Midia
                media={principal.capa}
                className="news__img"
                sizes="(max-width: 720px) 100vw, 60vw"
              />
              <div className="data-meta">
                <span className="tag tag--solido">
                  {labelOf(CATEGORIAS_NOTICIA, principal.categoria)}
                </span>
                <span>{dataCurta(principal.dataPublicacao)}</span>
              </div>
              <h3>{principal.titulo}</h3>
              <p>{principal.resumo}</p>
            </Link>
            {outras.length ? (
              <div className="news__side">
                {outras.map((n, i) => (
                  <Link key={n.id} href={`/noticias/${n.slug}`} className="news-row">
                    <Midia media={n.capa} size="thumb" className="news-row__img" sizes="120px" />
                    <div className="news-row__txt">
                      <span className={i % 2 === 0 ? 'kicker kicker--vermelho' : 'kicker'}>
                        {labelOf(CATEGORIAS_NOTICIA, n.categoria)}
                      </span>
                      <span className="news-row__titulo">{n.titulo}</span>
                      <span className="data-meta">{dataCurta(n.dataPublicacao)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <Empty>Nenhuma notícia publicada ainda.</Empty>
        )}
      </section>

      {/* Calendário + Convocações */}
      <section className="section--cinza">
        <div
          className="container"
          style={{ paddingTop: 64, paddingBottom: 64, display: 'flex', flexWrap: 'wrap', gap: 32 }}
        >
          <div className="painel" style={{ flex: '1.5 1 520px', minWidth: 0 }}>
            <div className="toolbar" style={{ marginBottom: 12 }}>
              <h2>Calendário de competições</h2>
              <Link href="/calendario" className="link-seta">
                Ver calendário completo
              </Link>
            </div>
            {calendario.length ? (
              calendario.map((c) => (
                <Link key={c.id} href={`/calendario/${c.slug}`} className="cal-row">
                  <DateTile c={c} size="sm" />
                  <div className="cal-row__txt">
                    <span className="cal-row__nome">{c.nome}</span>
                    <span className="muted" style={{ fontSize: 14 }}>
                      {c.cidade} · {ROTULO_TIPO[c.tipo]}
                    </span>
                  </div>
                  <StatusBadge c={c} />
                </Link>
              ))
            ) : (
              <p className="muted" style={{ padding: '16px 0' }}>
                O calendário da temporada será publicado em breve.
              </p>
            )}
          </div>

          <div className="painel painel--azul" style={{ flex: '1 1 340px', minWidth: 0 }}>
            <div className="toolbar" style={{ marginBottom: 10 }}>
              <h2>Convocações</h2>
              <Icon name="megafone" size={28} />
            </div>
            {convocacoes.length ? (
              convocacoes.map((cv) => {
                const href =
                  isDocumento(cv.documento) && cv.documento.url ? cv.documento.url : '/convocacoes'
                return (
                  <a
                    key={cv.id}
                    href={href}
                    className="conv-link"
                    target={href.startsWith('/api') ? '_blank' : undefined}
                    rel="noopener"
                  >
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span className="conv-link__titulo">{cv.titulo}</span>
                      <small>Publicada em {dataCurta(cv.dataPublicacao)}</small>
                    </div>
                    <Icon name="download" label="Baixar PDF" />
                  </a>
                )
              })
            ) : (
              <p style={{ color: 'var(--azul-texto-claro)', padding: '14px 0' }}>
                Nenhuma convocação publicada.
              </p>
            )}
            <Link
              href="/convocacoes"
              className="btn btn--branco"
              style={{ marginTop: 'auto', alignSelf: 'flex-start', fontSize: 14 }}
            >
              Todas as convocações
            </Link>
          </div>
        </div>
      </section>

      {/* Eventos */}
      <section
        id="eventos"
        aria-labelledby="t-eventos"
        className="container"
        style={{ paddingTop: 64, paddingBottom: 48 }}
      >
        <SectionHead
          titulo="Eventos, cursos e capacitações"
          id="t-eventos"
          link={{ href: '/eventos', label: 'Ver todos os eventos' }}
        />
        {eventos.length ? (
          <div className="event-grid">
            {eventos.map((e, i) => (
              <article key={e.id} className="event-card">
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
                  {e.linkInscricao ? (
                    <a href={e.linkInscricao} className="event-card__cta">
                      Inscreva-se
                    </a>
                  ) : (
                    <Link href={`/calendario/${e.slug}`} className="event-card__cta">
                      Saiba mais
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty>Novos cursos e eventos serão divulgados aqui.</Empty>
        )}
      </section>

      {/* Centros de treinamento */}
      <section
        aria-labelledby="t-cts"
        className="container"
        style={{ paddingTop: 24, paddingBottom: 64 }}
      >
        <div className="ct-busca">
          <div className="ct-busca__txt">
            <h2 id="t-cts">Encontre um Centro de Treinamento</h2>
            <p>
              Clubes e CTs filiados à {config.sigla}, com endereço, horários e técnico responsável.
            </p>
            <form action="/centros" className="ct-busca__form">
              <label htmlFor="cidade" className="sr-only">
                Cidade
              </label>
              <select id="cidade" name="cidade" className="select" defaultValue="">
                <option value="">Todas as cidades</option>
                {cidades.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn btn--azul" style={{ height: 50 }}>
                Buscar
              </button>
            </form>
            <div className="pills" style={{ gap: 10 }}>
              {TAGS_CENTRO.slice(0, 5).map((t) => (
                <Link key={t.value} href={`/centros?perfil=${t.value}`} className="chip">
                  {t.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="ct-busca__mapa">
            <CentrosMap pontos={pontosDosCentros(centros.docs)} className="mapa mapa--grande" />
          </div>
        </div>
      </section>

      {/* Filiação */}
      <section className="cta-filiacao">
        <div className="cta-filiacao__faixa" aria-hidden="true">
          <span />
          <span />
        </div>
        <div className="container cta-filiacao__inner">
          <div className="cta-filiacao__txt">
            <h2>
              {home.chamadaFiliacao?.titulo ?? 'Faça parte do levantamento de pesos maranhense'}
            </h2>
            {home.chamadaFiliacao?.texto ? <p>{home.chamadaFiliacao.texto}</p> : null}
          </div>
          <div className="cta-filiacao__grid">
            {(filiacao.perfis ?? []).slice(0, 4).map((p, i) => (
              <Link key={p.id ?? i} href={`/filiacao?perfil=${i}`} className="cta-filiacao__perfil">
                {p.nome}
              </Link>
            ))}
            <Link href="/filiacao" className="btn btn--vermelho">
              Iniciar filiação
            </Link>
          </div>
        </div>
      </section>

      <Apoio config={config} />
    </>
  )
}
