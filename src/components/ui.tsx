import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import type { Competicao, Documento } from '@/payload-types'
import { GRUPO_POR_TIPO } from '@/lib/constants'
import {
  dia,
  extensao,
  isMedia,
  mediaSrc,
  mesAbrev,
  statusCompeticao,
  tamanhoArquivo,
  dataCurta,
} from '@/lib/format'
import { Icon } from './Icon'

export function Flag() {
  return (
    <div className="flag" aria-hidden="true">
      <div className="flag__azul" />
      <div className="flag__listras">
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}

export function ListrasV({ style }: { style?: React.CSSProperties }) {
  return (
    <div className="listras-v" aria-hidden="true" style={style}>
      <span />
      <span />
      <span />
    </div>
  )
}

export function MiniFlag() {
  return (
    <div className="mini-flag" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  )
}

export function SectionHead({
  titulo,
  id,
  link,
}: {
  titulo: string
  id?: string
  link?: { href: string; label: string }
}) {
  return (
    <div className="section-head">
      <div className="section-head__titulo">
        <MiniFlag />
        <h2 id={id}>{titulo}</h2>
      </div>
      {link ? (
        <Link href={link.href} className="link-seta">
          {link.label}
          <Icon name="seta" size={16} strokeWidth={2.2} />
        </Link>
      ) : null}
    </div>
  )
}

type Crumb = { href?: string; label: string }

export function PageHero({
  titulo,
  intro,
  crumbs,
  variante = 'claro',
  children,
}: {
  titulo: string
  intro?: ReactNode
  crumbs: Crumb[]
  variante?: 'claro' | 'azul'
  children?: ReactNode
}) {
  return (
    <section className={variante === 'azul' ? 'page-hero page-hero--azul' : 'page-hero'}>
      {variante === 'azul' ? <ListrasV /> : null}
      <div className="container page-hero__inner">
        <nav className="breadcrumb" aria-label="Você está em">
          <ol>
            <li>
              <Link href="/">Início</Link>
            </li>
            {crumbs.map((c, i) => (
              <li key={i} aria-current={i === crumbs.length - 1 ? 'page' : undefined}>
                {c.href ? <Link href={c.href}>{c.label}</Link> : c.label}
              </li>
            ))}
          </ol>
        </nav>
        <h1>{titulo}</h1>
        {intro ? <p>{intro}</p> : null}
        {children}
      </div>
    </section>
  )
}

export function DateTile({ c, size }: { c: Pick<Competicao, 'tipo' | 'dataInicio'>; size?: 'sm' }) {
  const grupo = GRUPO_POR_TIPO[c.tipo]
  const cls = [
    'date-tile',
    grupo !== 'estadual' ? `date-tile--${grupo}` : '',
    size === 'sm' ? 'date-tile--sm' : '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <div className={cls}>
      <span className="date-tile__dia">{dia(c.dataInicio)}</span>
      <span className="date-tile__mes">{mesAbrev(c.dataInicio)}</span>
    </div>
  )
}

export function StatusBadge({ c }: { c: Parameters<typeof statusCompeticao>[0] }) {
  const s = statusCompeticao(c)
  return <span className={`status status--${s.tone}`}>{s.label}</span>
}

/** Imagem do CMS ou um placeholder discreto com as cores da bandeira. */
export function Midia({
  media,
  size = 'card',
  alt,
  sizes = '(max-width: 720px) 100vw, 50vw',
  priority,
  className,
  style,
}: {
  media: unknown
  size?: 'thumb' | 'card' | 'hero'
  alt?: string
  sizes?: string
  priority?: boolean
  className?: string
  style?: React.CSSProperties
}) {
  const url = mediaSrc(media, size)
  if (!url || !isMedia(media)) {
    return (
      <div
        className={['img-ph', className].filter(Boolean).join(' ')}
        style={style}
        aria-hidden="true"
      >
        <Icon name="imagem" size={28} strokeWidth={1.6} />
      </div>
    )
  }
  return (
    <div className={className} style={{ position: 'relative', ...style }}>
      <Image
        src={url}
        alt={alt ?? media.alt ?? ''}
        fill
        sizes={sizes}
        priority={priority}
        className="img-cover"
        style={
          media.focalX != null ? { objectPosition: `${media.focalX}% ${media.focalY}%` } : undefined
        }
      />
    </div>
  )
}

export function DocLink({
  doc,
  label,
  className = 'btn btn--sm btn--contorno',
}: {
  doc: unknown
  label?: string
  className?: string
}) {
  if (!doc || typeof doc !== 'object' || !('url' in doc) || !(doc as Documento).url) return null
  const d = doc as Documento
  return (
    <a href={d.url!} className={className} target="_blank" rel="noopener">
      <Icon name="download" size={16} />
      {label ?? d.titulo}
    </a>
  )
}

export function DocRow({ doc }: { doc: Documento }) {
  return (
    <div className="doc">
      <span className="doc__icon" aria-hidden="true">
        {extensao(doc)}
      </span>
      <div className="doc__txt">
        <a href={doc.url ?? '#'} className="doc__titulo" target="_blank" rel="noopener">
          {doc.titulo}
        </a>
        <span className="doc__meta">
          {[
            doc.descricao,
            doc.ano ? `Ano ${doc.ano}` : null,
            dataCurta(doc.dataPublicacao),
            tamanhoArquivo(doc.filesize),
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </div>
      <a href={doc.url ?? '#'} className="btn btn--sm btn--contorno" download>
        <Icon name="download" size={16} />
        Baixar <span className="sr-only">{doc.titulo}</span>
      </a>
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>
}
