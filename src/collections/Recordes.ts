import type { CollectionConfig } from 'payload'
import { anyone, authenticated } from '../access'
import { revalidateHooks } from '../hooks/revalidate'
import { CATEGORIAS_IDADE, MOVIMENTOS, SEXOS, labelOf } from '../lib/constants'

/** Recordes estaduais vigentes, por idade, sexo, categoria de peso e movimento. */
export const Recordes: CollectionConfig = {
  slug: 'recordes',
  labels: { singular: 'Recorde estadual', plural: 'Recordes estaduais' },
  admin: {
    useAsTitle: 'rotulo',
    group: 'Competições',
    defaultColumns: ['rotulo', 'marca', 'atleta', 'data'],
    description:
      'Cadastre apenas o recorde vigente de cada categoria/movimento. Ao ser quebrado, edite o registro.',
  },
  access: { read: anyone, create: authenticated, update: authenticated, delete: authenticated },
  hooks: revalidateHooks,
  defaultSort: 'categoriaIdade',
  fields: [
    {
      name: 'rotulo',
      type: 'text',
      admin: { hidden: true },
      hooks: {
        beforeChange: [
          ({ siblingData }) =>
            [
              labelOf(CATEGORIAS_IDADE, siblingData?.categoriaIdade),
              siblingData?.sexo === 'F' ? 'Fem.' : 'Masc.',
              siblingData?.categoriaPeso,
              labelOf(MOVIMENTOS, siblingData?.movimento),
            ]
              .filter(Boolean)
              .join(' · '),
        ],
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'categoriaIdade',
          label: 'Idade',
          type: 'select',
          required: true,
          options: [...CATEGORIAS_IDADE],
          admin: { width: '25%' },
        },
        {
          name: 'sexo',
          type: 'select',
          required: true,
          options: [...SEXOS],
          admin: { width: '25%' },
        },
        {
          name: 'categoriaPeso',
          label: 'Categoria de peso',
          type: 'text',
          required: true,
          admin: { width: '25%', placeholder: 'Ex.: 61 kg' },
        },
        {
          name: 'movimento',
          type: 'select',
          required: true,
          options: [...MOVIMENTOS],
          admin: { width: '25%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'marca',
          label: 'Marca (kg)',
          type: 'number',
          required: true,
          admin: { width: '25%' },
        },
        { name: 'atleta', type: 'text', required: true, admin: { width: '40%' } },
        { name: 'clube', label: 'Clube / CT', type: 'text', admin: { width: '35%' } },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'data',
          type: 'date',
          required: true,
          admin: {
            width: '33%',
            date: { pickerAppearance: 'dayOnly', displayFormat: 'dd/MM/yyyy' },
          },
        },
        { name: 'competicao', label: 'Competição', type: 'text', admin: { width: '67%' } },
      ],
    },
  ],
}
