import type {
  CollectionBeforeChangeHook,
  CollectionBeforeValidateHook,
  CollectionConfig,
} from 'payload'
import { APIError } from 'payload'
import { atletaOuPainel, isAdmin, isAdminField } from '../access'
import { cifrar, ehCifrado, hashBusca } from '../lib/crypto/campos'
import { cpfValido, mascararCpf, normalizarCpf } from '../lib/cpf'
import { emailRecuperacaoSenha } from '../lib/email-templates'

/**
 * Conta do atleta — o "filiado" do site.
 *
 * É uma coleção de autenticação SEPARADA de `users` de propósito:
 *  - o painel só aceita sessão de `users` (`admin.user`), então atleta nunca
 *    entra no /admin (ver `payload/dist/auth/getAccessResults.js`);
 *  - a política de senha, bloqueio e verificação é própria;
 *  - o titular (LGPD) não se mistura com o operador do CMS.
 *
 * O CPF nunca é gravado em claro: `cpf` guarda o texto cifrado (AES-256-GCM) e
 * `cpfHash` é o índice cego usado para busca e unicidade.
 */
const preparaCpf: CollectionBeforeValidateHook = ({ data }) => {
  const bruto = data?.cpf
  if (typeof bruto !== 'string' || bruto.length === 0) return data
  if (ehCifrado(bruto)) return data

  const digitos = normalizarCpf(bruto)
  if (!cpfValido(digitos)) {
    throw new APIError('CPF inválido. Confira os números e tente de novo.', 400)
  }

  return {
    ...data,
    cpf: cifrar(digitos),
    cpfHash: hashBusca(digitos),
    cpfMascara: mascararCpf(digitos),
  }
}

/**
 * Registra quem aprovou o cadastro e quando. Só conta como aprovação a transição
 * para "ativo" — reabrir o documento de uma conta já ativa não reescreve a data.
 */
const registraAprovacao: CollectionBeforeChangeHook = ({ data, originalDoc, req }) => {
  if (data?.status !== 'ativo' || originalDoc?.status === 'ativo') return data

  data.aprovadoEm = new Date().toISOString()
  const ator = req.user
  if (ator?.collection === 'users' && ator.id) data.aprovadoPor = ator.id
  return data
}

export const Atletas: CollectionConfig = {
  slug: 'atletas',
  typescript: { interface: 'Atleta' },
  labels: { singular: 'Conta de atleta', plural: 'Contas de atleta' },
  admin: {
    useAsTitle: 'nome',
    group: 'Inscrições',
    defaultColumns: ['nome', 'email', 'cidade', 'status', 'createdAt'],
    listSearchableFields: ['nome', 'email'],
    description:
      'Contas da área do filiado. Não têm acesso ao painel — só à área do atleta no site.',
  },
  auth: {
    tokenExpiration: 60 * 60 * 8,
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
    useSessions: true,
    cookies: { sameSite: 'Lax' },
    // Sem `verify`: enquanto não houver SMTP, quem libera o acesso é a aprovação
    // manual no painel. A recuperação de senha continua dependendo de e-mail.
    forgotPassword: {
      expiration: 60 * 60 * 1000,
      minRequestInterval: 60 * 1000,
      generateEmailHTML: (args) => emailRecuperacaoSenha(args?.token ?? '', args?.user?.nome),
      generateEmailSubject: () => 'Redefinir sua senha — FELPMA',
    },
  },
  access: {
    // Redundante com `admin.user`, mas explícito: atleta não entra no painel.
    admin: () => false,
    create: isAdmin,
    read: atletaOuPainel,
    update: atletaOuPainel,
    delete: isAdmin,
  },
  defaultSort: 'nome',
  hooks: { beforeValidate: [preparaCpf], beforeChange: [registraAprovacao] },
  fields: [
    { name: 'nome', label: 'Nome completo', type: 'text', required: true },
    {
      name: 'cpf',
      label: 'CPF',
      type: 'text',
      admin: { hidden: true },
      access: { read: () => false, create: isAdminField, update: isAdminField },
    },
    {
      name: 'cpfHash',
      type: 'text',
      unique: true,
      index: true,
      admin: { hidden: true },
      access: { read: () => false, create: () => false, update: () => false },
    },
    {
      name: 'cpfMascara',
      label: 'CPF',
      type: 'text',
      admin: { readOnly: true, description: 'Guardado cifrado. Revelação auditada na Fase 2.' },
      access: { create: () => false, update: () => false },
    },
    {
      name: 'dataNascimento',
      label: 'Data de nascimento',
      type: 'date',
      required: true,
      admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'dd/MM/yyyy' } },
      access: { update: isAdminField },
    },
    {
      type: 'row',
      fields: [
        { name: 'telefone', label: 'Telefone (WhatsApp)', type: 'text', admin: { width: '50%' } },
        {
          name: 'uf',
          label: 'UF',
          type: 'text',
          defaultValue: 'MA',
          maxLength: 2,
          admin: { width: '15%' },
        },
        { name: 'cidade', type: 'text', admin: { width: '35%' } },
      ],
    },
    {
      name: 'status',
      label: 'Situação',
      type: 'select',
      defaultValue: 'ativo',
      options: [
        { label: 'Pendente de aprovação', value: 'pendente' },
        { label: 'Ativa', value: 'ativo' },
        { label: 'Bloqueada', value: 'bloqueado' },
      ],
      access: { update: isAdminField },
      admin: {
        position: 'sidebar',
        description:
          'Cadastros feitos pelo site entram como "Pendente". Abra um por um e mude para "Ativa" para liberar o acesso.',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'aprovadoEm',
          label: 'Aprovado em',
          type: 'date',
          admin: {
            width: '50%',
            readOnly: true,
            date: { pickerAppearance: 'dayAndTime' },
          },
        },
        {
          name: 'aprovadoPor',
          label: 'Aprovado por',
          type: 'relationship',
          relationTo: 'users',
          admin: { width: '50%', readOnly: true },
        },
      ],
    },
    {
      name: 'aceitePrivacidade',
      label: 'Aceite do aviso de privacidade',
      type: 'group',
      admin: { description: 'Registro do consentimento dado no cadastro. Não é editável.' },
      access: { update: () => false },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'versao', label: 'Versão do aviso', type: 'text', admin: { width: '50%' } },
            {
              name: 'aceitoEm',
              label: 'Aceito em',
              type: 'date',
              admin: { width: '50%', date: { pickerAppearance: 'dayAndTime' } },
            },
          ],
        },
      ],
    },
  ],
}
