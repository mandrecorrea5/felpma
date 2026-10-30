import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { anyone, authenticated } from '../access'
import { slugField } from '../fields/slug'
import { revalidateHooks } from '../hooks/revalidate'
import { STATUS_COMPETICAO, TIPOS_COMPETICAO } from '../lib/constants'

const dayOnly = { pickerAppearance: 'dayOnly' as const, displayFormat: 'dd/MM/yyyy' }

/**
 * O evento é quem manda na inscrição: se a chave está ligada, precisa de janela
 * de datas coerente e não pode estar cancelado/adiado.
 */
const validaInscricao: CollectionBeforeChangeHook = ({ data }) => {
  const inicio = data?.inscricoesDe
  const fim = data?.inscricoesAte

  if (inicio && fim && new Date(String(inicio)) > new Date(String(fim))) {
    throw new APIError('A abertura das inscrições não pode ser depois do encerramento.', 400)
  }

  if (data?.inscricoesAbertas) {
    if (!inicio || !fim) {
      throw new APIError(
        'Para abrir as inscrições, informe a data de abertura e a de encerramento.',
        400,
      )
    }
    if (data?.status === 'cancelado' || data?.status === 'adiado') {
      throw new APIError(
        'Evento cancelado ou adiado não pode ter inscrições abertas. Feche as inscrições antes.',
        400,
      )
    }
  }

  return data
}

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
  hooks: { ...revalidateHooks, beforeChange: [validaInscricao] },
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
          admin: { width: '25%', date: dayOnly },
        },
        { name: 'dataFim', label: 'Término', type: 'date', admin: { width: '25%', date: dayOnly } },
        {
          name: 'inscricoesDe',
          label: 'Inscrições de',
          type: 'date',
          admin: { width: '25%', date: dayOnly },
        },
        {
          name: 'inscricoesAte',
          label: 'Inscrições até',
          type: 'date',
          admin: { width: '25%', date: dayOnly },
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
          admin: {
            width: '50%',
            description:
              'Só usado quando o evento NÃO tem formulário interno publicado. Com formulário, o site usa o interno.',
          },
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
      name: 'inscricoesAbertas',
      label: 'Permitir inscrições',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description:
          'Desligado, ninguém se inscreve — nem por link direto. Ligado, vale a janela de datas.',
      },
    },
    {
      name: 'limiteVagas',
      label: 'Limite de vagas',
      type: 'number',
      min: 0,
      admin: {
        position: 'sidebar',
        description: 'Deixe vazio para não limitar.',
      },
    },
    {
      name: 'avisoForaDoPeriodo',
      label: 'Aviso fora do período',
      type: 'textarea',
      admin: {
        position: 'sidebar',
        description: 'Aparece antes da abertura e depois do encerramento, no lugar do botão.',
      },
    },
    {
      name: 'formularios',
      label: 'Formulários deste evento',
      type: 'join',
      collection: 'formularios-inscricao',
      on: 'evento',
      admin: {
        description: 'Cadastrados em Inscrições › Formulários de inscrição.',
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
