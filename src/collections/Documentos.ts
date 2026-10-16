import type { CollectionConfig } from 'payload'
import { authenticated } from '../access'
import { revalidateHooks } from '../hooks/revalidate'
import { CATEGORIAS_DOCUMENTO } from '../lib/constants'

/** PDFs e arquivos oficiais: estatuto, regulamentos, editais, prestação de contas, súmulas… */
export const Documentos: CollectionConfig = {
  slug: 'documentos',
  labels: { singular: 'Documento', plural: 'Documentos' },
  admin: {
    useAsTitle: 'titulo',
    group: 'Arquivos',
    defaultColumns: ['titulo', 'categoria', 'ano', 'publico', 'updatedAt'],
  },
  access: {
    read: ({ req: { user } }) => (user ? true : { publico: { equals: true } }),
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  hooks: revalidateHooks,
  defaultSort: '-dataPublicacao',
  fields: [
    { name: 'titulo', type: 'text', required: true },
    {
      type: 'row',
      fields: [
        {
          name: 'categoria',
          type: 'select',
          required: true,
          options: [...CATEGORIAS_DOCUMENTO],
          admin: { width: '50%' },
        },
        {
          name: 'ano',
          type: 'number',
          admin: {
            width: '25%',
            description: 'Ano de referência (prestação de contas, temporada…)',
          },
        },
        {
          name: 'dataPublicacao',
          label: 'Publicado em',
          type: 'date',
          defaultValue: () => new Date().toISOString(),
          admin: {
            width: '25%',
            date: { pickerAppearance: 'dayOnly', displayFormat: 'dd/MM/yyyy' },
          },
        },
      ],
    },
    { name: 'descricao', label: 'Descrição', type: 'textarea' },
    {
      name: 'publico',
      label: 'Visível no site',
      type: 'checkbox',
      defaultValue: true,
      admin: { position: 'sidebar' },
    },
  ],
  upload: {
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
  },
}
