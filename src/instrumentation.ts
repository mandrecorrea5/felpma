/**
 * Instrumentação de servidor do Next.
 *
 * `register` roda uma vez quando uma instância do servidor sobe — é o único
 * ponto garantido para ligar trabalho de fundo no processo. O import é
 * dinâmico e condicionado ao runtime Node (o Next chama `register` também no
 * edge); ver node_modules/next/dist/docs → instrumentation.
 *
 * Aqui moram duas coisas:
 * - o agendador do expurgo LGPD, que agenda e retorna na hora;
 * - a observabilidade do processo (logs → Ndovu via OTLP), que só liga quando
 *   `NDOVU_OTLP_API_KEY` existe. Sem a chave o site se comporta como antes.
 */

import type { Instrumentation } from 'next'

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { iniciarObservabilidade } = await import('./lib/observabilidade/servidor')
    const { agendarExpurgo } = await import('./lib/lgpd/expurgo-agenda')

    // Antes do expurgo: o que o agendador logar já sai com contexto de serviço.
    iniciarObservabilidade()
    agendarExpurgo()
  }
}

/**
 * Erros de requisição do App Router (render, rota e server action). O Next
 * aguarda a promessa, então o registro chega ao Ndovu antes do fim da resposta.
 * O caminho é reduzido ao padrão da rota antes de sair (ver `servidor.ts`).
 */
export const onRequestError: Instrumentation.onRequestError = async (
  erro,
  requisicao,
  contexto,
) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { registrarErroDeRequisicao } = await import('./lib/observabilidade/servidor')
  await registrarErroDeRequisicao(erro, requisicao, contexto)
}
