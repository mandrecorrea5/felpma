/**
 * Camada automática de cobertura do site: pageview por rota, cliques em link e
 * envio de formulário — tudo por delegação, num único ponto.
 *
 * Por que delegação e não `onClick` espalhado: as ~17 telas são Server Components
 * e somam mais de cem `<a>`. Instrumentar um a um é a conta que nunca fecha e
 * sempre deixa um link de fora. Aqui, qualquer link que exista hoje ou venha a
 * existir amanhã (inclusive o que sair do CMS) já é coberto.
 *
 * Botões ficam de fora da delegação de propósito: os únicos client-side do site
 * (menu, busca, perfis de filiação) já reportam a própria ação com nome próprio,
 * e reportar de novo aqui seria contar dois eventos por clique.
 */

'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { rastreia, type FuncaoApp, type Metadados } from './client'
import { identificarRota } from './rotas'

/** Marcador que `src/instrumentation-client.ts` escreve no início de cada navegação. */
type InicioDeNavegacao = { url: string; tipo: string; t: number } | null

declare global {
  interface Window {
    __felpma_nav__?: InicioDeNavegacao
  }
}

/**
 * Chaves de query que o site realmente usa (`?q=`, `?pagina=`, `?categoria=`…).
 * Fora da lista não é reportado: é a barreira contra mandar texto livre
 * arbitrário — ou token de reset de alguém — parar no dashboard.
 */
const FILTROS_KNOWN = new Set([
  'q',
  'tipo',
  'ano',
  'categoria',
  'pagina',
  'perfil',
  'cidade',
  'assunto',
  'sexo',
  'idade',
])

const EXTENSOES_DE_ARQUIVO =
  /\.(pdf|zip|ics|kml|csv|txt|xml|jpe?g|png|webp|gif|xlsx?|docx?|pptx?)$/i

export function NdovuTracker() {
  const pathname = usePathname()
  const busca = useSearchParams()
  const ultimaTela = useRef<string | null>(null)

  useEffect(() => {
    // StrictMode do dev monta duas vezes: sem este guard cada rota contaria 2 views.
    if (ultimaTela.current === pathname) return
    const anterior = ultimaTela.current
    ultimaTela.current = pathname

    const rota = identificarRota(pathname)
    // `instrumentation-client` grava performance.now() — mesmo relógio, comparável.
    const de = typeof window !== 'undefined' ? (window.__felpma_nav__ ?? null) : null

    const metadados: Metadados = {
      rota: rota.nome,
      area: rota.area,
      tipoDeRota: rota.tipo,
    }
    if (rota.parametro) metadados.parametro = rota.parametro

    const filtros = filtrosDaBusca(busca.toString())
    if (filtros) metadados.filtros = filtros

    if (de) {
      // O hook da Next dá a URL de **destino**, que já é a tela deste evento — a
      // de origem é que é o dado do funil, e quem sabe ela é este ref.
      if (anterior) metadados.deRota = identificarRota(anterior).padrao
      metadados.tipoNavegacao = de.tipo
      metadados.duracaoNavegacaoMs = Math.max(0, Math.round(performance.now() - de.t))
      window.__felpma_nav__ = null
    }

    rastreia.tela(rota.padrao, {
      feature: rota.area as FuncaoApp,
      metadados,
    })
  }, [pathname, busca])

  useEffect(() => {
    const aoClicar = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return
      const alvo = alvoDoClique(e.target)
      if (!alvo) return
      const { elemento, rotulo } = alvo

      if (elemento instanceof HTMLAnchorElement) {
        const href = elemento.getAttribute('href')
        if (!href || href.startsWith('#') || href.startsWith('javascript:')) return

        const download = elemento.hasAttribute('download') || EXTENSOES_DE_ARQUIVO.test(href)
        const url = urlAbsoluta(href)
        if (!url) return
        const externa = url.origin !== window.location.origin

        // Ordem importa: um PDF em outro domínio é download, não link externo.
        const nome = download ? 'arquivo_baixado' : externa ? 'link_externo' : 'link_interno'
        const metadados: Metadados = {
          destino: download || externa ? url.href : url.pathname,
          rotulo,
        }
        if (externa) metadados.dominio = url.hostname
        if (download) metadados.arquivo = nomeDoArquivo(url)

        rastreia.acao(nome, {
          feature: funcaoDoLink(url.pathname),
          metadados,
        })
      }
    }

    const aoEnviar = (e: SubmitEvent) => {
      const form = e.target
      if (!(form instanceof HTMLFormElement)) return
      // Formulário que já reporta o próprio envio com dados próprios (o da busca,
      // a action do contato): contar também aqui seria dois eventos por submit.
      if (form.hasAttribute('data-ndovu-manual')) return
      const alvo = form.getAttribute('action')
      const metodo = (form.getAttribute('method') || 'get').toUpperCase()
      const id = form.getAttribute('id') || form.getAttribute('data-ndovu-form') || form.className

      rastreia.acao('formulario_enviado', {
        feature: funcaoDoLink(alvo ? caminhoDe(alvo) : window.location.pathname),
        metadados: {
          formulario: id,
          metodo,
          destino: alvo ? caminhoDe(alvo) : window.location.pathname,
        },
      })
    }

    // Capture: a navegação do Next pode consumir o evento antes de subir pro bubble.
    document.addEventListener('click', aoClicar, true)
    document.addEventListener('submit', aoEnviar, true)
    return () => {
      document.removeEventListener('click', aoClicar, true)
      document.removeEventListener('submit', aoEnviar, true)
    }
  }, [])

  return null
}

