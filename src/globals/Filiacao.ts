import type { GlobalConfig } from 'payload'
import { authenticated } from '../access'
import { revalidateGlobal } from '../hooks/revalidate'

export const Filiacao: GlobalConfig = {
  slug: 'filiacao',
  typescript: { interface: 'PaginaFiliacao' },
  label: 'Filiação',
  admin: { group: 'Páginas fixas' },
  access: { read: () => true, update: authenticated },
  hooks: { afterChange: [revalidateGlobal] },
  fields: [
    {
      name: 'introducao',
      label: 'Introdução',
      type: 'textarea',
      defaultValue:
        'Escolha seu perfil e veja os documentos necessários. Filiados podem competir em eventos oficiais e ser convocados para a seleção maranhense.',
    },
    {
      name: 'perfis',
      type: 'array',
      labels: { singular: 'Perfil', plural: 'Perfis' },
      minRows: 1,
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'nome',
              type: 'text',
              required: true,
              admin: { width: '40%', placeholder: 'Atleta' },
            },
            { name: 'anuidade', label: 'Anuidade (R$)', type: 'number', admin: { width: '30%' } },
            {
              name: 'linkInscricao',
              label: 'Link para iniciar',
              type: 'text',
              admin: { width: '30%', description: 'Formulário ou e-mail (mailto:).' },
            },
          ],
        },
        { name: 'descricao', label: 'Descrição', type: 'text' },
        {
          name: 'documentos',
          label: 'Documentos exigidos',
          type: 'array',
          fields: [{ name: 'item', type: 'text', required: true }],
        },
        {
          name: 'formulario',
          label: 'Ficha de filiação (arquivo)',
          type: 'upload',
          relationTo: 'documentos',
        },
      ],
    },
    {
      name: 'passos',
      label: 'Como funciona',
      type: 'array',
      fields: [
        { name: 'titulo', type: 'text', required: true },
        { name: 'texto', type: 'text' },
      ],
    },
    { name: 'linkRenovacao', label: 'Link de renovação', type: 'text' },
    {
      name: 'faq',
      label: 'Dúvidas frequentes',
      type: 'array',
      fields: [
        { name: 'pergunta', type: 'text', required: true },
        { name: 'resposta', type: 'textarea', required: true },
      ],
    },
  ],
}
