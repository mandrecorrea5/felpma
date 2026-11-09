import 'server-only'
import { cookies } from 'next/headers'
import { AuthenticationError, LockedAuth, UnverifiedEmail } from 'payload'
import type { Atleta } from '@/payload-types'
import { getPayloadClient } from '@/lib/payload'

/**
 * Sessão do atleta.
 *
 * O cookie do Payload (`payload-token`) é ÚNICO para todas as coleções de
 * autenticação. Se o atleta usasse o login nativo, entrar no site derrubaria a
 * sessão do painel (e vice-versa). Por isso o token do atleta mora em um cookie
 * próprio — mesmo JWT, ciclo de vida separado.
 */
export const COOKIE_ATLETA = 'felpma-atleta'
export const SESSAO_SEGUNDOS = 60 * 60 * 8

const opcoesCookie = () => ({
  httpOnly: true,
  maxAge: SESSAO_SEGUNDOS,
  path: '/',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
})

export async function definirSessao(token: string): Promise<void> {
  const store = await cookies()
  store.set(COOKIE_ATLETA, token, opcoesCookie())
}

export async function limparSessao(): Promise<void> {
  const store = await cookies()
  store.delete(COOKIE_ATLETA)
}

/**
 * Quem está logado. As headers são montadas à mão de propósito: repassar as do
 * navegador deixaria o `payload-token` do painel ser aceito aqui e um editor
 * apareceria como atleta. `DisableAutologin` evita o login automático de dev.
 */
export async function atletaAtual(): Promise<Atleta | null> {
  const token = (await cookies()).get(COOKIE_ATLETA)?.value
  if (!token) return null

  const payload = await getPayloadClient()
  const headers = new Headers({
    Authorization: `JWT ${token}`,
    DisableAutologin: 'true',
  })

  try {
    const { user } = await payload.auth({ headers })
    if (!user || user.collection !== 'atletas') return null
    const atleta = user as Atleta
    // Só conta ativa navega: pendente aguarda aprovação e bloqueada foi suspensa.
    if (atleta.status !== 'ativo') return null
    return atleta
  } catch {
    return null
  }
}

export type ResultadoLogin = { erro: string; ok: false } | { ok: true }

/**
 * Login por e-mail e senha. Mensagens de erro genéricas para não permitir
 * descobrir quais e-mails existem (enumeração de contas).
 */
export async function entrar(email: string, senha: string): Promise<ResultadoLogin> {
  const payload = await getPayloadClient()

  try {
    const resultado = await payload.login({
      collection: 'atletas',
      data: { email: email.trim().toLowerCase(), password: senha },
      depth: 0,
    })

    if (!resultado.token) {
      return { ok: false, erro: 'Não foi possível entrar agora. Tente novamente em instantes.' }
    }

    // O login em si é válido, mas o acesso depende da aprovação da federação.
    const atleta = resultado.user as Atleta | undefined
    if (!atleta || atleta.status !== 'ativo') {
      if (atleta?.id) await revogarTodasAsSessoes(atleta.id)
      return {
        ok: false,
        erro:
          atleta?.status === 'pendente'
            ? 'Sua conta ainda não foi ativada. Abra o e-mail que enviamos e clique no link de ativação.'
            : 'Sua conta está bloqueada. Fale com a federação pelo canal de contato.',
      }
    }

    await definirSessao(resultado.token)
    return { ok: true }
  } catch (e) {
    if (e instanceof UnverifiedEmail) {
      return {
        ok: false,
        erro: 'Ative sua conta pelo link que enviamos por e-mail. Confira também a caixa de spam.',
      }
    }
    if (e instanceof LockedAuth) {
      return {
        ok: false,
        erro: 'Muitas tentativas. Aguarde alguns minutos antes de tentar de novo.',
      }
    }
    if (e instanceof AuthenticationError) {
      return { ok: false, erro: 'E-mail ou senha incorretos.' }
    }
    console.error('Falha no login do atleta', e)
    return { ok: false, erro: 'Não foi possível entrar agora. Tente novamente em instantes.' }
  }
}

/** Sai deste dispositivo; a sessão correspondente também é revogada no banco. */
export async function sair(): Promise<void> {
  const atleta = await atletaAtual()

  if (atleta) {
    const sid = (atleta as Atleta & { _sid?: string })._sid
    if (sid) {
      try {
        const payload = await getPayloadClient()
        const restantes = (atleta.sessions ?? []).filter((s) => s.id !== sid)
        await payload.update({
          collection: 'atletas',
          id: atleta.id,
          data: { sessions: restantes },
          overrideAccess: true,
        })
      } catch (e) {
        console.error('Falha ao revogar a sessão do atleta', e)
      }
    }
  }

  await limparSessao()
}

/** Revoga todas as sessões (troca de senha, "sair de todos os dispositivos"). */
export async function revogarTodasAsSessoes(id: number | string): Promise<void> {
  const payload = await getPayloadClient()
  await payload.update({
    collection: 'atletas',
    id,
    data: { sessions: [] },
    overrideAccess: true,
  })
}
