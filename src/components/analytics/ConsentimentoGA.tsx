'use client'

import Link from 'next/link'
import Script from 'next/script'
import { useEffect, useState, useSyncExternalStore } from 'react'
import {
  GA_ATIVO,
  GA_DEBUG,
  GA_ID,
  GA_ID_VALIDO,
  assinarConsentimento,
  lerConsentimento,
  limparCookiesGA,
  salvarConsentimento,
  type Consentimento,
} from '@/lib/analytics/ga'

/** Evento de janela que o link do rodapé dispara para reabrir o banner. */
export const EVENTO_ABRIR_CONSENTIMENTO = 'felpma:abrir-consentimento'

/** Nunca muda: serve só para descobrir se a hidratação já aconteceu. */
const semAssinatura = () => () => {}

/**
 * Consentimento de cookies de medição + carga do GA4.
 *
 * Por que o `gtag.js` só é montado depois do aceite, e não com o Consent Mode
 * em "denied" desde o início: a promessa feita ao visitante aqui é "nada sai
 * antes de você escolher". Sem script não há requisição para o Google, o que
 * também deixa a verificação simples — a página, sem aceite, não tem nenhum
 * `googletagmanager.com` no HTML.
 *
 * O estado vem de `useSyncExternalStore` porque o `localStorage` é a fonte da
 * verdade: ler no primeiro render daria divergência de hidratação, e copiar o
 * valor para `useState` dentro de `useEffect` é o padrão que o React desaconselha
 * (render em cascata). No servidor a resposta é `null` = "ainda não sei", então
 * o banner não entra no HTML e não pisca para quem já aceitou.
 */
export function ConsentimentoGA() {
  const consentimento = useSyncExternalStore(assinarConsentimento, lerConsentimento, () => null)
  const hidratado = useSyncExternalStore(semAssinatura, () => true, () => false)
  const [aberto, setAberto] = useState(false)

  useEffect(() => {
    const abrir = () => setAberto(true)
    window.addEventListener(EVENTO_ABRIR_CONSENTIMENTO, abrir)
    return () => window.removeEventListener(EVENTO_ABRIR_CONSENTIMENTO, abrir)
  }, [])

  /**
   * Limpeza de cookie ao carregar com a decisão "recusar".
   *
   * A revogação apaga os cookies antes de recarregar, mas o `gtag.js` ainda
   * pode reescrever o Client ID durante o `pagehide` da própria recarga. Repetir
   * a limpeza na página seguinte é o que garante que nada sobrou — e conserta
   * também o navegador que ficou com cookie de uma versão anterior do site.
   */
  useEffect(() => {
    if (consentimento === 'denied') limparCookiesGA()
  }, [consentimento])

  const decidir = (valor: Consentimento) => {
    const anterior = consentimento
    salvarConsentimento(valor)
    setAberto(false)

    // Revogar depois de aceitar precisa desfazer o que já foi feito: sem
    // recarregar, o `gtag.js` seguiria no documento e continuaria medindo.
    if (valor === 'denied' && anterior === 'granted') {
      limparCookiesGA()
      window.location.reload()
    }
  }

  const visivel = GA_ATIVO && GA_ID_VALIDO && hidratado && (aberto || consentimento === null)
  const carregarGA = GA_ATIVO && GA_ID_VALIDO && hidratado && consentimento === 'granted'

  return (
    <>
      {carregarGA ? <Script id="ga4" strategy="afterInteractive">{scriptDoGA()}</Script> : null}

      {visivel ? (
        <section
          className="consentimento"
          role="region"
          aria-label="Consentimento para cookies de medição"
        >
          <div className="consentimento__texto">
            <strong>Cookies de medição (Google Analytics)</strong>
            <p>
              Queremos entender quais páginas e eventos são acessados para melhorar o site. O
              Google só é acionado se você aceitar. Saiba mais na{' '}
              <Link href="/institucional/politica-de-privacidade">política de privacidade</Link>.
            </p>
          </div>
          <div className="consentimento__acoes">
            <button
              type="button"
              className="btn btn--azul btn--sm"
              onClick={() => decidir('granted')}
            >
              Aceitar
            </button>
            <button
              type="button"
              className="btn btn--contorno btn--sm"
              onClick={() => decidir('denied')}
            >
              Recusar
            </button>
          </div>
        </section>
      ) : null}
    </>
  )
}

/**
 * Link do rodapé para rever a escolha. Revogar consentimento precisa ser tão
 * fácil quanto dar (LGPD art. 8º, §5º), então o banner não pode ser uma decisão
 * de mão única.
 */
export function PreferenciasCookies() {
  // Sem GA neste build não existe cookie de medição para escolher: o link some
  // em vez de abrir um banner pedindo consentimento para o nada.
  if (!GA_ATIVO || !GA_ID_VALIDO) return null

  return (
    <button
      type="button"
      className="link-botao"
      onClick={() => window.dispatchEvent(new Event(EVENTO_ABRIR_CONSENTIMENTO))}
    >
      Preferências de cookies
    </button>
  )
}

/**
 * Snippet do `gtag.js` com o consentimento já resolvido.
 *
 * `consent default` vai antes do `config` e marca só `analytics_storage` como
 * concedido: o site não usa Google Ads e não precisa de `ad_storage`. O script
 * externo é criado aqui dentro — inline e depois do `config` — para não depender
 * da ordem em que o Next injeta dois `<Script>` separados.
 */
function scriptDoGA(): string {
  const id = JSON.stringify(GA_ID)
  const debug = GA_DEBUG ? 'debug_mode:true,' : ''
  return `
window.dataLayer = window.dataLayer || [];
function gtag(){window.dataLayer.push(arguments);}
gtag('consent','default',{
  ad_storage:'denied',
  ad_user_data:'denied',
  ad_personalization:'denied',
  analytics_storage:'granted',
  functionality_storage:'granted',
  security_storage:'granted'
});
gtag('js', new Date());
gtag('config', ${id}, {
  ${debug}
  // page_view enviado por PaginaVistaGA, com URL sanitizada (ver ga.ts).
  send_page_view: false,
  cookie_flags: 'SameSite=Lax;Secure',
  anonymize_ip: true
});
var s = document.createElement('script');
s.async = true;
s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(${id});
document.head.appendChild(s);
`.trim()
}
