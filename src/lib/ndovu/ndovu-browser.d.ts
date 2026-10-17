/**
 * Vendor Ndovu Browser SDK — declarações do `ndovu-browser.js` ao lado.
 *
 * Arquivo copiado, não editado: fonte em
 * `ndovu/sdk/src/ndovu-browser.js` (Ndovu 1.3.0, sincronizado em 2026-10-17).
 *
 * Por que este arquivo existe: o `tsconfig` tem `allowJs` mas não `checkJs`, e o
 * eslint ignora o vendor. Sem estas declarações nada daqui é checado — o `.js`
 * entraria no build sem nenhuma validação de tipo. Ao atualizar o vendor, é
 * este arquivo que precisa ser conferido junto.
 */

export type NdovuTipoEvento = 'page_view' | 'action' | 'error' | 'http_request' | 'custom'

export interface NdovuErro {
  code?: string
  message?: string
  body?: unknown
}

export interface NdovuRastro {
  traceId: string
  spanId: string
}

export interface NdovuHttp {
  method?: string
  url?: string
  statusCode?: number
  requestBody?: unknown
  responseBody?: unknown
}

export interface NdovuEvento {
  eventId: string
  type: NdovuTipoEvento
  name: string
  screen?: string
  feature?: string
  timestamp?: string
  durationMs?: number
  metadata?: Record<string, unknown>
  trace?: NdovuRastro
  error?: NdovuErro
  http?: NdovuHttp
}

export interface NdovuActionOpts {
  feature?: string
  screen?: string
  metadata?: Record<string, unknown>
}

export interface NdovuErrorOpts {
  code?: string
  message?: string
  body?: unknown
  feature?: string
  screen?: string
  durationMs?: number
  metadata?: Record<string, unknown>
  trace?: NdovuRastro
}

export interface NdovuHttpRequestOpts {
  method?: string
  url?: string
  statusCode?: number
  requestBody?: unknown
  responseBody?: unknown
  durationMs?: number
  feature?: string
  screen?: string
  error?: NdovuErro
  trace?: NdovuRastro
}

export interface NdovuFeedbackOpts {
  type?: 'bug' | 'suggestion' | 'praise' | 'other'
  email?: string
  eventId?: string
}

export interface NdovuInstrumentarFetchOpts {
  nameFor?: (url: string) => string
  ignore?: string[]
  propagateTraceparent?: boolean
}

export interface NdovuConfig {
  endpoint: string
  apiKey: string
  app: string
  getUserId?: () => string | null
  flushIntervalMs?: number
  maxBatch?: number
  sessionAttributes?: Record<string, unknown>
  captureGlobals?: boolean
  captureWebVitals?: boolean
  breadcrumbs?: boolean
  captureSnapshots?: boolean
  release?: string
}

export interface NdovuSdk {
  readonly sessionId: string
  pageView(screen: string, extra?: Record<string, unknown>): void
  action(name: string, opts?: NdovuActionOpts): void
  error(name: string, opts?: NdovuErrorOpts): void
  httpRequest(name: string, opts: NdovuHttpRequestOpts): void
  custom(name: string, metadata?: Record<string, unknown>): void
  instrumentFetch(opts?: NdovuInstrumentarFetchOpts): void
  feedback(message: string, opts?: NdovuFeedbackOpts): Promise<unknown>
  mountFeedbackWidget(opts?: Record<string, unknown>): () => void
  flush(useBeacon?: boolean): Promise<void>
}

export function createNdovu(config: NdovuConfig): NdovuSdk

export function redact<T>(value: T, depth?: number): T
