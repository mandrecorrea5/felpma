import type { CollectionConfig } from 'payload'
import { authenticated } from '../access'

/** Mensagens enviadas pelo formulário de contato do site. */
export const Mensagens: CollectionConfig = {
  slug: 'mensagens',
  typescript: { interface: 'Mensagem' },
  labels: { singular: 'Mensagem de contato', plural: 'Mensagens de contato' },
  admin: {
    useAsTitle: 'assunto',
    group: 'Conteúdo',
    defaultColumns: ['assunto', 'nome', 'email', 'status', 'createdAt'],
  },
  access: {
    // A criação acontece só pelo servidor (server action com overrideAccess).
    create: () => false,
    read: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  defaultSort: '-createdAt',
  fields: [
    { name: 'nome', type: 'text', required: true },
    {
      type: 'row',
      fields: [
        { name: 'email', label: 'E-mail', type: 'email', required: true, admin: { width: '50%' } },
        { name: 'telefone', type: 'text', admin: { width: '50%' } },
      ],
    },
    {
      name: 'assunto',
      type: 'select',
      required: true,
      options: [
        { label: 'Filiação', value: 'filiacao' },
        { label: 'Competições', value: 'competicoes' },
        { label: 'Imprensa', value: 'imprensa' },
        { label: 'Patrocínio e parcerias', value: 'parcerias' },
        { label: 'Outros', value: 'outros' },
      ],
    },
    { name: 'mensagem', type: 'textarea', required: true },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'nova',
      options: [
        { label: 'Nova', value: 'nova' },
        { label: 'Respondida', value: 'respondida' },
        { label: 'Arquivada', value: 'arquivada' },
      ],
      admin: { position: 'sidebar' },
    },
  ],
}