// ---------------------------------------------------------------------------

function alvoDoClique(
  target: EventTarget | null,
): { elemento: HTMLElement; rotulo: string } | null {
  if (!(target instanceof Element)) return null
  const botao = target.closest<HTMLAnchorElement | HTMLButtonElement>('a[href], button')
  if (!botao) return null
  // `data-ndovu-ignore` é a saída de emergência para qualquer elemento.
  if (botao.closest('[data-ndovu-ignore]')) return null
  // `data-ndovu-manual` = este elemento já reporta o próprio evento, com nome e
  // metadados próprios (o CTA de filiação, por exemplo). Automatico + manual
  // juntos contariam dois cliques.
  if (botao.closest('[data-ndovu-manual]')) return null
  return { elemento: botao, rotulo: rotuloDe(botao) }
}

/**
 * Rótulo legível do elemento. Nunca texto longo: um link de notícia tem o título
 * inteiro, e o dashboard não precisa de texto arbitrário indexado por clique.
 */
function rotuloDe(el: Element): string {
  const cru =
    el.getAttribute('aria-label') ||
    el.getAttribute('title') ||
    (el.textContent ?? '').replace(/\s+/g, ' ').trim()
  return cru.length > 60 ? `${cru.slice(0, 57)}…` : cru
}

function urlAbsoluta(href: string): URL | null {
  try {
    return new URL(href, window.location.origin)
  } catch {
    return null
  }
}

function caminhoDe(href: string): string {
  const url = urlAbsoluta(href)
  return url ? url.pathname : href.split('?')[0]
}

function nomeDoArquivo(url: URL): string {
  const segmento = url.pathname.split('/').filter(Boolean).pop() ?? ''
  return segmento.slice(0, 80)
}

function funcaoDoLink(caminho: string): FuncaoApp {
  return identificarRota(caminho).area as FuncaoApp
}

function filtrosDaBusca(qs: string): Metadados | null {
  if (!qs) return null
  const sp = new URLSearchParams(qs)
  const saida: Metadados = {}
  for (const [chave, valor] of sp.entries()) {
    if (!FILTROS_KNOWN.has(chave)) continue
    // `q` é texto digitado: mantém-se presente (é o dado que interessa na busca)
    // mas com teto, para não indexar string livre de tamanho arbitrário.
    saida[chave] = chave === 'q' ? valor.slice(0, 60) : valor.slice(0, 60)
  }
  return Object.keys(saida).length ? saida : null
}
