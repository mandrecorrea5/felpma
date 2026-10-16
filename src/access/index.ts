import type { Access, FieldAccess } from 'payload'

export const anyone: Access = () => true

export const authenticated: Access = ({ req: { user } }) => Boolean(user)

export const isAdmin: Access = ({ req: { user } }) => user?.role === 'admin'

export const isAdminField: FieldAccess = ({ req: { user } }) => user?.role === 'admin'

/** Visitantes veem só o que está publicado; usuários do painel veem rascunhos também. */
export const publishedOrAuthenticated: Access = ({ req: { user } }) => {
  if (user) return true
  return { _status: { equals: 'published' } }
}
