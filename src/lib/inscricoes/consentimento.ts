import 'server-only'
import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { pseudonimizar } from '@/lib/crypto/campos'

/** Prova de consentimento (LGPD art. 8º, §1º): o que foi exibido e quando. */
export const hashTexto = (texto: string): string =>
  createHash('sha256').update(texto.trim()).digest('hex')

export type ConsentimentoDoFormulario = {
  finalidade?: null | string
  identificador?: null | string
  obrigatorio?: boolean | null
  texto?: null | string
}

export type ProvaConsentimento = {
  aceito: boolean
  aceitoEm: string
  finalidade?: string
  identificador: string
  ipHash?: string
  obrigatorio: boolean
  texto?: string
  textoHash: string
  versao: string
}

/** Origem da requisição, já pseudonimizada — nunca guardamos IP em claro. */
export async function origemDaRequisicao(): Promise<{ ipHash: string; userAgentHash: string }> {
  const h = await headers()
  const encaminhado = h.get('x-forwarded-for')
  const ip = encaminhado?.split(',')[0]?.trim() || h.get('x-real-ip') || ''
  const userAgent = h.get('user-agent') || ''
  return {
    ipHash: ip ? pseudonimizar(ip) : '',
    userAgentHash: userAgent ? pseudonimizar(userAgent) : '',
  }
}

export function provaConsentimento(args: {
  aceito: boolean
  consentimento: ConsentimentoDoFormulario
  ipHash: string
  agora?: Date
  userAgentHash?: string
  versaoAviso: string
}): ProvaConsentimento {
  const texto = args.consentimento.texto ?? ''
  return {
    aceito: args.aceito,
    aceitoEm: (args.agora ?? new Date()).toISOString(),
    finalidade: args.consentimento.finalidade ?? undefined,
    identificador: args.consentimento.identificador ?? '',
    obrigatorio: Boolean(args.consentimento.obrigatorio),
    texto: texto || undefined,
    textoHash: hashTexto(`${args.versaoAviso}:${texto}`),
    versao: args.versaoAviso,
    ...(args.ipHash ? { ipHash: args.ipHash } : {}),
  }
}
