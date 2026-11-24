/**
 * Exportador OTLP/HTTP (JSON) para o Ndovu — sem SDK do OpenTelemetry.
 *
 * Por que não `@opentelemetry/sdk-node`: o site precisa de **logs**, e o SDK
 * arrasta ~15 pacotes (instrumentações de http/pg/fetch, contexto assíncrono,
 * métricas) para dentro de um processo que já disputa 768 MB com o Payload. O
 * protocolo OTLP/JSON é pequeno e estável; o que o SDK entrega de valor real
 * aqui é o batching, que cabe em 60 linhas.
 *
 * Contrato do Ndovu (confirmado contra otlp.ndovu.solutions em 21/11/2026):
 *   POST {endpoint}/v1/logs
 *   x-api-key: <chave do app de SERVIDOR>
 *   Content-Type: application/json
 * Respostas de erro vêm como `{ code, message }` em estilo gRPC — 403 com
 * "não aceita OTLP" significa app cadastrado como frontend, não chave errada.
 *
 * Regras que não podem ser quebradas:
 * - nunca lançar: log do site não pode derrubar requisição;
 * - nunca reentrar no `console` (o `servidor.ts` intercepta console.error);
 * - nunca mandar PII: corpo passa por `sanitizar` antes de sair.
 */

import 'server-only'

export type Severidade = 'error' | 'info' | 'warn'

type ValorAtributo = boolean | number | string

export type Registro = {
  atributos?: Record<string, undefined | ValorAtributo>
  corpo: string
  severidade: Severidade
}

const ENDPOINT_PADRAO = 'https://otlp.ndovu.solutions'
const INTERVALO_MS = 5000
const LOTE_MAX = 200
const CORPO_MAX = 4000
const TIMEOUT_MS = 10_000

/** Ordem crescente: um nível configurado deixa passar ele e os acima. */
const PESO: Record<Severidade, number> = { info: 0, warn: 1, error: 2 }

const SEVERIDADE_OTLP: Record<Severidade, { numero: number; texto: string }> = {
  error: { numero: 17, texto: 'ERROR' },
  info: { numero: 9, texto: 'INFO' },
  warn: { numero: 13, texto: 'WARN' },
}

type Config = {
  ambiente: string
  chave: string
  endpoint: string
  nivel: Severidade
  servico: string
  versao: string
}

let configResolvida: Config | null | undefined
let fila: Registro[] = []
let timer: NodeJS.Timeout | null = null
let enviando = false
let ultimoAvisoDeErro = 0

/** Cache: `config()` é chamado em cada log. */
function config(): Config | null {
  if (configResolvida !== undefined) return configResolvida

  const chave = chaveDaEnv()
  if (!chave) {
    configResolvida = null
    return null
  }

  const endpoint = (
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim() || ENDPOINT_PADRAO
  ).replace(/\/+$/, '')

  const nivelBruto = (process.env.NDOVU_OTLP_NIVEL ?? 'warn').toLowerCase()
  const nivel: Severidade =
    nivelBruto === 'error' || nivelBruto === 'info' || nivelBruto === 'warn' ? nivelBruto : 'warn'

  configResolvida = {
    ambiente: process.env.NODE_ENV ?? 'development',
    chave,
    endpoint: endpoint.endsWith('/v1/logs') ? endpoint : `${endpoint}/v1/logs`,
    nivel,
    servico: process.env.OTEL_SERVICE_NAME?.trim() || 'felpma-site',
    versao: process.env.NEXT_PUBLIC_APP_VERSION?.trim() || 'dev',
  }
  return configResolvida
}

/**
 * A chave vem de `NDOVU_OTLP_API_KEY` (jeito direto) ou de
 * `OTEL_EXPORTER_OTLP_HEADERS` (jeito padrão do OTel, `x-api-key=...`), para o
 * deploy poder usar qualquer um dos dois sem código novo.
 */
function chaveDaEnv(): string {
  const direta = process.env.NDOVU_OTLP_API_KEY?.trim()
  if (direta) return direta

  const bruto = process.env.OTEL_EXPORTER_OTLP_HEADERS?.trim()
  if (!bruto) return ''

  for (const par of bruto.split(',')) {
    const [nome, ...resto] = par.split('=')
    if (nome?.trim().toLowerCase() === 'x-api-key') return resto.join('=').trim()
  }
  return ''
}

export function observabilidadeAtiva(): boolean {
  return config() !== null
}

