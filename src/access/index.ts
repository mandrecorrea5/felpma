import type { Access, FieldAccess } from 'payload'

/**
 * Quem é "do painel" e quem é "do site" é decidido pela COLEÇÃO do usuário.
 *
 * O Payload usa uma única função de acesso por operação e uma única tabela de
 * sessão (`payload-token`) — ele não sabe que `atletas` e `users` são universos
 * diferentes. Sem esta checagem, qualquer usuário autenticado (inclusive um
 * atleta) passaria em todo `access` que só pergunta "tem usuário?".
 */
type Usuario = {
  collection?: null | string
  id?: number | string
  role?: null | string
}

const comoUsuario = (user: unknown): Usuario | null => (user as Usuario | null) ?? null

export const doPainel = (user?: unknown): boolean => comoUsuario(user)?.collection === 'users'

export const doAtleta = (user?: unknown): boolean => comoUsuario(user)?.collection === 'atletas'

const painelAdmin = (user?: unknown): boolean => {
  const u = comoUsuario(user)
  return u?.collection === 'users' && u.role === 'admin'
}

export const anyone: Access = () => true

/** Só quem edita o site (coleção `users`). Atleta não é operador. */
export const authenticated: Access = ({ req: { user } }) => doPainel(user)

export const isAdminUser = (user?: unknown): boolean => painelAdmin(user)

export const isAdmin: Access = ({ req: { user } }) => painelAdmin(user)

export const isAdminField: FieldAccess = ({ req: { user } }) => painelAdmin(user)

/** Visitantes veem só o que está publicado; usuários do painel veem rascunhos também. */
export const publishedOrAuthenticated: Access = ({ req: { user } }) => {
  if (doPainel(user)) return true
  return { _status: { equals: 'published' } }
}

/** O próprio atleta ou o painel. Usado nas coleções de dados pessoais. */
export const atletaOuPainel: Access = ({ req: { user } }) => {
  if (doPainel(user)) return true
  const atleta = comoUsuario(user)
  if (atleta?.collection === 'atletas') return { id: { equals: atleta.id } }
  return false
}

/** Inscrição: o atleta vê só as dele; o painel vê todas. */
export const donoDaInscricao: Access = ({ req: { user } }) => {
  if (doPainel(user)) return true
  const atleta = comoUsuario(user)
  if (atleta?.collection === 'atletas') return { atleta: { equals: atleta.id } }
  return false
}
