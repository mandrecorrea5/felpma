import type { Block, Field } from 'payload'
import { TIPOS_ARQUIVO } from '../lib/inscricoes/arquivo'

/**
 * Construtor de campos do formulário de inscrição.
 *
 * Cada bloco vira um campo na tela pública. `nome` é a chave técnica (imutável,
 * usada no snapshot da resposta); `rotulo` é o que o atleta lê. `sensivel` liga
 * a cifra do valor e o mascaramento no painel.
 *
 * O bloco `arquivo` é a exceção: não guarda o valor no snapshot, e sim uma
 * referência ao upload privado em `arquivos-inscricao` (o arquivo em si fica
 * fora do banco, em disco, com acesso só do atleta e do painel).
 */

const nomeTecnico = (sobre: string): Field => ({
  name: 'nome',
  label: 'Nome técnico',
  type: 'text',
  required: true,
  admin: {
    description: `Chave usada no banco e no export (sem espaços). Ex.: ${sobre}`,
  },
})

const rotulo: Field = {
  name: 'rotulo',
  label: 'Pergunta',
  type: 'text',
  required: true,
}

const ajuda: Field = {
  name: 'ajuda',
  label: 'Texto de ajuda',
  type: 'text',
  admin: { description: 'Aparece abaixo do campo. Explique com exemplo, se ajudar.' },
}

const obrigatorio: Field = {
  name: 'obrigatorio',
  label: 'Obrigatório',
  type: 'checkbox',
  defaultValue: false,
}

const sensivel: Field = {
  name: 'sensivel',
  label: 'Dado sensível (LGPD)',
  type: 'checkbox',
  defaultValue: false,
  admin: {
    description:
      'Guarda cifrado, mascara no painel e exige consentimento específico. Use só quando indispensável.',
  },
}

/** Visibilidade condicional simples: mostra se outro campo tiver um valor. */
const mostrarSe: Field = {
  name: 'mostrarSe',
  label: 'Mostrar só se…',
  type: 'group',
  admin: { description: 'Opcional. Use para perguntas que só fazem sentido em certas respostas.' },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'campo',
          label: 'Campo',
          type: 'text',
          admin: { width: '50%', description: 'Nome técnico do outro campo.' },
        },
        { name: 'valor', label: 'Tiver o valor', type: 'text', admin: { width: '50%' } },
      ],
    },
  ],
}

const limitesTexto: Field[] = [
  {
    type: 'row',
    fields: [
      { name: 'minLength', label: 'Mínimo de caracteres', type: 'number', admin: { width: '50%' } },
      { name: 'maxLength', label: 'Máximo de caracteres', type: 'number', admin: { width: '50%' } },
    ],
  },
]

const base = (nomeExemplo: string): Field[] => [
  nomeTecnico(nomeExemplo),
  rotulo,
  ajuda,
  obrigatorio,
  sensivel,
  mostrarSe,
]

