'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { rastreia, type Metadados } from './client'

/**
 * 404 do site — tanto os `notFound()` explícitos das páginas dinâmicas quanto
 * qualquer URL inexistente.
 *
 * Sai como `custom`, e não como `error`, de propósito: um 404 é um fluxo do
 * usuário (link velho, slug que mudou, robô varredor), não um defeito nosso.
 * Marcar como erro encheria o painel de erro com tráfego de bot. Quem quiser
 * tratar 404 como erro troca `rastreia.custom` por `rastreia.erro` aqui — é um
 * ponto só.
 *
 * O `page_view` desta visita já saiu no `NdovuTracker`; este evento é o que
 * acrescenta o caminho real tentado e de onde a pessoa veio.
 */
export function RotaNaoEncontrada() {
  const pathname = usePathname()

  useEffect(() => {
    const metadados: Metadados = { caminho: pathname }
    if (document.referrer) {
      try {
        const de = new URL(document.referrer)
        metadados.veioDe = de.origin === window.location.origin ? de.pathname : de.hostname
      } catch {
        // referrer malformado: registra o evento sem a origem
      }
    }
    rastreia.custom('rota_nao_encontrada', metadados)
  }, [pathname])

  return null
}
