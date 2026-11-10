/**
 * Rate limit simples em memória.
 *
 * Suficiente para um único container (o deploy atual). Não sobrevive a restart
 * nem funciona com múltiplas réplicas — quando isso mudar, trocar por Redis.
 * Nunca guarda o IP em claro: a chave é sempre um hash.
 */
type Janela = { contagem: number; expira: number }

const janelas = new Map<string, Janela>()

/** Teto de chaves vivas; acima disso, uma varredura descarta as expiradas. */
const LIMITE_CHAVES = 10_000

const varrerExpiradas = (agora: number): void => {
  for (const [chave, janela] of janelas) {
    if (janela.expira <= agora) janelas.delete(chave)
  }
}

export function limitar(chave: string, maximo: number, janelaMs: number): boolean {
  const agora = Date.now()
  const atual = janelas.get(chave)

  // Sem isso o Map cresce para sempre com chaves de atacante (um IP novo por
  // requisição): vazamento de memória lento, mas certo.
  if (janelas.size > LIMITE_CHAVES) varrerExpiradas(agora)

  if (!atual || atual.expira <= agora) {
    janelas.set(chave, { contagem: 1, expira: agora + janelaMs })
    return true
  }

  if (atual.contagem >= maximo) return false

  atual.contagem += 1
  return true
}
