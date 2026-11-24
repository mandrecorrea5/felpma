import type {
  CollectionAfterReadHook,
  CollectionBeforeChangeHook,
  CollectionConfig,
} from 'payload'
import { APIError } from 'payload'
import { donoDaInscricao, doPainel, isAdmin, isAdminUser } from '../access'
import { cifrar, ehCifrado } from '../lib/crypto/campos'
import { normalizarCpf } from '../lib/cpf'
import { CAMPO_COMPROVANTE, STATUS_INSCRICAO } from '../lib/constants'
import { categoriaPesoDeRespostas } from '../lib/inscricoes/categoria-peso'
import {
  ehComprovantePagamento,
  statusTemPendenciaDeComprovante,
} from '../lib/inscricoes/comprovante-regra'
import { gerarCsvInscricoes, respostaCsv } from '../lib/inscricoes/exportacao'
import { gerarProtocolo } from '../lib/inscricoes/protocolo'
import { auditarAcesso, registrarAcesso } from '../lib/lgpd/auditoria'

/** Soma meses a uma data sem escorregar de mês (31/01 + 1 mês = 28/02). */
const somarMeses = (data: Date, meses: number): Date => {
  const resultado = new Date(data)
  const dia = resultado.getDate()
  resultado.setMonth(resultado.getMonth() + meses)
  if (resultado.getDate() < dia) resultado.setDate(0)
  return resultado
}

const preparaInscricao: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  // Categoria de peso: a resposta do formulário é a fonte da verdade. Guardar
  // em campo próprio permite filtrar/ordenar no painel e exportar no CSV sem
  // abrir o JSON de respostas. Se o valor já veio preenchido (correção feita
  // pela federação), ele é preservado.
  if (!data?.categoriaPeso) {
    const categoriaPeso = categoriaPesoDeRespostas(data?.respostas)
    if (categoriaPeso) data.categoriaPeso = categoriaPeso
  }

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
 * Inscrições anteriores ao campo próprio (ou gravadas por integração) exibem a
 * categoria derivada do snapshot, sem precisar reabrir e salvar cada registro.
 */
const completaCategoriaPeso: CollectionAfterReadHook = ({ doc }) => {
  if (!doc?.categoriaPeso) {
    const categoriaPeso = categoriaPesoDeRespostas(doc?.respostas)
    if (categoriaPeso) doc.categoriaPeso = categoriaPeso
  }
  return doc
}

/**
 * Campo virtual do painel: marca a inscrição como pendente de comprovante.
 *
 * Só roda para usuários do painel. A área do atleta calcula a pendência na
 * própria página (com uma consulta por atleta), então uma consulta extra por
 * inscrição ali seria desperdício. As exportações em massa desligam o cálculo
 * pelo `context` para não fazer N consultas.
 */
