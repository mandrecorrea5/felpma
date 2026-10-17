/**
 * Integração do site com o Ndovu (browser SDK).
 *
 * Por que existe uma fachada em vez de exportar a instância direto:
 *
 * 1. `createNdovu` **lança** se faltar endpoint/apiKey/app — e o build de produção
 *    precisa passar mesmo com o Ndovu desligado. Sem chave, tudo aqui vira no-op.
 * 2. O SDK roda antes da hidratação (via `src/instrumentation-client.ts`). Um erro
 *    dele não pode derrubar o site: nenhum método daqui propaga exceção.
 * 3. `NEXT_PUBLIC_*` é congelado no build. Se amanhã o Ndovu precisar de consentimento
 *    prévio (docs/INTEGRACAO_NDOVU.txt §12), liga-se por `liberar()` e nenhum ponto
 *    de chamada muda.
 *
 * PII: este site não tem login, então `getUserId` devolve `null` sempre — nenhum
 * evento sai identificado. E as mutações não têm corpo registrado (ver
 * `observarMutacoes`), porque o formulário de contato é exatamente PII.
 */

'use client'

import { createNdovu, type NdovuErrorOpts, type NdovuSdk } from './ndovu-browser.js'
import { identificarRota, type RotaIdentificada } from './rotas'

/** Conjunto fechado de áreas — manter alinhado com `area` de `rotas.ts`. */
export type FuncaoApp =
  | 'roteamento'
  | 'nav'
  | 'busca'
  | 'contato'
  | 'filiacao'
  | 'centros'
  | 'competicoes'
  | 'conteudo'
  | 'institucional'
  | 'documentos'
  | 'mapa'
  | 'admin'
  | 'nao_mapeado'

export type Metadados = Record<string, unknown>

export interface OptsAcao {
  feature?: FuncaoApp
  metadados?: Metadados
}

export interface OptsErro {
  code?: string
  mensagem?: string
  corpo?: unknown
  feature?: FuncaoApp
  duracaoMs?: number
  metadados?: Metadados
}

let inst: NdovuSdk | null = null
let tentou = false
let liberado = true
/** Último erro interno do Ndovu — nunca jogado pra fora, só guardado para diagnóstico. */
let falhaInterna: string | null = null

const NOME_APP = process.env.NEXT_PUBLIC_NDOVU_APP || 'felpma'

function config(): { endpoint: string; apiKey: string; app: string } | null {
  const endpoint = (process.env.NEXT_PUBLIC_NDOVU_ENDPOINT ?? '').replace(/\/+$/, '')
  const apiKey = process.env.NEXT_PUBLIC_NDOVU_API_KEY ?? ''
  if (!endpoint || !apiKey) return null
  return { endpoint, apiKey, app: process.env.NEXT_PUBLIC_NDOVU_APP || NOME_APP }
}

/** Liga/desliga a emissão sem precisar de chave nova (reserva para consentimento LGPD). */
export function liberar(ligue = true): void {
  liberado = ligue
}

export function estaAtivo(): boolean {
  return inst !== null && liberado
}

/** Cria a instância uma única vez. Nunca lança. */
export function initNdovu(): NdovuSdk | null {
  if (inst || tentou) return inst
  if (typeof window === 'undefined') return null
  tentou = true

  try {
    const c = config()
    if (!c) {
      if (process.env.NODE_ENV !== 'production') {
        // console.info e nao .error: o proprio SDK intercepta console.error.
        console.info('[ndovu] desativado — defina NEXT_PUBLIC_NDOVU_ENDPOINT e _API_KEY')
      }
      return null
    }

    inst = createNdovu({
      ...c,
      release: process.env.NEXT_PUBLIC_APP_VERSION || undefined,
      getUserId: () => null,
      sessionAttributes: { site: 'felpma', tipo: 'site-institucional' },
      // O web vital `TTFB` medido aqui é o do documento HTML, que é o que importa
      // para um site renderizado no servidor.
      captureGlobals: true,
      captureWebVitals: true,
      breadcrumbs: true,
      captureSnapshots: true,
    })
    observarMutacoes(inst)
  } catch (e) {
    falhaInterna = descrever(e)
    inst = null
  }
  return inst
}

function comSdk<T>(fn: (sdk: NdovuSdk) => T): T | undefined {
  if (!liberado) return undefined
  const sdk = inst ?? initNdovu()
  if (!sdk) return undefined
  try {
    return fn(sdk)
  } catch (e) {
    falhaInterna = descrever(e)
    return undefined
  }
}

function telaDe(rota?: string): string {
  if (rota) return rota
  if (typeof window === 'undefined') return '/'
  return identificarRota(window.location.pathname).padrao
}

/** Rota atual já normalizada para `screen`, com o padrão do disco. */
export function telaAtual(): string {
  return telaDe()
}

