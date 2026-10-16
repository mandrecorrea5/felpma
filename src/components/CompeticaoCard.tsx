import Link from 'next/link'
import type { Competicao } from '@/payload-types'
import { ROTULO_TIPO } from '@/lib/constants'
import { isDocumento } from '@/lib/format'
import { Icon } from './Icon'
import { DateTile, StatusBadge } from './ui'

export function CompeticaoCard({
  c,
  acao,
}: {
  c: Competicao
  acao: { href: string; label: string }
}) {
  const externo = /^https?:/.test(acao.href)
  return (
    <article className="comp-card">
      <DateTile c={c} />
      <div className="comp-card__txt">
        <div className="comp-card__tags">
          <span className="tag">
            {c.tipo === 'curso' || c.tipo === 'evento'
              ? c.area || ROTULO_TIPO[c.tipo]
              : ROTULO_TIPO[c.tipo]}
          </span>
          {c.categorias ? <span className="tag tag--cinza">{c.categorias}</span> : null}
        </div>
        <h2>
          <Link href={`/calendario/${c.slug}`}>{c.nome}</Link>
        </h2>
        <span className="local">
          <Icon name="local" size={16} />
          {[c.local, [c.cidade, c.uf && c.uf !== 'MA' ? c.uf : null].filter(Boolean).join('/')]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </div>
      <div className="comp-card__acoes">
        <StatusBadge c={c} />
        <div>
          {isDocumento(c.regulamento) && c.regulamento.url ? (
            <a
              href={c.regulamento.url}
              className="btn btn--sm btn--contorno"
              target="_blank"
              rel="noopener"
            >
              Regulamento
            </a>
          ) : null}
          {externo ? (
            <a href={acao.href} className="btn btn--sm btn--azul" target="_blank" rel="noopener">
              {acao.label}
            </a>
          ) : (
            <Link href={acao.href} className="btn btn--sm btn--azul">
              {acao.label}
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}
