import type { GlobalConfig } from 'payload'
import { authenticated } from '../access'
import { revalidateGlobal } from '../hooks/revalidate'

/** Conteúdo da página "A Federação" e da página de Transparência. */
export const Federacao: GlobalConfig = {
  slug: 'federacao',
  typescript: { interface: 'PaginaFederacao' },
  label: 'A Federação',
  admin: { group: 'Páginas fixas' },
  access: { read: () => true, update: authenticated },
  hooks: { afterChange: [revalidateGlobal] },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Quem somos',
          fields: [
            {
              name: 'apresentacao',
              label: 'Apresentação curta',
              type: 'textarea',
              defaultValue:
                'A FELPMA organiza, fomenta e representa o levantamento de pesos olímpico no Maranhão.',
            },
            { name: 'historia', label: 'História', type: 'richText' },
            { name: 'foto', type: 'upload', relationTo: 'media' },
            {
              type: 'row',
              fields: [
                { name: 'missao', label: 'Missão', type: 'textarea', admin: { width: '33%' } },
                { name: 'visao', label: 'Visão', type: 'textarea', admin: { width: '33%' } },
                { name: 'valores', type: 'textarea', admin: { width: '33%' } },
              ],
            },
            {
              name: 'numeros',
              label: 'Números em destaque',
              type: 'array',
              maxRows: 4,
              admin: { description: 'Ex.: "Fundada em" / "1998". Use apenas números reais.' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'valor', type: 'text', required: true, admin: { width: '40%' } },
                    {
                      name: 'rotulo',
                      label: 'Rótulo',
                      type: 'text',
                      required: true,
                      admin: { width: '60%' },
                    },
                  ],
                },
              ],
            },
            {
              name: 'filiacoes',
              label: 'Filiada a',
              type: 'array',
              admin: {
                description: 'Confederação, comitês e entidades a que a federação é vinculada.',
              },
              fields: [
                { name: 'nome', type: 'text', required: true },
                { name: 'url', type: 'text' },
              ],
            },
          ],
        },
        {
          label: 'Transparência',
          fields: [
            {
              name: 'transparenciaIntro',
              label: 'Texto de abertura',
              type: 'textarea',
              defaultValue:
                'Prestações de contas, atas, convênios e documentos institucionais, publicados em cumprimento à legislação esportiva.',
            },
            {
              name: 'transparenciaTexto',
              label: 'Informações complementares',
              type: 'richText',
              admin: {
                description: 'Ex.: processo eleitoral, ouvidoria, como solicitar informações.',
              },
            },
            { name: 'emailOuvidoria', label: 'E-mail da ouvidoria', type: 'email' },
          ],
        },
      ],
    },
  ],
}
