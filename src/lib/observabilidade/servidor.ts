/**
 * Observabilidade do processo Node: `console` + erro de requisição do Next.
 *
 * O browser SDK do Ndovu cobre o que acontece na aba do visitante. Este arquivo
 * cobre o outro lado — o servidor —, que é o que alimenta a aba **Logs** do
 * Ndovu (OTLP em `otlp.ndovu.solutions`). Hoje esses logs só iam para o Loki via
 * promtail, dentro da VPS.
 *
 * Regra de ouro: nada aqui pode mudar o comportamento do site. Não registramos
 * handler de `uncaughtException` (impediria o processo de morrer como deve) nem
 * de `SIGTERM` (atrasaria o shutdown do container). Usamos
 * `uncaughtExceptionMonitor`, que observa sem interferir.
 */

import 'server-only'
import { identificarRota } from '@/lib/ndovu/rotas'
import { descarregar, iniciarExportador, observabilidadeAtiva, registrar } from './otlp'

let iniciado = false

export function iniciarObservabilidade(): void {
  if (iniciado) return
  iniciado = true

  const cfg = iniciarExportador()
  if (!cfg) {
    if (process.env.NODE_ENV !== 'production') {
      process.stderr.write('[ndovu-otlp] desativado — defina NDOVU_OTLP_API_KEY\n')
    }
    return
  }

  // stderr em vez de console: o console está sendo interceptado logo abaixo.
  process.stderr.write(`[ndovu-otlp] ativo → ${cfg.endpoint} (nível ${cfg.nivel})\n`)

  interceptarConsole()

  process.on('uncaughtExceptionMonitor', (erro, origem) => {
    registrar(
      {
        atributos: { 'log.origem': origem, 'log.source': 'processo' },
        corpo: `exceção não tratada (${origem}): ${formatar([erro])}`,
        severidade: 'error',
      },
      { forcar: true },
    )
    // O processo vai morrer; tenta entregar o último registro.
    void descarregar()
  })

  // Registro de boot: prova no dashboard que a integração subiu, mesmo com o
  // nível padrão em `warn`.
  registrar(
    {
      atributos: { 'log.origem': 'boot', 'log.source': 'servidor' },
      corpo: `observabilidade do servidor ativa (${cfg.servico} v${cfg.versao}, ${cfg.ambiente})`,
      severidade: 'info',
    },
    { forcar: true },
  )
}

/**
 * Instrumenta `console.error`, `warn` e `info` sem perder a saída original —
 * o `docker logs`/promtail continua funcionando exatamente como antes.
 */
function interceptarConsole(): void {
  for (const metodo of ['error', 'info', 'warn'] as const) {
    const original = console[metodo].bind(console)

    console[metodo] = (...argumentos: unknown[]) => {
      original(...argumentos)
      try {
        const texto = formatar(argumentos)
        if (texto) {
          registrar({
            atributos: { 'log.origem': `console.${metodo}`, 'log.source': 'servidor' },
            corpo: texto,
            severidade: metodo,
          })
        }
      } catch {
        // Observabilidade nunca derruba a requisição que estava logando.
      }
    }
  }
}

/** Converte os argumentos do console em uma linha legível. */
function formatar(argumentos: unknown[]): string {
  return argumentos
    .map((argumento) => {
      if (typeof argumento === 'string') return argumento
      if (argumento instanceof Error) return argumento.stack ?? `${argumento.name}: ${argumento.message}`
      try {
        return JSON.stringify(argumento)
      } catch {
        return String(argumento)
      }
    })
    .join(' ')
    .slice(0, 1200)
}

type Requisicao = {
  method: string
  path: string
}

type Contexto = {
  renderSource?: string
  routePath?: string
  routeType?: string
  routerKind?: string
}

/**
 * Chamado pelo Next (`onRequestError`) quando uma requisição falha.
 *
 * O caminho vai **reduzido ao padrão da rota** (`/area/inscricoes/[protocolo]`):
 * o protocolo da inscrição identifica o titular e não pode ir para o Ndovu —
 * mesma regra que o GA4 e o tracker de tela já seguem.
 */
export async function registrarErroDeRequisicao(
  erro: unknown,
  requisicao: Requisicao,
  contexto: Contexto,
): Promise<void> {
  if (!observabilidadeAtiva()) return

  const digest =
    erro && typeof erro === 'object' && 'digest' in erro ? String(erro.digest) : undefined
  const caminho = requisicao.path.split('?')[0] ?? requisicao.path
  const mensagem = erro instanceof Error ? `${erro.name}: ${erro.message}` : String(erro)

  registrar(
    {
      atributos: {
        'error.digest': digest,
        'http.request.method': requisicao.method,
        'log.origem': 'requisicao',
        'log.source': 'servidor',
        'next.render_source': contexto.renderSource,
        'next.route_path': contexto.routePath,
        'next.route_type': contexto.routeType,
        'next.router_kind': contexto.routerKind,
        'url.path': identificarRota(caminho).padrao,
      },
      corpo: `erro em ${requisicao.method} ${identificarRota(caminho).padrao}: ${mensagem}`,
      severidade: 'error',
    },
    { forcar: true },
  )

  // O Next aguarda esta função: o erro precisa chegar antes da resposta fechar.
  await descarregar()
}
