import type { CollectionConfig } from 'payload'
import { authenticated, publishedOrAuthenticated } from '../access'
import { slugField } from '../fields/slug'
import { revalidateHooks } from '../hooks/revalidate'
import { CATEGORIAS_NOTICIA } from '../lib/constants'

export const Noticias: CollectionConfig = {
  slug: 'noticias',
  labels: { singular: 'Notícia', plural: 'Notícias' },
  admin: {
    useAsTitle: 'titulo',
    group: 'Conteúdo',
    defaultColumns: ['titulo', 'categoria', 'dataPublicacao', '_status'],
    preview: (doc) => (doc?.slug ? `/noticias/${doc.slug}` : null),
  },
  versions: { drafts: true, maxPerDoc: 20 },
  access: {
    read: publishedOrAuthenticated,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  hooks: revalidateHooks,
  defaultSort: '-dataPublicacao',
  fields: [
    { name: 'titulo', label: 'Título', type: 'text', required: true },
    {
      name: 'resumo',
      type: 'textarea',
      required: true,
      maxLength: 280,
      admin: { description: 'Duas ou três linhas. Aparece na listagem e no compartilhamento.' },
    },
    { name: 'capa', type: 'upload', relationTo: 'media' },
    { name: 'conteudo', label: 'Conteúdo', type: 'richText', required: true },
    {
      name: 'categoria',
      type: 'select',
      required: true,
      options: [...CATEGORIAS_NOTICIA],
      admin: { position: 'sidebar' },
    },
    {
      name: 'dataPublicacao',
      label: 'Data de publicação',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime', displayFormat: 'dd/MM/yyyy HH:mm' },
      },
    },
    {
      name: 'destaque',
      label: 'Destaque na página inicial',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'A notícia destacada mais recente vira a manchete da home.',
      },
    },
    slugField('titulo'),
  ],
}
