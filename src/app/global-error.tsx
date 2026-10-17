'use client'

import { useEffect } from 'react'
import { initNdovu, rastreia } from '@/lib/ndovu/client'

/**
 * Fronteira de erro raiz.
 *
 * É a última barreira: pega o que passou de qualquer fronteira abaixo e, o mais
 * importante, erro no próprio layout raiz (Header, Footer, `getConfiguracoes()`
 * que volta quebrado do banco). Esses não têm `error.tsx` acima — sem este
 * arquivo o navegador mostraria a página em branco da Next.
 *
 * Por isso nada de componente, classe utilitária ou CSS do site aqui: se o erro
 * foi no layout, é justamente o que está indisponível. Só inline, só HTML puro.
 */
export default function ErroFatal({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    try {
      initNdovu()
      rastreia.erro('erro_fatal', {
        code: error.name || 'ERRO_FATAL',
        mensagem: error.message,
        corpo: { digest: error.digest, stack: error.stack },
        feature: 'roteamento',
      })
      rastreia.flush()
    } catch {
      // Não há o que fazer: esta é a última fronteira.
    }
  }, [error])

  return (
    <html lang="pt-BR">
      <body
        style={{ margin: 0, padding: 24, font: '16px/1.6 system-ui, sans-serif', color: '#111' }}
      >
        <div style={{ maxWidth: 560, margin: '12vh auto' }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 12px' }}>
            A página não conseguiu abrir
          </h1>
          <p style={{ color: '#444', margin: '0 0 20px' }}>
            Recarregue a página. Se continuar, tente de novo em alguns minutos.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              background: '#1C0A96',
              color: '#fff',
              border: 0,
              borderRadius: 8,
              padding: '10px 18px',
              font: 'inherit',
              cursor: 'pointer',
            }}
          >
            Recarregar
          </button>
        </div>
      </body>
    </html>
  )
}
