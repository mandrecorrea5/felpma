import type { CollectionConfig } from 'payload'
import { anyone, authenticated } from '../access'
import { slugField } from '../fields/slug'
import { revalidateHooks } from '../hooks/revalidate'
import { STATUS_COMPETICAO, TIPOS_COMPETICAO } from '../lib/constants'

const dayOnly = { pickerAppearance: 'dayOnly' as const, displayFormat: 'dd/MM/yyyy' }

/** Competições, cursos e eventos — alimenta Calendário, Eventos, Home e Resultados. */
export const Competicoes: CollectionConfig = {
  slug: 'competicoes',
  typescript: { interface: 'Competicao' },
  labels: { singular: 'Competição / evento', plural: 'Competições e eventos' },
  admin: {
    useAsTitle: 'nome',
    group: 'Competições',
    defaultColumns: ['nome', 'tipo', 'dataInicio', 'cidade', 'status'],
    listSearchableFields: ['nome', 'cidade'],
    preview: (doc) => (doc?.slug ? `/calendario/${doc.slug}` : null),
  },
  access: { read: anyone, create: authenticated, update: authenticated, delete: authenticated },
  hooks: revalidateHooks,
  defaultSort: 'dataInicio',
  fields: [
    { name: 'nome', type: 'text', required: true },
    {
      type: 'row',
      fields: [
        {
          name: 'tipo',
          type: 'select',
          required: true,
          options: [...TIPOS_COMPETICAO],
          admin: { width: '50%' },
        },
        {
          name: 'area',
          label: 'Área (para cursos e eventos)',
          type: 'text',
          admin: {
            width: '50%',
            description: 'Ex.: Arbitragem, Técnicos, Base.',
            condition: (data) => data?.tipo === 'curso' || data?.tipo === 'evento',
          },
        },
      ],
    },
    {
      name: 'categorias',
      label: 'Categorias',
      type: 'text',
      admin: { description: 'Ex.: "Sub-15 a Sênior", "Sub-17", "Arbitragem".' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'dataInicio',
          label: 'Início',
          type: 'date',
          required: true,
          admin: { width: '33%', date: dayOnly },
        },
        { name: 'dataFim', label: 'Término', type: 'date', admin: { width: '33%', date: dayOnly } },
        {
          name: 'inscricoesAte',
          label: 'Inscrições até',
          type: 'date',
          admin: { width: '33%', date: dayOnly },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'local', label: 'Local (ginásio, CT…)', type: 'text', admin: { width: '50%' } },
        { name: 'cidade', type: 'text', required: true, admin: { width: '30%' } },
        {
          name: 'uf',
          label: 'UF',
          type: 'text',
          defaultValue: 'MA',
          maxLength: 2,
          admin: { width: '20%' },
        },
      ],
    },
    {
      name: 'pesagem',
      label: 'Pesagem oficial',
      type: 'text',
      admin: { description: 'Data, horário e local.' },
    },
    { name: 'imagem', type: 'upload', relationTo: 'media' },
    { name: 'descricao', label: 'Informações', type: 'richText' },
    {
      type: 'row',
      fields: [
        {
          name: 'regulamento',
          type: 'upload',
          relationTo: 'documentos',
          admin: { width: '50%' },
        },
        {
          name: 'linkInscricao',
          label: 'Link de inscrição',
          type: 'text',
          admin: { width: '50%', description: 'Formulário externo ou página de inscrição.' },
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'auto',
      options: [...STATUS_COMPETICAO],
      admin: {
        position: 'sidebar',
        description:
          'Em "Automático", o site mostra Inscrições abertas / Em breve / Encerrado pelas datas.',
      },
    },
    {
      name: 'destaqueHome',
      label: 'Destaque na página inicial',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Sem destaque marcado, a home mostra a próxima competição estadual.',
      },
    },
    slugField('nome'),
  ],
}
