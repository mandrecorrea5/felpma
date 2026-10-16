import type { CollectionConfig } from 'payload'
import { authenticated } from '../access'
import { slugField } from '../fields/slug'
import { revalidateHooks } from '../hooks/revalidate'
import { TAGS_CENTRO } from '../lib/constants'

export const Centros: CollectionConfig = {
  slug: 'centros',
  labels: { singular: 'Centro de Treinamento', plural: 'Centros de Treinamento' },
  admin: {
    useAsTitle: 'nome',
    group: 'Federação',
    defaultColumns: ['nome', 'cidade', 'tecnicoResponsavel', 'ativo'],
    preview: (doc) => (doc?.slug ? `/centros/${doc.slug}` : null),
  },
  access: {
    read: ({ req: { user } }) => (user ? true : { ativo: { equals: true } }),
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  hooks: revalidateHooks,
  defaultSort: 'nome',
  fields: [
    { name: 'nome', type: 'text', required: true },
    {
      type: 'row',
      fields: [
        { name: 'cidade', type: 'text', required: true, admin: { width: '40%' } },
        { name: 'bairro', type: 'text', admin: { width: '30%' } },
        { name: 'cep', label: 'CEP', type: 'text', admin: { width: '30%' } },
      ],
    },
    { name: 'endereco', label: 'Endereço', type: 'text', required: true },
    {
      type: 'row',
      fields: [
        {
          name: 'latitude',
          type: 'number',
          admin: {
            width: '50%',
            description:
              'Para o mapa. No Google Maps: clique com o botão direito no local e copie as coordenadas.',
          },
        },
        { name: 'longitude', type: 'number', admin: { width: '50%' } },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'tecnicoResponsavel',
          label: 'Técnico responsável',
          type: 'text',
          admin: { width: '50%' },
        },
        { name: 'cref', label: 'CREF do técnico', type: 'text', admin: { width: '50%' } },
      ],
    },
    {
      name: 'tags',
      label: 'Perfil do CT',
      type: 'select',
      hasMany: true,
      options: [...TAGS_CENTRO],
    },
    { name: 'horarios', label: 'Horários de treino', type: 'textarea' },
    {
      type: 'row',
      fields: [
        { name: 'telefone', type: 'text', admin: { width: '33%' } },
        {
          name: 'whatsapp',
          label: 'WhatsApp (só números, com DDD)',
          type: 'text',
          admin: { width: '33%' },
        },
        { name: 'instagram', label: 'Instagram (@usuario)', type: 'text', admin: { width: '33%' } },
      ],
    },
    { name: 'capa', label: 'Foto principal', type: 'upload', relationTo: 'media' },
    { name: 'galeria', type: 'upload', relationTo: 'media', hasMany: true },
    { name: 'descricao', label: 'Sobre o CT', type: 'richText' },
    {
      name: 'ativo',
      label: 'Filiação ativa (aparece no site)',
      type: 'checkbox',
      defaultValue: true,
      admin: { position: 'sidebar' },
    },
    slugField('nome'),
  ],
}
