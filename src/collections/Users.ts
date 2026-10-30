import type { CollectionConfig } from 'payload'
import { authenticated, doPainel, isAdmin, isAdminField, isAdminUser } from '../access'

/** Usuários do painel (quem edita o site). Não é a área do filiado. */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Usuário do painel', plural: 'Usuários do painel' },
  admin: {
    useAsTitle: 'nome',
    defaultColumns: ['nome', 'email', 'role'],
    group: 'Sistema',
  },
  auth: true,
  access: {
    read: authenticated,
    create: isAdmin,
    delete: isAdmin,
    // `doPainel` não é redundante: sem ele, o id de um atleta que coincida com o
    // id de um usuário do painel passaria no teste `user.id === id` (IDOR entre
    // coleções de autenticação diferentes).
    update: ({ req: { user }, id }) =>
      isAdminUser(user) || (doPainel(user) && String(user?.id) === String(id)),
    admin: ({ req: { user } }) => doPainel(user),
  },
  fields: [
    { name: 'nome', type: 'text', required: true },
    {
      name: 'role',
      label: 'Perfil',
      type: 'select',
      required: true,
      defaultValue: 'editor',
      saveToJWT: true,
      access: { create: isAdminField, update: isAdminField },
      options: [
        { label: 'Administrador', value: 'admin' },
        { label: 'Editor de conteúdo', value: 'editor' },
      ],
      admin: {
        description: 'Editores publicam conteúdo; administradores também gerenciam usuários.',
      },
    },
  ],
}
