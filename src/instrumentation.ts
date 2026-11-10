/**
 * Instrumentação de servidor do Next.
 *
 * `register` roda uma vez quando uma instância do servidor sobe — é o único
 * ponto garantido para ligar trabalho de fundo no processo. O import é
 * dinâmico e condicionado ao runtime Node (o Next chama `register` também no
 * edge); ver node_modules/next/dist/docs → instrumentation.
 *
 * Aqui mora só o agendador do expurgo LGPD. Ele agenda e retorna na hora: o
 * `register` precisa completar antes do servidor aceitar requisição.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { agendarExpurgo } = await import('./lib/lgpd/expurgo-agenda')
    agendarExpurgo()
  }
}
