import type { CollectionConfig } from 'payload'
import { anyone, authenticated } from '../access'
import { slugField } from '../fields/slug'
import { revalidateHooks } from '../hooks/revalidate'
import { CATEGORIAS_IDADE, SEXOS } from '../lib/constants'

/**
 * Resultado oficial de uma competição.
 * A tabela de atletas é opcional: dá para publicar só a súmula em PDF.
 */
export const Resultados: CollectionConfig = {
  slug: 'resultados',
  labels: { singular: 'Resultado', plural: 'Resultados' },
  admin: {
    useAsTitle: 'titulo',
    group: 'Competições',
    defaultColumns: ['titulo', 'competicao', 'data'],
    preview: (doc) => (doc?.slug ? `/resultados/${doc.slug}` : null),
  },
  access: { read: anyone, create: authenticated, update: authenticated, delete: authenticated },
  hooks: revalidateHooks,
  defaultSort: '-data',
  fields: [
    { name: 'titulo', label: 'Título', type: 'text', required: true },
    {
      type: 'row',
      fields: [
        {
          name: 'competicao',
          label: 'Competição',
          type: 'relationship',
          relationTo: 'competicoes',
          admin: { width: '50%' },
        },
        {
          name: 'data',
          type: 'date',
          required: true,
          admin: {
            width: '25%',
            date: { pickerAppearance: 'dayOnly', displayFormat: 'dd/MM/yyyy' },
          },
        },
        { name: 'cidade', type: 'text', admin: { width: '25%' } },
      ],
    },
    { name: 'sumula', label: 'Súmula oficial (PDF)', type: 'upload', relationTo: 'documentos' },
    { name: 'observacoes', label: 'Observações', type: 'textarea' },
    {
      name: 'linhas',
      label: 'Resultados por atleta',
      type: 'array',
      admin: {
        description:
          'Uma linha por atleta. Marcas em kg; deixe 0 para tentativa sem sucesso (bomb out).',
        initCollapsed: true,
        components: { RowLabel: '@/components/admin/ResultadoRowLabel#ResultadoRowLabel' },
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'sexo',
              type: 'select',
              required: true,
              options: [...SEXOS],
              admin: { width: '20%' },
            },
            {
              name: 'categoriaIdade',
              label: 'Idade',
              type: 'select',
              required: true,
              options: [...CATEGORIAS_IDADE],
              admin: { width: '25%' },
            },
            {
              name: 'categoriaPeso',
              label: 'Categoria de peso',
              type: 'text',
              required: true,
              admin: { width: '25%', placeholder: 'Ex.: 61 kg, +109 kg' },
            },
            { name: 'colocacao', label: 'Colocação', type: 'number', admin: { width: '15%' } },
            {
              name: 'pesoCorporal',
              label: 'Peso corporal',
              type: 'number',
              admin: { width: '15%' },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'atleta', type: 'text', required: true, admin: { width: '40%' } },
            { name: 'clube', label: 'Clube / CT', type: 'text', admin: { width: '30%' } },
            { name: 'arranco', type: 'number', admin: { width: '10%' } },
            { name: 'arremesso', type: 'number', admin: { width: '10%' } },
            {
              name: 'total',
              type: 'number',
              admin: { width: '10%', description: 'Calculado se vazio.' },
              hooks: {
                beforeChange: [
                  ({ value, siblingData }) => {
                    if (typeof value === 'number' && value > 0) return value
                    const a = Number(siblingData?.arranco) || 0
                    const b = Number(siblingData?.arremesso) || 0
                    return a > 0 && b > 0 ? a + b : 0
                  },
                ],
              },
            },
          ],
        },
      ],
    },
    slugField('titulo'),
  ],
}