/** Liga o exportador e devolve a configuração resolvida (para o log de boot). */
export function iniciarExportador(): Config | null {
  const cfg = config()
  if (!cfg) return null
  return cfg
}

/**
 * Remove o que não pode sair do servidor. Não é anonimização forte — é a barreira
 * mínima para um log de erro não carregar e-mail ou CPF de atleta para um
 * terceiro. Texto que já foi mascarado pelo Payload passa intacto.
 */
export function sanitizar(texto: string): string {
  return texto
    // TLD alfabético evita casar caminho de pacote (`payloadcms+db-postgres@3.91.0`),
    // que estragaria o stack trace sem proteger ninguém.
    .replace(/[\w.+-]+@(?:[\w-]+\.)+[a-z]{2,24}\b/gi, '[email]')
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[cpf]')
    .replace(/\bndk_[a-z0-9]{16,}\b/gi, '[chave]')
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]{16,}=*/gi, 'Bearer [token]')
    .slice(0, CORPO_MAX)
}

export function registrar(registro: Registro, opcoes: { forcar?: boolean } = {}): boolean {
  const cfg = config()
  if (!cfg) return false
  if (!opcoes.forcar && PESO[registro.severidade] < PESO[cfg.nivel]) return false

  fila.push({ ...registro, corpo: sanitizar(registro.corpo) })
  if (fila.length > LOTE_MAX * 4) fila = fila.slice(-LOTE_MAX * 4)

  if (fila.length >= LOTE_MAX) void descarregar()
  else if (!timer) {
    timer = setTimeout(() => {
      timer = null
      void descarregar()
    }, INTERVALO_MS)
    // O timer não pode segurar o processo vivo no shutdown.
    timer.unref?.()
  }
  return true
}

export async function descarregar(): Promise<void> {
  const cfg = config()
  if (!cfg || enviando || fila.length === 0) return

  enviando = true
  const lote = fila
  fila = []

  try {
    const resposta = await fetch(cfg.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': cfg.chave },
      body: JSON.stringify(corpo(cfg, lote)),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

    if (!resposta.ok) {
      // Aviso rate-limited no stderr: `console.*` aqui causaria recursão.
      avisarErro(cfg, resposta.status, await resposta.text().catch(() => ''))
    }
  } catch (erro) {
    avisarErro(cfg, 0, erro instanceof Error ? erro.message : String(erro))
  } finally {
    enviando = false
  }
}

function avisarErro(cfg: Config, status: number, corpo: string): void {
  const agora = Date.now()
  if (agora - ultimoAvisoDeErro < 5 * 60 * 1000) return
  ultimoAvisoDeErro = agora
  process.stderr.write(
    `[ndovu-otlp] envio para ${cfg.endpoint} falhou (status ${status}): ${corpo.slice(0, 300)}\n`,
  )
}

/**
 * Monta o envelope OTLP/JSON. Os nomes de campo são do spec
 * (opentelemetry-proto) em camelCase — não são livres.
 */
function corpo(cfg: Config, lote: Registro[]) {
  const agora = nano(Date.now())

  return {
    resourceLogs: [
      {
        resource: {
          attributes: [
            atributo('service.name', cfg.servico),
            atributo('service.version', cfg.versao),
            atributo('deployment.environment', cfg.ambiente),
            atributo('service.namespace', 'felpma'),
          ],
        },
        scopeLogs: [
          {
            scope: { name: 'felpma-servidor', version: cfg.versao },
            logRecords: lote.map((registro) => ({
              timeUnixNano: agora,
              observedTimeUnixNano: agora,
              severityNumber: SEVERIDADE_OTLP[registro.severidade].numero,
              severityText: SEVERIDADE_OTLP[registro.severidade].texto,
              body: { stringValue: registro.corpo },
              attributes: Object.entries(registro.atributos ?? {})
                .filter(([, valor]) => valor !== undefined)
                .map(([chave, valor]) => atributo(chave, valor as ValorAtributo)),
            })),
          },
        ],
      },
    ],
  }
}

function atributo(chave: string, valor: ValorAtributo) {
  if (typeof valor === 'number') {
    return Number.isInteger(valor)
      ? { key: chave, value: { intValue: String(valor) } }
      : { key: chave, value: { doubleValue: valor } }
  }
  if (typeof valor === 'boolean') return { key: chave, value: { boolValue: valor } }
  return { key: chave, value: { stringValue: valor } }
}

function nano(ms: number): string {
  return `${ms}000000`
}
