/**
 * Instrumentação client-side do Next (App Router).
 *
 * Este arquivo roda depois do HTML carregar e **antes da hidratação do React** —
 * é a única janela em que dá para instalar os handlers globais de erro e os
 * PerformanceObserver antes de qualquer código de aplicação. Erro de hidratação,
 * de bundle que falhou ao carregar ou de layout anterior ao primeiro effect só
 * aparece se o SDK estiver de pé aqui.
 *
 * Referência: node_modules/next/dist/docs → app/api-reference/file-conventions/
 * instrumentation-client.
 *
 * Regra do Next: só código síncrono de topo é garantido antes da hidratação, e
 * o orçamento de tempo é de ~16ms. Por isso nada de `await` nem `import()` aqui.
 */

import { initNdovu, rastreia } from './lib/ndovu/client'

type TipoDeNavegacao = 'push' | 'replace' | 'traverse'

try {
  initNdovu()
} catch {
  // Instrumentação nunca pode impedir o app de subir.
}

/**
 * Breadcrumb de navegação. O `page_view` sai do `NdovuTracker` (que vê a URL já
 * assentada); aqui só marca o instante de partida, no mesmo relógio do
 * `performance.now()` usado no destino — daí sair `duracaoNavegacaoMs`.
 */
export function onRouterTransitionStart(url: string, navigationType: TipoDeNavegacao): void {
  try {
    window.__felpma_nav__ = { url, tipo: navigationType, t: performance.now() }
  } catch {
    // idem
  }
}

/**
 * Última chance de descarregar o lote quando a aba some. O SDK já faz flush em
 * `pagehide`, mas com o listener registrado aqui — e não dentro do SDK — ele
 * vale também para `visibilitychange`, que é o que o celular realmente dispara
 * quando o usuário troca de app.
 */
try {
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.visibilityState === 'hidden') rastreia.flush()
    },
    { passive: true },
  )
} catch {
  // idem
}
