'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Icon } from '../Icon'
import { NAV_PRINCIPAL, NAV_TOPO, isAtivo } from './nav'

export function NavDesktop() {
  const pathname = usePathname()
  return (
    <nav className="nav nav--desktop" aria-label="Principal">
      {NAV_PRINCIPAL.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isAtivo(pathname, item.href) ? 'page' : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}

/** Botões de busca e menu (celular), com os painéis que eles abrem. */
export function HeaderActions({ linkAreaFiliado }: { linkAreaFiliado?: string | null }) {
  const pathname = usePathname()
  // Guardamos em qual página o painel foi aberto: ao navegar, ele fecha sozinho.
  const [menuEm, setMenuEm] = useState<string | null>(null)
  const [buscaEm, setBuscaEm] = useState<string | null>(null)
  const menu = menuEm === pathname
  const busca = buscaEm === pathname
  const setMenu = (v: boolean) => setMenuEm(v ? pathname : null)
  const setBusca = (fn: (v: boolean) => boolean) => setBuscaEm(fn(busca) ? pathname : null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!menu) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuEm(null)
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [menu])

  useEffect(() => {
    if (busca) searchRef.current?.focus()
  }, [busca])

  return (
    <>
      <div className="header__actions">
        <button
          type="button"
          className="icon-btn"
          aria-label="Buscar no site"
          aria-expanded={busca}
          aria-controls="painel-busca"
          onClick={() => setBusca((v) => !v)}
        >
          <Icon name="busca" />
        </button>
        <Link href="/filiacao" className="btn btn--vermelho btn--filie">
          Filie-se
        </Link>
        <button
          type="button"
          className="icon-btn icon-btn--azul menu-toggle"
          aria-label="Abrir menu"
          aria-expanded={menu}
          aria-controls="menu-mobile"
          onClick={() => setMenu(true)}
        >
          <Icon name="menu" size={22} strokeWidth={2.2} />
        </button>
      </div>

      {busca ? (
        <div
          id="painel-busca"
          className="search-panel"
          style={{ position: 'absolute', left: 0, right: 0, top: '100%' }}
        >
          <form action="/busca" className="container" role="search">
            <label htmlFor="busca-topo" className="sr-only">
              Buscar no site
            </label>
            <input
              ref={searchRef}
              id="busca-topo"
              name="q"
              type="search"
              className="input"
              placeholder="Buscar notícias, competições, documentos…"
              onKeyDown={(e) => e.key === 'Escape' && setBusca(() => false)}
            />
            <button type="submit" className="btn btn--azul">
              Buscar
            </button>
          </form>
        </div>
      ) : null}

      {menu ? (
        <div className="drawer" onClick={(e) => e.target === e.currentTarget && setMenu(false)}>
          <nav id="menu-mobile" className="drawer__panel" aria-label="Menu">
            <div className="drawer__head">
              <span>Menu</span>
              <button
                ref={closeRef}
                type="button"
                className="icon-btn"
                aria-label="Fechar menu"
                onClick={() => setMenu(false)}
              >
                <Icon name="fechar" strokeWidth={2.2} />
              </button>
            </div>
            <Link
              href="/"
              className="drawer__link"
              aria-current={pathname === '/' ? 'page' : undefined}
            >
              Início
            </Link>
            {NAV_PRINCIPAL.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="drawer__link"
                aria-current={isAtivo(pathname, item.href) ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
            {NAV_TOPO.map((item) => (
              <Link key={item.href} href={item.href} className="drawer__link">
                {item.label}
              </Link>
            ))}
            <Link href="/filiacao" className="btn btn--vermelho">
              Filie-se
            </Link>
            {linkAreaFiliado ? (
              <a href={linkAreaFiliado} className="btn btn--contorno" style={{ marginTop: 8 }}>
                Área do filiado
              </a>
            ) : null}
          </nav>
        </div>
      ) : null}
    </>
  )
}