export const camposFormulario: Block[] = [
  {
    slug: 'texto',
    labels: { singular: 'Texto curto', plural: 'Textos curtos' },
    fields: [...base('clube'), ...limitesTexto],
  },
  {
    slug: 'texto-longo',
    labels: { singular: 'Texto longo', plural: 'Textos longos' },
    fields: [...base('observacoes'), ...limitesTexto],
  },
  {
    slug: 'arquivo',
    labels: { singular: 'Arquivo (upload)', plural: 'Arquivos (upload)' },
    fields: [
      nomeTecnico('atestado-medico'),
      rotulo,
      ajuda,
      {
        name: 'aceita',
        label: 'Tipos aceitos',
        type: 'select',
        required: true,
        defaultValue: 'pdf-imagem',
        options: [...TIPOS_ARQUIVO],
        admin: {
          description:
            'Limite de 2 MB por arquivo. O atleta e a federação veem o arquivo; ninguém mais.',
        },
      },
      obrigatorio,
      mostrarSe,
    ],
  },
  { slug: 'email', labels: { singular: 'E-mail', plural: 'E-mails' }, fields: base('email-contato') },
  {
    slug: 'telefone',
    labels: { singular: 'Telefone', plural: 'Telefones' },
    fields: base('telefone-responsavel'),
  },
  { slug: 'data', labels: { singular: 'Data', plural: 'Datas' }, fields: base('data-exame') },
  {
    slug: 'numero',
    labels: { singular: 'Número', plural: 'Números' },
    fields: [
      ...base('peso-declarado'),
      {
        type: 'row',
        fields: [
          { name: 'min', label: 'Mínimo', type: 'number', admin: { width: '50%' } },
          { name: 'max', label: 'Máximo', type: 'number', admin: { width: '50%' } },
        ],
      },
    ],
  },
  {
    slug: 'selecao',
    labels: { singular: 'Seleção única', plural: 'Seleções únicas' },
    fields: [
      ...base('categoria'),
      {
        name: 'opcoes',
        label: 'Opções',
        type: 'array',
        required: true,
        minRows: 1,
        labels: { singular: 'Opção', plural: 'Opções' },
        fields: [
          {
            type: 'row',
            fields: [
              { name: 'valor', label: 'Valor', type: 'text', required: true, admin: { width: '35%' } },
              {
                name: 'rotulo',
                label: 'Texto exibido',
                type: 'text',
                required: true,
                admin: { width: '35%' },
              },
              {
                name: 'grupo',
                label: 'Grupo',
                type: 'text',
                admin: {
                  width: '30%',
                  description:
                    'Opcional. Opções com o mesmo grupo aparecem juntas quando este campo é filtrado por outro.',
                },
              },
            ],
          },
        ],
      },
      {
        name: 'filtrarPor',
        label: 'Filtrar opções pelo campo',
        type: 'text',
        admin: {
          description:
            'Opcional. Nome técnico de outro campo de seleção cujas opções têm "Grupo" (ex.: categoria_idade). Sem ele, todas as opções aparecem sempre.',
        },
      },
    ],
  },
  {
    slug: 'multipla',
    labels: { singular: 'Múltipla escolha', plural: 'Múltiplas escolhas' },
    fields: [
      ...base('provas'),
      {
        name: 'opcoes',
        label: 'Opções',
        type: 'array',
        required: true,
        minRows: 1,
        labels: { singular: 'Opção', plural: 'Opções' },
        fields: [
          {
            type: 'row',
            fields: [
              { name: 'valor', label: 'Valor', type: 'text', required: true, admin: { width: '35%' } },
              {
                name: 'rotulo',
                label: 'Texto exibido',
                type: 'text',
                required: true,
                admin: { width: '35%' },
              },
              {
                name: 'grupo',
                label: 'Grupo',
                type: 'text',
                admin: {
                  width: '30%',
                  description:
                    'Opcional. Opções com o mesmo grupo aparecem juntas quando este campo é filtrado por outro.',
                },
              },
            ],
          },
        ],
      },
      {
        name: 'filtrarPor',
        label: 'Filtrar opções pelo campo',
        type: 'text',
        admin: {
          description:
            'Opcional. Nome técnico de outro campo de seleção cujas opções têm "Grupo" (ex.: categoria_idade). Sem ele, todas as opções aparecem sempre.',
        },
      },
    ],
  },
  {
    slug: 'aceite',
    labels: { singular: 'Declaração (checkbox)', plural: 'Declarações' },
    fields: [
      nomeTecnico('declaracao-idade'),
      {
        name: 'texto',
        label: 'Texto da declaração',
        type: 'textarea',
        required: true,
        admin: { description: 'Ex.: "Declaro que li e aceito o regulamento da competição."' },
      },
      { ...obrigatorio, defaultValue: true },
      mostrarSe,
    ],
  },
  {
    slug: 'secao',
    labels: { singular: 'Seção (título)', plural: 'Seções' },
    fields: [
      { name: 'titulo', label: 'Título da seção', type: 'text', required: true },
      { name: 'descricao', label: 'Descrição', type: 'textarea' },
    ],
  },
]
