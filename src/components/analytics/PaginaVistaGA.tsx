'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useSyncExternalStore } from 'react'
import {
  assinarConsentimento,
  caminhoParaGA,
  lerConsentimento,
  paginaVistaGA,
} from '@/lib/analytics/ga'

/**
 * `page_view` do GA4, um por navegação do App Router.
 *
 * Existe porque o pageview automático do GA4 manda a URL **crua** — e na área
 * do atleta isso é `/area/inscricoes/FELPMA-2026-0001`, que identifica o
 * titular. Aqui a URL passa por `caminhoParaGA` e vira o padrão da rota.
 *
 * Consequência que precisa estar no painel do GA4: a medição aprimorada
 * "Alterações de página com base em eventos de histórico do navegador" tem de
 * ficar **desligada**. Se ficar ligada, cada navegação conta duas vezes e uma
 * delas vaza a URL original.
 */
export function PaginaVistaGA() {
  const pathname = usePathname()
  const busca = useSearchParams()
  const consentimento = useSyncExternalStore(assinarConsentimento, lerConsentimento, () => null)
  const enviado = useRef<string | null>(null)
  const anterior = useRef<string | null>(null)

  useEffect(() => {
    // Aceitar o banner no meio de uma página também dispara: o snippet sobe com
    // `send_page_view: false`, então sem isto a primeira tela ficaria sem view.
    if (consentimento !== 'granted') return

    const caminho = caminhoParaGA(pathname, busca.toString())
    // StrictMode e re-render por outro motivo não podem contar de novo; só marco
    // como enviado quando o evento realmente saiu (consentimento ok).
    if (enviado.current === caminho) return
    if (!paginaVistaGA(anterior.current ?? undefined)) return

    enviado.current = caminho
    anterior.current = caminho
  }, [consentimento, pathname, busca])

  return null
}
