import type { CollectionConfig } from 'payload'
import { authenticated } from '../access'

/**
 * Curtidas de notícia — uma por navegador, sem conta.
 *
 * A `chave` é um UUID guardado em cookie httpOnly, nunca o IP nem o e-mail. A
 * criação/remoção passa só pela server action (overrideAccess); o site público
 * não lê esta coleção pela API.
 */
export const Curtidas: CollectionConfig = {
  slug: 'curtidas',
  typescript: { interface: 'Curtida' },
  labels: { singular: 'Curtida', plural: 'Curtidas' },
  admin: {
    group: 'Conteúdo',
    useAsTitle: 'chave',
    defaultColumns: ['noticia', 'chave', 'createdAt'],
    description:
      'Registro anônimo de curtidas. A chave é um cookie do navegador, não identifica a pessoa.',
  },
  access: {
    create: () => false,
    read: authenticated,
    update: () => false,
    delete: authenticated,
  },
  // O mesmo navegador não curte a mesma notícia duas vezes; a corrida entre
  // dois cliques esbarra aqui em vez de duplicar a linha.
  indexes: [{ fields: ['noticia', 'chave'], unique: true }],
  defaultSort: '-createdAt',
  fields: [
    {
      name: 'noticia',
      label: 'Notícia',
      type: 'relationship',
      relationTo: 'noticias',
      required: true,
      index: true,
    },
    {
      name: 'chave',
      label: 'Chave do navegador',
      type: 'text',
      required: true,
      index: true,
      admin: { description: 'UUID do cookie felpma-visitante. Sem dado pessoal.' },
    },
  ],
}
