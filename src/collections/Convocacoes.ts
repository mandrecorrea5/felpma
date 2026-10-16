import type { CollectionConfig } from 'payload'
import { anyone, authenticated } from '../access'
import { revalidateHooks } from '../hooks/revalidate'
import { TIPOS_CONVOCACAO } from '../lib/constants'

export const Convocacoes: CollectionConfig = {
  slug: 'convocacoes',
  typescript: { interface: 'Convocacao' },
  labels: { singular: 'Convocação', plural: 'Convocações' },
  admin: {
    useAsTitle: 'titulo',
    group: 'Competições',
    defaultColumns: ['titulo', 'tipo', 'competicao', 'dataPublicacao'],
  },
  access: { read: anyone, create: authenticated, update: authenticated, delete: authenticated },
  hooks: revalidateHooks,
  defaultSort: '-dataPublicacao',
  fields: [
    { name: 'titulo', label: 'Título', type: 'text', required: true },
    {
      type: 'row',
      fields: [
        {
          name: 'tipo',
          type: 'select',
          required: true,
          options: [...TIPOS_CONVOCACAO],
          admin: { width: '50%' },
        },
        {
          name: 'dataPublicacao',
          label: 'Publicada em',
          type: 'date',
          required: true,
          defaultValue: () => new Date().toISOString(),
          admin: {
            width: '50%',
            date: { pickerAppearance: 'dayOnly', displayFormat: 'dd/MM/yyyy' },
          },
        },
      ],
    },
    {
      name: 'detalhe',
      type: 'text',
      admin: { description: 'Linha de apoio. Ex.: "12 atletas · 2 técnicos".' },
    },
    { name: 'competicao', label: 'Competição', type: 'relationship', relationTo: 'competicoes' },
    {
      name: 'documento',
      label: 'Documento oficial (PDF)',
      type: 'upload',
      relationTo: 'documentos',
      required: true,
    },
    {
      name: 'prazoConfirmacao',
      label: 'Prazo para confirmação',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'dd/MM/yyyy' } },
    },
  ],
}
