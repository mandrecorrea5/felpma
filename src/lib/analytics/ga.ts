/**
 * Ponte única entre o site e o GA4.
 *
 * Duas regras mandam neste arquivo:
 *
 * 1. **Nada do Google carrega sem consentimento.** O `gtag.js` só é injetado
 *    pelo `ConsentimentoGA` depois de um "aceitar" gravado — não existe ping
 *    anônimo nem Consent Mode "denied" mandando requisição para
 *    googletagmanager.com antes disso. É a leitura conservadora da LGPD que o
 *    projeto já adota para os dados de inscrição.
 * 2. **Nenhum dado pessoal sai daqui.** Os parâmetros são slugs, assuntos e
 *    nomes de perfil. Protocolo de inscrição, CPF, e-mail, telefone e texto
 *    digitado ficam de fora de propósito — protocolo, por exemplo, identifica
 *    o titular, e o `NdovuTracker` já o omite em rota privada.
 *
 * Chaves `NEXT_PUBLIC_*` são congeladas no BUILD: trocar o ID exige rebuild
 * (em produção, o build arg do `docker-compose.prod.yml`).
 */

'use client'

import { identificarRota, rotaPrivada } from '@/lib/ndovu/rotas'

declare global {
  interface Window {
    dataLayer?: unknown[]
  }
}

/** ID de medição do GA4 (`G-XXXXXXX`). Vazio = GA desligado, site igual. */
export const GA_ID = (process.env.NEXT_PUBLIC_GA_ID ?? '').trim()

/**
 * Só em produção, para `next dev` não sujar a propriedade real. O escape
 * `NEXT_PUBLIC_GA_DEBUG=1` existe para validar a fiação localmente com uma
 * propriedade de teste — nunca ligue isso apontando para a propriedade do site.
 */
export const GA_ATIVO =
  GA_ID.length > 0 &&
  (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_GA_DEBUG === '1')

export const GA_DEBUG = process.env.NEXT_PUBLIC_GA_DEBUG === '1'

/** ID válido de fluxo GA4. Também protege contra injeção via variável de ambiente. */
export const GA_ID_VALIDO = /^G-[A-Z0-9]{4,20}$/i.test(GA_ID)

export type Consentimento = 'denied' | 'granted'

export type ParametrosGA = Record<string, boolean | number | string | undefined>

const CHAVE_CONSENTIMENTO = 'felpma:consentimento-analytics:v1'

/**
 * Prazo para perguntar de novo. A LGPD não fixa número; 180 dias é o meio-termo
 * entre incomodar toda visita e guardar um "sim" de dois anos atrás.
 */
const VALIDADE_DIAS = 180

type RegistroConsentimento = { em: number; valor: Consentimento }

/** Última decisão do visitante, ou `null` se nunca decidiu / a decisão venceu. */
export function lerConsentimento(): Consentimento | null {
  if (typeof window === 'undefined') return null
  try {
    const cru = window.localStorage.getItem(CHAVE_CONSENTIMENTO)
    if (!cru) return null
    const registro = JSON.parse(cru) as RegistroConsentimento
    if (registro?.valor !== 'granted' && registro?.valor !== 'denied') return null
    if (!Number.isFinite(registro.em)) return null
    const venceuEm = registro.em + VALIDADE_DIAS * 24 * 60 * 60 * 1000
    return Date.now() > venceuEm ? null : registro.valor
  } catch {
    // localStorage bloqueado (Safari privado, política de cookies): sem decisão.
    return null
  }
}

/**
 * Assinatura para `useSyncExternalStore`: o `localStorage` é a fonte da verdade
 * e componentes que mostram/escondem o banner são notificados quando a decisão
 * muda. Sem isso, o banner dependeria de `setState` dentro de efeito só para
 * copiar um valor que já está fora do React.
 */
const ouvintes = new Set<() => void>()

export function assinarConsentimento(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte)
  return () => {
    ouvintes.delete(ouvinte)
  }
}

export function salvarConsentimento(valor: Consentimento): void {
  try {
    window.localStorage.setItem(
      CHAVE_CONSENTIMENTO,
      JSON.stringify({ em: Date.now(), valor } satisfies RegistroConsentimento),
    )
  } catch {
    // Sem persistência, o banner volta na próxima visita — o dado nunca vaza.
  }
  for (const ouvinte of ouvintes) ouvinte()
}

/** `true` só quando o visitante aceitou E o GA existe neste build. */
export function gaLiberado(): boolean {
  return GA_ATIVO && GA_ID_VALIDO && lerConsentimento() === 'granted'
}

/**
 * Chaves de query que o site realmente usa. Fora da lista não vai para o GA:
 * é a mesma barreira do `NdovuTracker` contra token de reset, e-mail ou texto
 * livre de alguém parar no dashboard do Google.
 */
