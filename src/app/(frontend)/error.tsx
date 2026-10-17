'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { initNdovu, rastreia } from '@/lib/ndovu/client'

/**
 * Fronteira de erro de TODAS as telas do site.
 *
 * Um `error.tsx` no segmento `(frontend)` envolve o layout do grupo e todos os
 * filhos — inclusive as páginas aninhadas que não têm fronteira própria. É o
 * ponto único onde um `payload.find()` que quebrou, uma página com dado
 * malformado ou um componente que lançou no render viram um evento no Ndovu.
 *
 * `error.digest`: em produção a Next não repassa a mensagem original de um erro
 * vindo de Server Component (para não vazar detalhe de servidor). O digest é a
 * chave que amarra o evento do navegador à linha do log do servidor — por isso
 * ele vai no `corpo` do evento e é o que se procura no log.
 */
export default function TelaComErro({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    initNdovu()
    rastreia.erro('erro_de_tela', {
      code: error.name || 'ERRO_DE_RENDER',
      mensagem: error.message,
      corpo: { digest: error.digest, stack: error.stack },
      feature: 'roteamento',
    })
  }, [error])

  return (
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
      <h1 style={{ fontWeight: 900, fontSize: 'clamp(28px, 5vw, 42px)' }}>
        Algo não carregou como deveria
      </h1>
      <p style={{ fontSize: 17, color: 'var(--texto-2)', maxWidth: 560 }}>
        Tente novamente. Se o problema continuar, avise pela página de contato — o horário desta
        tentativa já foi registrado.
      </p>
      <div className="acoes">
        <button
          type="button"
          className="btn btn--azul"
          onClick={() => {
            rastreia.acao('tentar_novamente', { metadados: { digest: error.digest } })
            retry()
          }}
        >
          Tentar novamente
        </button>
        <Link href="/" className="btn btn--contorno">
          Página inicial
        </Link>
      </div>
    </section>
  )
}
