import type { Metadata } from 'next'
import Link from 'next/link'
import { Icon } from '@/components/Icon'
import { RichText } from '@/components/RichText'
import { Midia, PageHero, SectionHead } from '@/components/ui'
import type { Diretoria } from '@/payload-types'
import { GRUPOS_DIRETORIA } from '@/lib/constants'
import { isMedia } from '@/lib/format'
import { getConfiguracoes, getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = {
  title: 'A Federação',
  description:
    'Quem somos, história, diretoria e comissões da Federação de Levantamento de Pesos do Maranhão.',
}

const iniciais = (nome: string) =>
  nome
    .replace(/[^\p{L}\s]/gu, ' ')
    .split(/\s+/)
    .filter((p) => p.length > 2)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()

export default async function FederacaoPage() {
  const payload = await getPayloadClient()
  const [config, fed, membros] = await Promise.all([
    getConfiguracoes(),
    payload.findGlobal({ slug: 'federacao', depth: 1 }),
    payload.find({ collection: 'diretoria', sort: 'ordem', limit: 200, depth: 1 }),
  ])

  const grupos = GRUPOS_DIRETORIA.map((g) => ({
    ...g,
    membros: membros.docs.filter((m) => m.grupo === g.value),
  })).filter((g) => g.membros.length)

  return (
    <>
      <PageHero titulo="A Federação" intro={fed.apresentacao} crumbs={[{ label: 'A Federação' }]} />

      <nav className="subnav" aria-label="Nesta página">
        <div className="container">
          <ul>
            <li>
              <a href="#quem-somos">Quem somos</a>
            </li>
            {grupos.length ? (
              <li>
                <a href="#diretoria">Diretoria e comissões</a>
              </li>
            ) : null}
            {fed.filiacoes?.length ? (
              <li>
                <a href="#filiacoes">Filiada a</a>
              </li>
            ) : null}
            <li>
              <Link href="/documentos">Estatuto e documentos</Link>
            </li>
            <li>
              <Link href="/transparencia">Transparência</Link>
            </li>
            <li>
              <Link href="/contato">Contato</Link>
            </li>
          </ul>
        </div>
      </nav>

      <section id="quem-somos" className="container section" style={{ scrollMarginTop: 160 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 40, alignItems: 'flex-start' }}>
          <div
            style={{
              flex: '1.4 1 480px',
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 24,
            }}
          >
            <SectionHead titulo="Quem somos" />
            {fed.historia ? (
              <RichText data={fed.historia} />
            ) : (
              <p className="prose">{config.nomeCompleto}.</p>
            )}
          </div>
          {isMedia(fed.foto) ? (
            <Midia
              media={fed.foto}
              size="card"
              className="artigo__capa"
              style={{ flex: '1 1 340px', aspectRatio: '4 / 3' }}
              sizes="(max-width: 720px) 100vw, 40vw"
            />
          ) : null}
        </div>

        {fed.numeros?.length ? (
          <div className="numeros" style={{ marginTop: 48 }}>
            {fed.numeros.map((n) => (
              <div key={n.id ?? n.rotulo} className="numero">
                <strong>{n.valor}</strong>
                <span>{n.rotulo}</span>
              </div>
            ))}
          </div>
        ) : null}

        {fed.missao || fed.visao || fed.valores ? (
          <div className="mvv" style={{ marginTop: 48 }}>
            {[
              ['Missão', fed.missao],
              ['Visão', fed.visao],
              ['Valores', fed.valores],
            ]
              .filter(([, t]) => t)
              .map(([t, txt]) => (
                <div key={t} className="card card--pad">
                  <h3>{t}</h3>
                  <p>{txt}</p>
                </div>
              ))}
          </div>
        ) : null}
      </section>

      {grupos.length ? (
        <section id="diretoria" className="section--cinza" style={{ scrollMarginTop: 160 }}>
          <div
            className="container section"
            style={{ display: 'flex', flexDirection: 'column', gap: 40 }}
          >
            <SectionHead titulo="Diretoria e comissões" />
            {grupos.map((g) => (
              <div key={g.value} aria-labelledby={`g-${g.value}`}>
                <h3 id={`g-${g.value}`} className="eyebrow">
                  {g.label}
                </h3>
                <div className="pessoas">
                  {g.membros.map((m) => (
                    <Pessoa key={m.id} m={m} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {fed.filiacoes?.length ? (
        <section id="filiacoes" className="container section" style={{ scrollMarginTop: 160 }}>
          <SectionHead titulo="Filiada a" />
          <div className="pills">
            {fed.filiacoes.map((f) =>
              f.url ? (
                <a
                  key={f.id ?? f.nome}
                  href={f.url}
                  className="chip"
                  target="_blank"
                  rel="noopener"
                >
                  {f.nome}
                </a>
              ) : (
                <span key={f.id ?? f.nome} className="chip">
                  {f.nome}
                </span>
              ),
            )}
          </div>
        </section>
      ) : null}

      <section className="container" style={{ paddingBottom: 72, paddingTop: 24 }}>
        <div className="tiles">
          <Link href="/documentos" className="tile">
            <span className="tile__icon">
              <Icon name="documento" size={22} />
            </span>
            <span className="tile__titulo">Estatuto e documentos</span>
            <span className="tile__texto">
              Estatuto, regulamentos, editais e formulários oficiais.
            </span>
          </Link>
          <Link href="/transparencia" className="tile">
            <span className="tile__icon tile__icon--vermelho">
              <Icon name="escudo" size={22} />
            </span>
            <span className="tile__titulo">Transparência</span>
            <span className="tile__texto">Prestação de contas, atas e convênios.</span>
          </Link>
          <Link href="/contato" className="tile">
            <span className="tile__icon">
              <Icon name="email" size={22} />
            </span>
            <span className="tile__titulo">Fale com a federação</span>
            <span className="tile__texto">
              {config.email ?? 'Envie sua mensagem pelo formulário.'}
            </span>
          </Link>
        </div>
      </section>
    </>
  )
}

function Pessoa({ m }: { m: Diretoria }) {
  return (
    <div className="pessoa">
      <div className="pessoa__foto">
        {isMedia(m.foto) ? (
          <Midia
            media={m.foto}
            size="card"
            alt={m.nome}
            style={{ width: '100%', height: '100%' }}
            sizes="220px"
          />
        ) : (
          <div className="pessoa__iniciais" aria-hidden="true">
            {iniciais(m.nome)}
          </div>
        )}
      </div>
      <strong>{m.nome}</strong>
      <span>
        {m.cargo}
        {m.mandato ? ` · ${m.mandato}` : ''}
      </span>
      {m.email ? (
        <a href={`mailto:${m.email}`} style={{ fontSize: 14 }}>
          {m.email}
        </a>
      ) : null}
    </div>
  )
}
