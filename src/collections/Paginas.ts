import type { CollectionConfig } from 'payload'
import { authenticated, publishedOrAuthenticated } from '../access'
import { slugField } from '../fields/slug'
import { revalidateHooks } from '../hooks/revalidate'

/** Páginas de texto livre: política de privacidade, código de ética, antidopagem… */
export const Paginas: CollectionConfig = {
  slug: 'paginas',
  labels: { singular: 'Página', plural: 'Páginas avulsas' },
  admin: {
    useAsTitle: 'titulo',
    group: 'Conteúdo',
    defaultColumns: ['titulo', 'slug', '_status'],
    preview: (doc) => (doc?.slug ? `/institucional/${doc.slug}` : null),
  },
  versions: { drafts: true },
  access: {
    read: publishedOrAuthenticated,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  hooks: revalidateHooks,
  fields: [
    { name: 'titulo', label: 'Título', type: 'text', required: true },
    { name: 'resumo', type: 'textarea' },
    { name: 'conteudo', label: 'Conteúdo', type: 'richText', required: true },
    slugField('titulo'),
  ],
}
