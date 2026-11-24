/**
 * Checklist executável da observabilidade do Ndovu.
 *
 * Responde, em uma rodada: "as duas metades da observabilidade estão
 * configuradas?" — o SDK do navegador (eventos, erros, web vitals, replay) e o
 * exportador OTLP do servidor (aba Logs).
 *
 * Uso:
 *   pnpm verificar:ndovu            # só verifica (nenhum dado é enviado)
 *   pnpm verificar:ndovu --teste    # envia UM log de teste e confirma a chegada
 *
 * Código de saída 1 quando existe falha — serve para CI e para o deploy.
 *
 * A leitura de 403 é a parte que importa: o Ndovu recusa OTLP de app cadastrado
 * como *frontend* ("marque-o como app de servidor"). Isso não é chave errada nem
 * falta de env — é configuração do app no backoffice.
 */

import { existsSync } from 'node:fs'
import dotenv from 'dotenv'

const ENDPOINT_OTLP_PADRAO = 'https://otlp.ndovu.solutions'
const TESTAR_ENVIO = process.argv.includes('--teste')

type Grupo = 'navegador' | 'servidor'

type Item = {
  correcao?: string
  detalhe: string
  grupo: Grupo
  ok: boolean
  titulo: string
}

const itens: Item[] = []

function anotar(item: Item): void {
  itens.push(item)
}

function mascarar(valor: string): string {
  if (valor.length <= 10) return valor
  return `${valor.slice(0, 7)}…${valor.slice(-4)}`
}

// ---------------------------------------------------------------------------
// Env
// ---------------------------------------------------------------------------

const fontes = ['.env.local', '.env'].filter((arquivo) => existsSync(arquivo))
for (const arquivo of fontes) dotenv.config({ path: arquivo })

function env(nome: string): string {
  return (process.env[nome] ?? '').trim()
}

/** Chave OTLP: `NDOVU_OTLP_API_KEY` ou o header padrão do OTel. */
function chaveOtlp(): string {
  const direta = env('NDOVU_OTLP_API_KEY')
  if (direta) return direta

  for (const par of env('OTEL_EXPORTER_OTLP_HEADERS').split(',')) {
    const [nome, ...resto] = par.split('=')
    if (nome?.trim().toLowerCase() === 'x-api-key') return resto.join('=').trim()
  }
  return ''
}

// ---------------------------------------------------------------------------
// 1. SDK do navegador — o que já existe hoje em produção
// ---------------------------------------------------------------------------

const endpointNavegador = env('NEXT_PUBLIC_NDOVU_ENDPOINT')
anotar({
  correcao: 'Defina no .env da VPS e rode o rebuild da imagem (NEXT_PUBLIC_* congela no build).',
  detalhe: endpointNavegador || 'vazia',
  grupo: 'navegador',
  ok: endpointNavegador.length > 0,
  titulo: 'NEXT_PUBLIC_NDOVU_ENDPOINT',
})

if (endpointNavegador) {
  const https = endpointNavegador.startsWith('https://')
  const local = /localhost|127\.0\.0\.1/.test(endpointNavegador)
  const producao = env('NODE_ENV') === 'production'

  anotar({
    correcao:
      'O navegador do visitante precisa alcançar o endpoint por HTTPS; localhost ou IP interno é bloqueio silencioso por mixed content.',
    detalhe: local
      ? producao
        ? 'endereço local EM PRODUÇÃO'
        : 'endereço local (ok em dev)'
      : https
        ? 'https'
        : 'não é https',
    grupo: 'navegador',
    ok: local ? !producao : https,
    titulo: 'Endpoint alcançável pelo navegador',
  })
}

const chaveNavegador = env('NEXT_PUBLIC_NDOVU_API_KEY')
anotar({
  correcao:
    'Ndovu → Apps → felpma → chave de INGESTÃO (começa com ndk_). Local: .env.local; produção: .env da VPS + rebuild.',
  detalhe: chaveNavegador ? mascarar(chaveNavegador) : 'vazia',
  grupo: 'navegador',
  ok: /^ndk_[a-z0-9]{16,}$/i.test(chaveNavegador),
  titulo: 'NEXT_PUBLIC_NDOVU_API_KEY',
})

const app = env('NEXT_PUBLIC_NDOVU_APP')
anotar({
  correcao: 'Precisa ser EXATAMENTE o campo "Nome" do app no Ndovu (hoje: felpma).',
  detalhe: app || 'vazia',
  grupo: 'navegador',
  ok: app.length > 0,
  titulo: 'NEXT_PUBLIC_NDOVU_APP',
})

if (!chaveNavegador) {
  anotar({
    detalhe: 'sem chave o SDK fica no-op e, em dev, imprime "[ndovu] desativado"',
    grupo: 'navegador',
    ok: false,
    titulo: 'SDK do navegador desligado neste ambiente',
  })
}

// ---------------------------------------------------------------------------
// 2. Exportador OTLP do servidor — o que falta para a aba Logs
// ---------------------------------------------------------------------------

const endpointOtlp = env('OTEL_EXPORTER_OTLP_ENDPOINT') || ENDPOINT_OTLP_PADRAO
const chaveServidor = chaveOtlp()

anotar({
  correcao:
    'Crie um app de SERVIDOR no Ndovu e use a chave dele. A chave do navegador serve para eventos, não para OTLP.',
  detalhe: chaveServidor ? mascarar(chaveServidor) : 'vazia',
  grupo: 'servidor',
  ok: chaveServidor.length > 0,
  titulo: 'Chave OTLP (NDOVU_OTLP_API_KEY ou header x-api-key)',
})