export const rastreia = {
  /** Última barreira antes de emitir: a rota tem que existir na tabela. */
  tela(screen: string, opts: OptsAcao & { metadados?: Metadados } = {}): void {
    comSdk((sdk) =>
      sdk.pageView(screen, {
        feature: opts.feature,
        metadata: opts.metadados,
      }),
    )
  },

  acao(nome: string, opts: OptsAcao = {}): void {
    comSdk((sdk) =>
      sdk.action(nome, {
        feature: opts.feature,
        screen: telaDe(),
        metadata: opts.metadados,
      }),
    )
  },

  erro(nome: string, opts: OptsErro = {}): void {
    const origem = origemDoErro(opts)
    comSdk((sdk) =>
      sdk.error(nome, {
        code: opts.code ?? origem.code,
        message: opts.mensagem ?? origem.message,
        body: opts.corpo ?? origem.body,
        feature: opts.feature,
        screen: telaDe(),
        durationMs: opts.duracaoMs,
        metadata: opts.metadados,
      } satisfies NdovuErrorOpts),
    )
  },

  custom(nome: string, metadados?: Metadados): void {
    comSdk((sdk) => sdk.custom(nome, metadados))
  },

  // Sem `http()` na fachada de propósito: `httpRequest` do SDK não tem slot de
  // `metadata`, e a única HTTP real do frontend já é reportada por
  // `observarMutacoes` — com corpo deliberadamente de fora.

  flush(): void {
    void comSdk((sdk) => sdk.flush())
  },

  get sessao(): string | null {
    return inst?.sessionId ?? null
  },

  /** Diagnóstico local: `window.__felpma_ndovu__.estado()` no console. */
  estado(): { ativo: boolean; app: string; liberado: boolean; falhaInterna: string | null } {
    return { ativo: inst !== null, app: NOME_APP, liberado, falhaInterna }
  },
}

// ---------------------------------------------------------------------------
// Rastro (trace) — correlaciona ação do usuário com a mutação no servidor
// ---------------------------------------------------------------------------

type RastroGlobal = { traceId: string; spanId: string }

function novoRastro(): RastroGlobal {
  const hex = (n: number) =>
    Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) =>
      b.toString(16).padStart(2, '0'),
    ).join('')
  // traceparent de verdade, versão 00, flags 01 (sampled): o mesmo valor que
  // `observarMutacoes` envia no header, para o backend poder correlacionar.
  return { traceId: hex(16), spanId: hex(8) }
}

// ---------------------------------------------------------------------------
// Mutações (server actions) — instrumentação própria, não `instrumentFetch`
// ---------------------------------------------------------------------------

/**
 * O `instrumentFetch` do SDK registraria `requestBody`/`responseBody` de toda
 * chamada. No nosso caso a única mutação real é a action do formulário de
 * contato, cujo corpo é nome + e-mail + telefone + mensagem, e cuja resposta
 * devolve esses mesmos campos de volta. Lote vazio de corpo é decisão de LGPD,
 * não de preguiça.
 *
 * Também por isso filtramos os GET: no App Router eles são o carregamento RSC
 * da navegação, que já é medido como `page_view` (com `duracaoMs`).
 */
function observarMutacoes(sdk: NdovuSdk): void {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return
  const cfg = config()
  if (!cfg) return

  const original = window.fetch.bind(window)

  window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const pedido = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const metodo = (
      init.method ??
      (typeof input === 'object' && 'method' in input ? input.method : 'GET') ??
      'GET'
    ).toUpperCase()

    const ehDoNdovu = pedido.startsWith(cfg.endpoint)
    if (metodo === 'GET' || ehDoNdovu) return original(input, init)

    const rota = caminhoDe(pedido)
    const rastro = novoRastro()
    const cabecalhos = new Headers(init.headers ?? {})
    if (!cabecalhos.has('traceparent')) {
      cabecalhos.set('traceparent', `00-${rastro.traceId}-${rastro.spanId}-01`)
    }

    const inicio = performance.now()
    const acaoDoServidor = cabecalhos.has('Next-Action')
    try {
      const res = await original(input, { ...init, headers: cabecalhos })
      sdk.httpRequest(acaoDoServidor ? 'acao_servidor' : 'mutacao', {
        method: metodo,
        url: rota,
        statusCode: res.status,
        durationMs: Math.round(performance.now() - inicio),
        screen: telaDe(),
        feature: featureDaRota(rota),
        trace: rastro,
        error: res.ok
          ? undefined
          : { code: `HTTP_${res.status}`, message: res.statusText || 'resposta com erro' },
      })
      return res
    } catch (e) {
      sdk.error(acaoDoServidor ? 'acao_servidor' : 'mutacao', {
        code: 'FALHA_DE_REDE',
        message: descrever(e),
        body: { rota },
        screen: telaDe(),
        feature: featureDaRota(rota),
        durationMs: Math.round(performance.now() - inicio),
        trace: rastro,
      })
      throw e
    }
  }
}

function caminhoDe(pedido: string): string {
  try {
    return new URL(pedido, window.location.origin).pathname
  } catch {
    return pedido.split('?')[0]
  }
}

function featureDaRota(caminho: string): FuncaoApp {
  return identificarRota(caminho).area as FuncaoApp
}

// ---------------------------------------------------------------------------
// Erros
// ---------------------------------------------------------------------------

function origemDoErro(opts: OptsErro): { code?: string; message?: string; body?: unknown } {
  const alvo = opts.corpo
  if (alvo instanceof Error) {
    return {
      code: opts.code ?? alvo.name,
      message: opts.mensagem ?? alvo.message,
      body: { stack: alvo.stack, nome: alvo.name },
    }
  }
  return { code: opts.code, message: opts.mensagem, body: opts.corpo }
}

function descrever(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}`
  if (typeof e === 'string') return e
  try {
    return JSON.stringify(e)
  } catch {
    return String(e)
  }
}

// ---------------------------------------------------------------------------
// Bula para diagnóstico na máquina
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    __felpma_ndovu__?: {
      estado: typeof rastreia.estado
      sessao: () => string | null
      flush: () => void
      rota: () => RotaIdentificada
      init: typeof initNdovu
    }
  }
}

if (typeof window !== 'undefined') {
  window.__felpma_ndovu__ = {
    estado: () => rastreia.estado(),
    sessao: () => rastreia.sessao,
    flush: () => rastreia.flush(),
    rota: () => identificarRota(window.location.pathname),
    init: initNdovu,
  }
}
