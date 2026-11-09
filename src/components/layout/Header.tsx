import Link from 'next/link'
import type { ConfiguracoesSite } from '@/payload-types'
import { mediaUrl } from '@/lib/format'
import { Icon } from '../Icon'
import { Flag } from '../ui'
import { HeaderActions, NavDesktop } from './HeaderClient'
import { NAV_TOPO } from './nav'

export function Brand({ config }: { config: ConfiguracoesSite }) {
  const logo = mediaUrl(config.logo)
  return (
    <Link href="/" className="brand" aria-label={`${config.sigla} — página inicial`}>
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" className="brand__logo" width={64} height={64} />
      ) : (
        <span className="brand__mark" aria-hidden="true">
          {config.sigla.slice(0, 2)}
        </span>
      )}
      <span className="brand__text">
        <span className="brand__sigla">{config.sigla}</span>
        <span className="brand__sub">Levantamento de Pesos · Maranhão</span>
      </span>
    </Link>
  )
}

export function Header({ config }: { config: ConfiguracoesSite }) {
  // A área do filiado é interna desde que as inscrições ganharam login próprio.
  // O campo do painel continua valendo como override (ex.: um SSO futuro).
  const linkAreaFiliado = config.linkAreaFiliado?.trim() || null

  return (
    <>
      <a href="#conteudo" className="skip-link">
        Pular para o conteúdo
      </a>
      <Flag />
      <div className="topbar">
        <div className="container topbar__inner">
          <span>{config.nomeCompleto}</span>
          <div className="topbar__links">
            {NAV_TOPO.map((l) => (
              <Link key={l.href} href={l.href}>
                {l.label}
              </Link>
            ))}
            {linkAreaFiliado ? (
              <a href={linkAreaFiliado} className="topbar__filiado">
                <Icon name="usuario" size={16} />
                Área do filiado
              </a>
            ) : (
              <Link href="/area" className="topbar__filiado">
                <Icon name="usuario" size={16} />
                Área do atleta
              </Link>
            )}
          </div>
        </div>
      </div>
      <header className="header">
        <div className="container header__inner">
          <Brand config={config} />
          <NavDesktop />
          <HeaderActions linkAreaFiliado={linkAreaFiliado} />
        </div>
      </header>
    </>
  )
}
