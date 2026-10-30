import { randomBytes } from 'node:crypto'

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Protocolo curto, legível por telefone: FEL-2027-4KQ9XZ. */
export const gerarProtocolo = (ano = new Date().getFullYear()): string => {
  let codigo = ''
  for (const byte of randomBytes(6)) codigo += ALFABETO[byte % ALFABETO.length]
  return `FEL-${ano}-${codigo}`
}
