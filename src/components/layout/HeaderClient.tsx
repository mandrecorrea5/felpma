'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '../Icon'
import { rastreia } from '@/lib/ndovu/client'
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
  const closeRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Fecha o menu reportando o porquê. Os três caminhos de fechamento são
  // distintos de propósito: "abriu e fechou sem clicar em nada" é o sinal de
  // que o menu não foi entendido como menu.
  const fechaMenu = useCallback(
    (motivo: 'botao_fechar' | 'fora_do_painel' | 'tecla_esc' | 'envio_de_busca') => {
      setMenuEm(null)
      rastreia.acao('menu_fechado', { feature: 'nav', metadados: { motivo } })
    },
    [],
  )

  useEffect(() => {
    if (!menu) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && fechaMenu('tecla_esc')
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [menu, fechaMenu])

  useEffect(() => {
    if (busca) searchRef.current?.focus()
  }, [busca])

  const alternaBusca = (abre: boolean) => {
    setBuscaEm(abre ? pathname : null)
    rastreia.acao(abre ? 'busca_painel_aberta' : 'busca_painel_fechada', { feature: 'busca' })
  }

  return (
    <>
      <div className="header__actions">
        <button
          type="button"
          className="icon-btn"
          aria-label="Buscar no site"
          aria-expanded={busca}
          aria-controls="painel-busca"
          onClick={() => alternaBusca(!busca)}
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
          onClick={() => {
            setMenuEm(pathname)
            rastreia.acao('menu_aberto', { feature: 'nav' })
          }}
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
          <form
            action="/busca"
            className="container"
            role="search"
            data-ndovu-manual
            onSubmit={(e) => {
              const campo = e.currentTarget.elements.namedItem('q')
              const termo = campo instanceof HTMLInputElement ? campo.value.trim() : ''
              rastreia.acao('busca_enviada', {
                feature: 'busca',
                metadados: {
                  origem: 'painel_do_topo',
                  termo: termo.slice(0, 60),
                  vazio: termo.length === 0,
                },
              })
              // O `page_view` de /busca já traz o termo em `filtros.q`: o que este
              // evento acrescenta é que a busca saiu do painel do topo.
            }}
          >
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
              onKeyDown={(e) => e.key === 'Escape' && alternaBusca(false)}
            />
            <button type="submit" className="btn btn--azul">
              Buscar
            </button>
          </form>
        </div>
      ) : null}

      {menu ? (
        <div
          className="drawer"
          onClick={(e) => e.target === e.currentTarget && fechaMenu('fora_do_painel')}
        >
          <nav id="menu-mobile" className="drawer__panel" aria-label="Menu">
            <div className="drawer__head">
              <span>Menu</span>
              <button
                ref={closeRef}
                type="button"
                className="icon-btn"
                aria-label="Fechar menu"
                onClick={() => fechaMenu('botao_fechar')}
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
