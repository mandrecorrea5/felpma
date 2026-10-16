import type { CollectionConfig } from 'payload'
import { authenticated, isAdmin, isAdminField } from '../access'

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
    update: ({ req: { user }, id }) => user?.role === 'admin' || user?.id === id,
    admin: ({ req: { user } }) => Boolean(user),
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