const FILTROS_PUBLICOS = new Set([
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

/**
 * URL que o GA4 pode ver.
 *
 * O `page_location` é enviado em **todo** hit e, sem esta redução, a área do
 * atleta mandaria `/area/inscricoes/FELPMA-2026-0001` para o Google — o
 * protocolo identifica o titular e é exatamente o que o Ndovu omite de
 * propósito. Aqui a URL vira o padrão do arquivo (`/area/inscricoes/[protocolo]`),
 * que é o que interessa em relatório de navegação.
 *
 * Rota privada que ainda não esteja na tabela cai em `/area/[...]`: prefiro
 * perder a granularidade a vazar caminho desconhecido.
 */
export function caminhoParaGA(pathname: string, busca = ''): string {
  const rota = identificarRota(pathname)
  const base = rota.tipo === 'nao_mapeada' && rotaPrivada(pathname) ? '/area/[...]' : rota.padrao

  const origem = new URLSearchParams(busca)
  const filtrados = new URLSearchParams()
  for (const [chave, valor] of origem.entries()) {
    if (!FILTROS_PUBLICOS.has(chave)) continue
    filtrados.set(chave, valor.slice(0, 60))
  }

  const query = filtrados.toString()
  return query ? `${base}?${query}` : base
}

/** Caminho absoluto a partir do sanitizado — o GA4 espera URL completa. */
function urlAbsoluta(caminho: string): string {
  return `${window.location.origin}${caminho}`
}

/**
 * GA4 aceita até 25 parâmetros por evento e trunca valor em 100 caracteres.
 * Truncamos aqui para o dado chegando no painel ser o mesmo que saiu daqui.
 */
const LIMITE_VALOR = 100
const LIMITE_PARAMETROS = 20
const NOME_VALIDO = /^[a-z][a-z0-9_]{0,39}$/

function limparParametros(parametros: ParametrosGA): ParametrosGA {
  const saida: ParametrosGA = {}
  for (const [chave, valor] of Object.entries(parametros)) {
    if (Object.keys(saida).length >= LIMITE_PARAMETROS) break
    if (valor === undefined || valor === null) continue
    if (!NOME_VALIDO.test(chave)) continue
    if (typeof valor === 'string') {
      const texto = valor.replace(/\s+/g, ' ').trim()
      if (texto) saida[chave] = texto.slice(0, LIMITE_VALOR)
      continue
    }
    if (typeof valor === 'number' && Number.isFinite(valor)) {
      saida[chave] = valor
      continue
    }
    if (typeof valor === 'boolean') saida[chave] = valor
  }
  return saida
}

/**
 * Envia um evento ao GA4. No-op silencioso quando falta ID, consentimento ou
 * quando o `gtag.js` ainda não foi carregado — telemetria nunca pode quebrar
 * um fluxo de inscrição.
 *
 * Devolve se o evento foi realmente enfileirado: quem deduplica por sessão
 * (ver `EventoGA`) precisa saber a diferença entre "enviado" e "descartado por
 * falta de consentimento", senão a conversão fica marcada como contada sem
 * nunca ter chegado ao painel.
 */
export function eventoGA(nome: string, parametros: ParametrosGA = {}): boolean {
  if (typeof window === 'undefined') return false
  if (!gaLiberado()) return false

  const dataLayer = (window.dataLayer = window.dataLayer ?? [])
  // `page_location`/`page_title` entram aqui, e não em cada chamada: todo evento
  // herda a URL sanitizada, inclusive os de conversão que acontecem na área do
  // atleta. Parâmetro explícito do chamador não sobrescreve (ordem importa).
  const limpos = limparParametros({
    ...parametros,
    page_location: urlAbsoluta(caminhoParaGA(window.location.pathname, window.location.search)),
    page_title: document.title,
  })
  dataLayer.push(['event', nome, limpos])

  if (GA_DEBUG) console.info('[GA4]', nome, limpos)
  return true
}

/**
 * `page_view` manual.
 *
 * O snippet roda com `send_page_view: false` e o pageview automático por
 * histórico do GA4 precisa ficar desligado no painel — senão cada navegação
 * contaria duas vezes (e a automática mandaria a URL crua, com o protocolo).
 */
export function paginaVistaGA(referrer?: string): boolean {
  const de = referrer ? urlAbsoluta(referrer) : document.referrer || undefined
  return eventoGA('page_view', { page_referrer: de })
}

/**
 * Expira os cookies do GA4. Chamado quando o visitante revoga o consentimento:
 * o rolê seguinte recarrega a página já sem script nem cookie.
 */
export function limparCookiesGA(): void {
  if (typeof document === 'undefined') return
  const nomes = document.cookie
    .split(';')
    .map((par) => par.split('=')[0]?.trim() ?? '')
    .filter((nome) => nome === '_ga' || nome === '_gid' || nome.startsWith('_ga_'))

  const expirado = 'Thu, 01 Jan 1970 00:00:00 GMT'
  const host = window.location.hostname
  // O gtag grava com `Secure` (ver cookie_flags no snippet). Sobrescrever um
  // cookie Secure com um Set-Cookie sem Secure é recusado pelo navegador, e o
  // cookie sobreviveria à revogação — por isso o mesmo flag aqui.
  const flags = `Expires=${expirado}; Path=/; SameSite=Lax; Secure`
  // `cookie_domain: auto` pode gravar no domínio registrável (`.felpma.com.br`)
  // em vez de só no host: a revogação tenta os dois.
  const labels = host.split('.')
  const apex = labels.length > 2 ? `.${labels.slice(-2).join('.')}` : null

  for (const nome of nomes) {
    document.cookie = `${nome}=; ${flags}`
    document.cookie = `${nome}=; ${flags}; Domain=${host}`
    if (apex && host !== apex.slice(1)) document.cookie = `${nome}=; ${flags}; Domain=${apex}`
  }
}
