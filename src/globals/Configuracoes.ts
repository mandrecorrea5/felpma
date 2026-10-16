import type { GlobalConfig } from 'payload'
import { authenticated } from '../access'
import { revalidateGlobal } from '../hooks/revalidate'

/** Dados gerais: logo, contato, redes, apoiadores — usados no cabeçalho e rodapé. */
export const Configuracoes: GlobalConfig = {
  slug: 'configuracoes',
  typescript: { interface: 'ConfiguracoesSite' },
  label: 'Configurações do site',
  admin: { group: 'Páginas fixas' },
  access: { read: () => true, update: authenticated },
  hooks: { afterChange: [revalidateGlobal] },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Identidade',
          fields: [
            { name: 'sigla', type: 'text', required: true, defaultValue: 'FELPMA' },
            {
              name: 'nomeCompleto',
              label: 'Nome completo',
              type: 'text',
              required: true,
              defaultValue: 'Federação de Levantamento de Pesos do Maranhão',
            },
            { name: 'logo', type: 'upload', relationTo: 'media' },
            { name: 'cnpj', label: 'CNPJ', type: 'text' },
            {
              name: 'descricaoSite',
              label: 'Descrição para buscadores',
              type: 'textarea',
              defaultValue:
                'Site oficial da Federação de Levantamento de Pesos do Maranhão: calendário, convocações, resultados, centros de treinamento e filiação.',
            },
          ],
        },
        {
          label: 'Contato',
          fields: [
            { name: 'endereco', label: 'Endereço da sede', type: 'text' },
            {
              type: 'row',
              fields: [
                { name: 'cidade', type: 'text', defaultValue: 'São Luís', admin: { width: '50%' } },
                { name: 'cep', label: 'CEP', type: 'text', admin: { width: '50%' } },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'email', label: 'E-mail', type: 'email', admin: { width: '33%' } },
                { name: 'telefone', type: 'text', admin: { width: '33%' } },
                {
                  name: 'whatsapp',
                  label: 'WhatsApp (só números, com DDD)',
                  type: 'text',
                  admin: { width: '33%' },
                },
              ],
            },
            { name: 'horarioAtendimento', label: 'Horário de atendimento', type: 'text' },
          ],
        },
        {
          label: 'Redes sociais',
          fields: [
            { name: 'instagram', label: 'Instagram (URL)', type: 'text' },
            { name: 'youtube', label: 'YouTube (URL)', type: 'text' },
            { name: 'facebook', label: 'Facebook (URL)', type: 'text' },
          ],
        },
        {
          label: 'Apoiadores',
          fields: [
            {
              name: 'apoiadores',
              type: 'array',
              labels: { singular: 'Apoiador', plural: 'Apoiadores' },
              fields: [
                { name: 'nome', type: 'text', required: true },
                { name: 'logo', type: 'upload', relationTo: 'media' },
                { name: 'url', label: 'Site', type: 'text' },
              ],
            },
          ],
        },
        {
          label: 'Links externos',
          fields: [
            {
              name: 'linkAreaFiliado',
              label: 'Link da Área do filiado',
              type: 'text',
              admin: {
                description: 'Deixe vazio para esconder o link até a área do filiado existir.',
              },
            },
          ],
        },
      ],
    },
  ],
}
