import Link from 'next/link'
import { RotaNaoEncontrada } from '@/lib/ndovu/RotaNaoEncontrada'

export default function NotFound() {
  return (
    <>
      <RotaNaoEncontrada />
      <section
        className="container section"
        style={{
          minHeight: '50vh',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          justifyContent: 'center',
          alignItems: 'flex-start',
        }}
      >
        <div className="mini-flag" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <h1 style={{ fontWeight: 900, fontSize: 'clamp(32px, 5vw, 48px)' }}>
          Página não encontrada
        </h1>
        <p style={{ fontSize: 17, color: 'var(--texto-2)', maxWidth: 560 }}>
          O endereço pode ter mudado ou o conteúdo foi removido. Tente a busca ou volte para a
          página inicial.
        </p>
        <div className="acoes">
          <Link href="/" className="btn btn--azul">
            Página inicial
          </Link>
          <Link href="/busca" className="btn btn--contorno">
            Buscar no site
          </Link>
        </div>
      </section>
    </>
  )
}