anotar({
  detalhe: endpointOtlp,
  grupo: 'servidor',
  ok: endpointOtlp.startsWith('https://'),
  titulo: 'Endpoint OTLP',
})

const servico = env('OTEL_SERVICE_NAME') || 'felpma-site'
anotar({ detalhe: servico, grupo: 'servidor', ok: true, titulo: 'OTEL_SERVICE_NAME' })

const nivel = env('NDOVU_OTLP_NIVEL') || 'warn'
anotar({
  detalhe: `${nivel} (info | warn | error)`,
  grupo: 'servidor',
  ok: ['info', 'warn', 'error'].includes(nivel),
  titulo: 'NDOVU_OTLP_NIVEL',
})

// ---------------------------------------------------------------------------
// 3. Prova viva contra o Ndovu
// ---------------------------------------------------------------------------

const urlLogs = endpointOtlp.endsWith('/v1/logs')
  ? endpointOtlp
  : `${endpointOtlp.replace(/\/+$/, '')}/v1/logs`

const cabecalhos: Record<string, string> = { 'Content-Type': 'application/json' }
if (chaveServidor) cabecalhos['x-api-key'] = chaveServidor

try {
  const resposta = await fetch(urlLogs, {
    method: 'POST',
    headers: cabecalhos,
    body: JSON.stringify(TESTAR_ENVIO ? corpoDeTeste(servico) : { resourceLogs: [] }),
    signal: AbortSignal.timeout(12_000),
  })
  const texto = (await resposta.text().catch(() => '')).slice(0, 300)

  if (resposta.ok) {
    anotar({
      detalhe: `${resposta.status} — ${TESTAR_ENVIO ? 'log de teste aceito' : 'credencial e app válidos'}`,
      grupo: 'servidor',
      ok: true,
      titulo: 'POST /v1/logs',
    })
  } else if (resposta.status === 401) {
    anotar({
      correcao: 'Chave ausente, inválida ou revogada. Gere outra no backoffice do Ndovu.',
      detalhe: `401 — ${texto}`,
      grupo: 'servidor',
      ok: false,
      titulo: 'POST /v1/logs',
    })
  } else if (resposta.status === 403 && /não aceita OTLP/i.test(texto)) {
    anotar({
      correcao:
        'No Ndovu, marque o app como "app de servidor" ou cadastre um app de servidor separado (ex.: felpma-servidor) e use a chave dele. App de frontend não aceita OTLP.',
      detalhe: `403 — ${texto}`,
      grupo: 'servidor',
      ok: false,
      titulo: 'POST /v1/logs',
    })
  } else if (resposta.status === 404) {
    anotar({
      correcao: 'Confira OTEL_EXPORTER_OTLP_ENDPOINT (padrão: https://otlp.ndovu.solutions).',
      detalhe: `404 — ${texto}`,
      grupo: 'servidor',
      ok: false,
      titulo: 'POST /v1/logs',
    })
  } else {
    anotar({
      detalhe: `${resposta.status} — ${texto || 'sem corpo'}`,
      grupo: 'servidor',
      ok: false,
      titulo: 'POST /v1/logs',
    })
  }
} catch (erro) {
  anotar({
    correcao: 'Confira DNS/egress da máquina e se o endpoint responde por HTTPS.',
    detalhe: erro instanceof Error ? erro.message : String(erro),
    grupo: 'servidor',
    ok: false,
    titulo: 'POST /v1/logs',
  })
}

// ---------------------------------------------------------------------------
// Relatório
// ---------------------------------------------------------------------------

function corpoDeTeste(nomeServico: string) {
  const agora = `${Date.now()}000000`
  return {
    resourceLogs: [
      {
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: nomeServico } },
            { key: 'deployment.environment', value: { stringValue: 'verificacao' } },
          ],
        },
        scopeLogs: [
          {
            scope: { name: 'felpma-verificacao', version: '1.0.0' },
            logRecords: [
              {
                timeUnixNano: agora,
                severityNumber: 9,
                severityText: 'INFO',
                body: { stringValue: 'verificação de integração OTLP (pode apagar)' },
                attributes: [{ key: 'origem', value: { stringValue: 'pnpm verificar:ndovu' } }],
              },
            ],
          },
        ],
      },
    ],
  }
}

const titulos = {
  navegador: 'Navegador — eventos, erros, web vitals e replay',
  servidor: 'Servidor — aba Logs, via OTLP',
}

console.log('\nNdovu — verificação de configuração')
console.log(`fontes de env: ${fontes.length ? fontes.join(', ') : 'process.env'}\n`)

for (const grupo of ['navegador', 'servidor'] as const) {
  console.log(titulos[grupo])
  for (const item of itens.filter((i) => i.grupo === grupo)) {
    console.log(`  ${item.ok ? 'OK   ' : 'FALHA'} ${item.titulo}: ${item.detalhe}`)
    if (!item.ok && item.correcao) console.log(`        └─ ${item.correcao}`)
  }
  console.log()
}

const falhas = itens.filter((item) => !item.ok)
console.log(`${itens.length - falhas.length}/${itens.length} verificações ok`)
if (falhas.length) {
  console.log('\nCadeia do NEXT_PUBLIC_* (o que mais falha em produção):')
  console.log('  .env da VPS → build.args no docker-compose.prod.yml → ARG/ENV no Dockerfile → bundle')
  console.log('  restart NÃO atualiza NEXT_PUBLIC_*: precisa de --build.\n')
}

process.exit(falhas.length === 0 ? 0 : 1)
