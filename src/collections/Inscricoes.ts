import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { donoDaInscricao, doPainel, isAdmin } from '../access'
import { cifrar, ehCifrado } from '../lib/crypto/campos'
import { normalizarCpf } from '../lib/cpf'
import { STATUS_INSCRICAO } from '../lib/constants'
import { gerarProtocolo } from '../lib/inscricoes/protocolo'

/** Soma meses a uma data sem escorregar de mês (31/01 + 1 mês = 28/02). */
const somarMeses = (data: Date, meses: number): Date => {
  const resultado = new Date(data)
  const dia = resultado.getDate()
  resultado.setMonth(resultado.getMonth() + meses)
  if (resultado.getDate() < dia) resultado.setDate(0)
  return resultado
}

const preparaInscricao: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== 'create') {
    // O CPF do responsável também nunca é gravado em claro.
    const cpfResponsavel = data?.responsavel?.cpf
    if (typeof cpfResponsavel === 'string' && cpfResponsavel && !ehCifrado(cpfResponsavel)) {
      data.responsavel.cpf = cifrar(normalizarCpf(cpfResponsavel))
    }
    return data
  }

  if (!data.protocolo) data.protocolo = gerarProtocolo()

  if (!data.enviadaEm) data.enviadaEm = new Date().toISOString()

  const cpfResponsavel = data?.responsavel?.cpf
  if (typeof cpfResponsavel === 'string' && cpfResponsavel && !ehCifrado(cpfResponsavel)) {
    data.responsavel.cpf = cifrar(normalizarCpf(cpfResponsavel))
  }

  // Prazo de retenção vem do formulário no momento do envio — não muda depois.
  if (!data.retencaoAte && data.formulario) {
    try {
      const formulario = await req.payload.findByID({
        collection: 'formularios-inscricao',
        id: data.formulario,
        depth: 0,
      })
      const meses = Number(formulario?.lgpd?.prazoRetencaoMeses ?? 12)
      const base = new Date(String(data.enviadaEm))
      data.retencaoAte = somarMeses(base, meses).toISOString()
    } catch {
      throw new APIError('Não foi possível calcular o prazo de retenção da inscrição.', 400)
    }
  }

  return data
}

/**
 * Inscrição recebida.
 *
 * Nunca é criada por REST: só pela server action, que valida janela do evento,
 * respostas e consentimentos. Guarda a versão do formulário e o snapshot das
 * perguntas para o histórico não mudar quando o formulário for editado.
 */
export const Inscricoes: CollectionConfig = {
  slug: 'inscricoes',
  typescript: { interface: 'Inscricao' },
  labels: { singular: 'Inscrição', plural: 'Inscrições' },
  admin: {
    useAsTitle: 'protocolo',
    group: 'Inscrições',
    defaultColumns: ['protocolo', 'atleta', 'evento', 'status', 'enviadaEm'],
    listSearchableFields: ['protocolo'],
    description: 'Dados pessoais: leia só o necessário e registre o motivo do acesso.',
  },
  access: {
    create: () => false,
    read: donoDaInscricao,
    update: ({ req: { user } }) => doPainel(user),
    delete: isAdmin,
  },
  hooks: { beforeChange: [preparaInscricao] },
  defaultSort: '-enviadaEm',
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'protocolo',
          label: 'Protocolo',
          type: 'text',
          required: true,
          unique: true,
          index: true,
          admin: { width: '40%', readOnly: true },
        },
        {
          name: 'status',
          label: 'Situação',
          type: 'select',
          required: true,
          defaultValue: 'recebida',
          options: [...STATUS_INSCRICAO],
          admin: { width: '30%' },
        },
        {
          name: 'enviadaEm',
          label: 'Enviada em',
          type: 'date',
          required: true,
          admin: { width: '30%', readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'atleta',
          label: 'Atleta',
          type: 'relationship',
          relationTo: 'atletas',
          required: true,
          index: true,
          admin: { width: '50%' },
        },
        {
          name: 'evento',
          label: 'Evento',
          type: 'relationship',
          relationTo: 'competicoes',
          required: true,
          index: true,
          admin: { width: '50%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'formulario',
          label: 'Formulário',
          type: 'relationship',
          relationTo: 'formularios-inscricao',
          required: true,
          admin: { width: '50%' },
        },
        {
          name: 'formularioVersao',
          label: 'Versão do formulário',
          type: 'number',
          required: true,
          admin: { width: '25%', readOnly: true },
        },
        {
          name: 'idadeNaInscricao',
          label: 'Idade na inscrição',
          type: 'number',
          admin: { width: '25%', readOnly: true },
        },
      ],
    },
    {
      name: 'respostas',
      label: 'Respostas',
      type: 'json',
      required: true,
      admin: {
        description:
          'Snapshot das perguntas e respostas no momento do envio (não muda se o formulário mudar).',
      },
    },
    {
      name: 'consentimentos',
      label: 'Prova de consentimento',
      type: 'array',
      admin: { description: 'Texto, versão, hash, data/hora e origem de cada aceite.' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'identificador', type: 'text', admin: { width: '40%' } },
            { name: 'versao', type: 'text', admin: { width: '15%' } },
            { name: 'finalidade', type: 'text', admin: { width: '25%' } },
            { name: 'obrigatorio', type: 'checkbox', admin: { width: '20%' } },
          ],
        },
        { name: 'textoHash', label: 'Hash do texto exibido', type: 'text' },
        {
          name: 'texto',
          label: 'Texto exibido',
          type: 'textarea',
          admin: { description: 'Cópia do consentimento como estava no dia do envio.' },
        },
        {
          type: 'row',
          fields: [
            { name: 'aceito', type: 'checkbox', admin: { width: '25%' } },
            {
              name: 'aceitoEm',
              type: 'date',
              admin: { width: '35%', date: { pickerAppearance: 'dayAndTime' } },
            },
            { name: 'ipHash', label: 'Origem (IP pseudonimizado)', type: 'text', admin: { width: '40%' } },
          ],
        },
        {
          name: 'revogadoEm',
          label: 'Revogado em',
          type: 'date',
          admin: { date: { pickerAppearance: 'dayAndTime' } },
        },
      ],
    },
    {
      name: 'responsavel',
      label: 'Responsável (menor de idade)',
      type: 'group',
      admin: {
        condition: (data) => Boolean(data?.menorDeIdade),
        description: 'Dados cifrados. Só aparecem quando a inscrição é de menor de 18 anos.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'nome', type: 'text', admin: { width: '50%' } },
            { name: 'parentesco', type: 'text', admin: { width: '25%' } },
            { name: 'telefone', type: 'text', admin: { width: '25%' } },
          ],
        },
        { name: 'cpf', label: 'CPF do responsável', type: 'text' },
      ],
    },
    {
      name: 'menorDeIdade',
      label: 'Menor de idade',
      type: 'checkbox',
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'retencaoAte',
      label: 'Eliminar/anonimizar em',
      type: 'date',
      admin: {
        position: 'sidebar',
        readOnly: true,
        date: { pickerAppearance: 'dayOnly' },
        description: 'Calculado a partir do prazo do formulário. O expurgo automático entra na Fase 2.',
      },
    },
    {
      name: 'motivoRejeicao',
      label: 'Motivo da rejeição',
      type: 'textarea',
      admin: { condition: (data) => data?.status === 'rejeitada' },
    },
    {
      name: 'observacoesInternas',
      label: 'Observações internas',
      type: 'textarea',
      admin: { description: 'Nunca aparece para o atleta.' },
    },
  ],
}
