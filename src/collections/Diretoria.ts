import type { CollectionConfig } from 'payload'
import { anyone, authenticated } from '../access'
import { revalidateHooks } from '../hooks/revalidate'
import { GRUPOS_DIRETORIA } from '../lib/constants'

/** Membros exibidos na página "A Federação". Não é a área administrativa da diretoria. */
export const Diretoria: CollectionConfig = {
  slug: 'diretoria',
  labels: { singular: 'Membro da diretoria', plural: 'Diretoria e comissões' },
  admin: {
    useAsTitle: 'nome',
    group: 'Federação',
    defaultColumns: ['nome', 'cargo', 'grupo', 'ordem'],
  },
  access: { read: anyone, create: authenticated, update: authenticated, delete: authenticated },
  hooks: revalidateHooks,
  defaultSort: 'ordem',
  fields: [
    { name: 'nome', type: 'text', required: true },
    {
      type: 'row',
      fields: [
        {
          name: 'cargo',
          type: 'text',
          required: true,
          admin: { width: '50%', placeholder: 'Ex.: Presidente' },
        },
        {
          name: 'grupo',
          type: 'select',
          required: true,
          defaultValue: 'diretoria',
          options: [...GRUPOS_DIRETORIA],
          admin: { width: '50%' },
        },
      ],
    },
    { name: 'foto', type: 'upload', relationTo: 'media' },
    { name: 'mandato', type: 'text', admin: { placeholder: 'Ex.: 2025–2028' } },
    { name: 'email', label: 'E-mail institucional', type: 'email' },
    {
      name: 'ordem',
      type: 'number',
      defaultValue: 10,
      admin: { position: 'sidebar', description: 'Menor aparece primeiro.' },
    },
  ],
}
