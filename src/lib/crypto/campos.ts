import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto'

/**
 * Criptografia de campos pessoais (LGPD, art. 46).
 *
 * O banco e — principalmente — o backup não são confiáveis o bastante para
 * guardar CPF e dados de saúde em claro: o dump sai da VPS e vai para o R2.
 * Aqui o dado vira `enc:v1:<base64(iv|tag|cifra)>`, com AES-256-GCM.
 *
 * O prefixo `v1` é o que permite rotacionar a chave no futuro: dados antigos
 * continuam legíveis com a chave antiga enquanto são recifrados em lote.
 */

const PREFIXO = 'enc:v1:'
const TAMANHO_CHAVE = 32

let cache: Buffer | null = null

const derivarDeDesenvolvimento = (): Buffer =>
  createHash('sha256')
    .update(`felpma-dev-campos:${process.env.PAYLOAD_SECRET ?? 'sem-segredo'}`)
    .digest()

/**
 * A chave vem de `LGPD_CHAVE_CAMPOS` (32 bytes em base64). Em produção, sem a
 * variável, o app falha na primeira operação — melhor falhar alto do que gravar
 * dado sensível em claro. Em desenvolvimento, deriva do PAYLOAD_SECRET para não
 * travar o ambiente de quem está começando.
 */
const chave = (): Buffer => {
  if (cache) return cache

  const bruta = process.env.LGPD_CHAVE_CAMPOS?.trim()
  if (bruta) {
    const buffer = Buffer.from(bruta, 'base64')
    if (buffer.length !== TAMANHO_CHAVE) {
      throw new Error(
        'LGPD_CHAVE_CAMPOS inválida: gere 32 bytes em base64 (openssl rand -base64 32).',
      )
    }
    cache = buffer
    return cache
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'LGPD_CHAVE_CAMPOS não configurada. Dados pessoais não podem ser gravados em claro em produção.',
    )
  }

  cache = derivarDeDesenvolvimento()
  return cache
}

export const ehCifrado = (valor: unknown): valor is string =>
  typeof valor === 'string' && valor.startsWith(PREFIXO)

export function cifrar(texto: string): string {
  const iv = randomBytes(12)
  const cifra = createCipheriv('aes-256-gcm', chave(), iv)
  const conteudo = Buffer.concat([cifra.update(texto, 'utf8'), cifra.final()])
  const tag = cifra.getAuthTag()
  return PREFIXO + Buffer.concat([iv, tag, conteudo]).toString('base64')
}

export function decifrar(valor: string): string {
  if (!ehCifrado(valor)) return valor
  const bruto = Buffer.from(valor.slice(PREFIXO.length), 'base64')
  const iv = bruto.subarray(0, 12)
  const tag = bruto.subarray(12, 28)
  const conteudo = bruto.subarray(28)
  const decifra = createDecipheriv('aes-256-gcm', chave(), iv)
  decifra.setAuthTag(tag)
  return Buffer.concat([decifra.update(conteudo), decifra.final()]).toString('utf8')
}

/**
 * Índice cego: HMAC determinístico para buscar e impedir CPF duplicado sem
 * guardar o CPF em claro. Campo cifrado não funciona em `where` do Postgres —
 * este hash é a coluna que resolve isso.
 */
export function hashBusca(valor: string): string {
  const sal = process.env.LGPD_HASH_SALT?.trim()
  if (!sal && process.env.NODE_ENV === 'production') {
    throw new Error('LGPD_HASH_SALT não configurada.')
  }
  return createHmac('sha256', sal || `felpma-dev-hash:${process.env.PAYLOAD_SECRET ?? 'x'}`)
    .update(valor.trim().toLowerCase())
    .digest('hex')
}

/** Pseudonimização de IP/user-agent para a prova de consentimento. */
export const pseudonimizar = (valor: string): string => hashBusca(valor).slice(0, 32)