const calculaComprovantePendente: CollectionAfterReadHook = async ({ doc, req }) => {
  if (!doc?.id) return doc
  if (req.user?.collection !== 'users') return doc
  if (req.context?.semComprovantePendente) return doc

  if (!statusTemPendenciaDeComprovante(String(doc.status ?? ''))) {
    doc.situacaoComprovante = '—'
    return doc
  }

  const eventoId = typeof doc.evento === 'object' ? doc.evento?.id : doc.evento
  const atletaId = typeof doc.atleta === 'object' ? doc.atleta?.id : doc.atleta

  // O comprovante é do atleta na competição: qualquer arquivo dele naquele
  // evento quita todas as inscrições. A consulta pela inscrição cobre os
  // arquivos gravados antes do campo `evento` existir.
  const [porEvento, porInscricao] = await Promise.all([
    eventoId != null && atletaId != null
      ? req.payload.find({
          collection: 'arquivos-inscricao',
          where: {
            and: [{ atleta: { equals: atletaId } }, { evento: { equals: eventoId } }],
          },
          limit: 100,
          depth: 0,
          overrideAccess: true,
        })
      : { docs: [] },
    req.payload.find({
      collection: 'arquivos-inscricao',
      where: { inscricao: { equals: doc.id } },
      limit: 100,
      depth: 0,
      overrideAccess: true,
    }),
  ])

  const docs = [...porEvento.docs, ...porInscricao.docs]
  doc.situacaoComprovante = docs.some(ehComprovantePagamento) ? 'Enviado' : 'Pendente'
  return doc
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
    defaultColumns: [
      'protocolo',
      'atleta',
      'categoriaPeso',
      'evento',
      'status',
      'situacaoComprovante',
      'enviadaEm',
    ],
    listSearchableFields: ['protocolo', 'categoriaPeso'],
    description:
      'Dados pessoais: leia só o necessário e registre o motivo do acesso. Use o bloco "Exportar inscrições" no topo para baixar o CSV de um evento.',
    components: {
      beforeListTable: ['/components/admin/ExportarInscricoesEvento#ExportarInscricoesEvento'],
    },
  },
  access: {
    create: () => false,
    read: donoDaInscricao,
    update: ({ req: { user } }) => doPainel(user),
    delete: isAdmin,
  },
  endpoints: [
    {
      path: '/exportar',
      method: 'get',
      handler: async (req) => {
        // Exportar em massa é uma operação de administrador: o arquivo tem CPF,
        // telefone e todas as respostas, inclusive as marcadas como sensíveis.
        if (!isAdminUser(req.user)) {
          return Response.json(
            { erro: 'Apenas administradores podem exportar os inscritos.' },
            { status: 403 },
          )
        }

        const eventoId = req.searchParams.get('evento')
        if (!eventoId) {
          return Response.json({ erro: 'Informe o evento a exportar.' }, { status: 400 })
        }

        try {
          const evento = await req.payload.findByID({
            collection: 'competicoes',
            id: eventoId,
            depth: 0,
            overrideAccess: true,
          })

          const [{ docs: formularios }, { docs: inscricoes }] = await Promise.all([
            req.payload.find({
              collection: 'formularios-inscricao',
              where: { evento: { equals: evento.id } },
              sort: 'createdAt',
              depth: 0,
              pagination: false,
              overrideAccess: true,
            }),
            req.payload.find({
              collection: 'inscricoes',
              where: { evento: { equals: evento.id } },
              sort: 'enviadaEm',
              depth: 2,
              pagination: false,
              overrideAccess: true,
              // Exportação em massa não precisa do campo virtual por linha.
              context: { semComprovantePendente: true },
            }),
          ])

          const exportacao = gerarCsvInscricoes(formularios, inscricoes, {
            incluirFormulario: formularios.length > 1,
            nomeBase: `${evento.id}-${evento.nome}`,
          })
          req.payload.logger.info(
            `[exportacao] evento ${evento.id}: ${exportacao.linhas} inscrições exportadas por ${req.user?.email ?? req.user?.id}`,
          )
          registrarAcesso({
            acao: 'leitura',
            colecao: 'inscricoes',
            documento: evento.id,
            detalhe: {
              evento: evento.id,
              formato: 'csv',
              formularios: formularios.length,
              registros: exportacao.linhas,
            },
            ...(req.user?.id != null ? { usuario: req.user.id } : {}),
          })

          return respostaCsv(exportacao)
        } catch (erro) {
          req.payload.logger.error({ err: erro, msg: 'Falha ao exportar inscrições do evento' })
          return Response.json({ erro: 'Não foi possível gerar a exportação.' }, { status: 500 })
        }
      },
    },
  ],
  hooks: {
    afterRead: [completaCategoriaPeso, calculaComprovantePendente],
    afterOperation: [auditarAcesso('inscricoes')],
    beforeChange: [preparaInscricao],
  },
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
      name: 'categoriaPeso',
      label: 'Categoria de peso',
      type: 'text',
      index: true,
      admin: {
        placeholder: 'Ex.: 73 kg',
        description:
          'Preenchida automaticamente com a resposta "Categoria de peso" do formulário. Confira antes de confirmar a inscrição — é a categoria que organiza a competição.',
      },
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
      name: 'arquivosEnviados',
      label: 'Arquivos enviados',
      type: 'join',
      collection: 'arquivos-inscricao',
      on: 'inscricao',
      admin: {
        description:
          'Atestados, comprovantes e documentos anexados pelo atleta. Privados: o download exige sessão do painel.',
      },
    },
    {
      name: 'comprovantesPagamento',
      label: 'Comprovantes de pagamento',
      type: 'join',
      collection: 'arquivos-inscricao',
      on: 'inscricao',
      where: { campo: { equals: CAMPO_COMPROVANTE } },
      admin: {
        defaultColumns: ['titulo', 'createdAt'],
        description:
          'Comprovantes enviados depois da inscrição pela área do atleta. A federação recebe uma cópia por e-mail a cada envio. Se este bloco estiver vazio, a inscrição aparece como pendente de comprovante na área do atleta.',
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
            {
              name: 'ipHash',
              label: 'Origem (IP pseudonimizado)',
              type: 'text',
              admin: { width: '40%' },
            },
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
      name: 'situacaoComprovante',
      label: 'Comprovante',
      type: 'text',
      virtual: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description:
          'Calculado automaticamente: "Pendente" quando a inscrição está ativa e não tem comprovante de pagamento; "Enviado" quando já tem; "—" quando a inscrição está encerrada. Não é uma coluna do banco.',
      },
    },
    {
      name: 'retencaoAte',
      label: 'Eliminar/anonimizar em',
      type: 'date',
      admin: {
        position: 'sidebar',
        readOnly: true,
        date: { pickerAppearance: 'dayOnly' },
        description:
          'Calculado a partir do prazo do formulário. O expurgo automático entra na Fase 2.',
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
