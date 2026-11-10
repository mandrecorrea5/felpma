import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { authenticated, doPainel, isAdmin, isAdminUser } from '../access'
import { camposFormulario } from '../blocks/campos-formulario'
import { BASES_LEGAIS, FINALIDADES_CONSENTIMENTO } from '../lib/constants'
import { gerarCsvInscricoes, respostaCsv } from '../lib/inscricoes/exportacao'
import { registrarAcesso } from '../lib/lgpd/auditoria'

/** Nomes que a inscrição já usa na identificação — não podem ser repetidos nos campos. */
const NOMES_RESERVADOS = new Set(['nome', 'email', 'cpf', 'nascimento', 'telefone', 'responsavel'])

/** Aceita a relação já populada (objeto) ou só o id, como o painel e a API enviam. */
const idDaRelacao = (valor: unknown): number | string | null => {
  if (valor == null) return null
  if (typeof valor === 'number' || typeof valor === 'string') return valor
  if (typeof valor === 'object' && 'id' in valor) {
    return (valor as { id?: number | string }).id ?? null
  }
  return null
}

/**
 * Formulário de inscrição de um evento.
 *
 * É versionado (drafts): publicar gera uma versão nova, e cada inscrição guarda
 * a versão + o snapshot das perguntas. Assim, editar o formulário amanhã não
 * reescreve o que a pessoa respondeu ontem.
 */
const validaAntesDeSalvar: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  const campos = Array.isArray(data?.campos) ? data.campos : []
  const nomes = campos
    .map((c) => (typeof c?.nome === 'string' ? c.nome.trim() : ''))
    .filter(Boolean)

  const repetido = nomes.find((n, i) => nomes.indexOf(n) !== i)
  if (repetido) {
    throw new APIError(`O nome técnico "${repetido}" está repetido em dois campos.`, 400)
  }

  const reservado = nomes.find((n) => NOMES_RESERVADOS.has(n))
  if (reservado) {
    throw new APIError(
      `"${reservado}" é reservado para a identificação do atleta. Escolha outro nome técnico.`,
      400,
    )
  }

  // O evento não pode mudar depois que existe inscrição: misturaria titulares
  // de eventos diferentes no mesmo histórico.
  if (
    operation === 'update' &&
    originalDoc?.id &&
    data?.evento &&
    String(data.evento) !== String(originalDoc.evento)
  ) {
    const { totalDocs } = await req.payload.count({
      collection: 'inscricoes',
      where: { formulario: { equals: originalDoc.id } },
    })
    if (totalDocs > 0) {
      throw new APIError(
        'Este formulário já tem inscrições recebidas. O evento não pode ser trocado.',
        400,
      )
    }
  }

  // Só exige o bloco de LGPD completo na hora de publicar — rascunho pode ficar pela metade.
  if (data?._status === 'published') {
    const lgpd = (data.lgpd ?? {}) as Record<string, unknown>
    if (!lgpd.finalidade) throw new APIError('Preencha a finalidade do tratamento (aba LGPD).', 400)
    if (!lgpd.versaoAviso)
      throw new APIError('Informe a versão do aviso de privacidade (aba LGPD).', 400)
    if (!lgpd.prazoRetencaoMeses || Number(lgpd.prazoRetencaoMeses) < 1) {
      throw new APIError('Informe por quantos meses os dados serão guardados (aba LGPD).', 400)
    }
    if (!Array.isArray(data.consentimentos) || data.consentimentos.length === 0) {
      throw new APIError('Cadastre ao menos um consentimento na aba LGPD.', 400)
    }
    if (campos.length === 0) {
      throw new APIError('Adicione ao menos um campo ao formulário.', 400)
    }
    // O modal só ajuda se o arquivo abrir para quem não está logado no painel:
    // documento privado viraria um link quebrado na hora da confirmação.
    const arquivoDoModal = idDaRelacao(
      (data.confirmacao as { arquivo?: unknown } | undefined)?.arquivo,
    )
    if (arquivoDoModal) {
      try {
        const documento = await req.payload.findByID({
          collection: 'documentos',
          id: arquivoDoModal,
          depth: 0,
          overrideAccess: true,
        })
        if (!documento.publico) {
          throw new APIError(
            'O arquivo do modal não está visível no site. Marque "Visível no site" em Documentos antes de publicar o formulário.',
            400,
          )
        }
      } catch (erro) {
        if (erro instanceof APIError) throw erro
        throw new APIError(
          'O documento escolhido para o modal não existe mais. Escolha outro em Documentos.',
          400,
        )
      }
    }
    const estavaPublicado = originalDoc?._status === 'published'
    if (!estavaPublicado) {
      data.versao = Number(originalDoc?.versao ?? 0) + 1
    }
  }

  return data
}

export const FormulariosInscricao: CollectionConfig = {
  slug: 'formularios-inscricao',
  typescript: { interface: 'FormularioInscricao' },
  labels: { singular: 'Formulário de inscrição', plural: 'Formulários de inscrição' },
  admin: {
    useAsTitle: 'titulo',
    group: 'Inscrições',
    defaultColumns: ['titulo', 'evento', 'versao', '_status', 'updatedAt'],
    description:
      'Cada formulário pertence a um evento. Quem libera a inscrição no site é o evento, não o formulário. Abra um formulário para exportar os inscritos em CSV.',
    components: {
      edit: {
        beforeDocumentControls: ['/components/admin/ExportarInscritos#ExportarInscritos'],
      },
    },
  },
  versions: { drafts: true, maxPerDoc: 20 },
  access: {
    // O site público lê com a API local (overrideAccess), nunca por REST anônimo:
    // o formulário expõe a estrutura interna e o texto de LGPD.
    read: ({ req: { user } }) => doPainel(user),
    create: authenticated,
    update: authenticated,
    delete: isAdmin,
  },
  hooks: { beforeChange: [validaAntesDeSalvar] },
  endpoints: [
    {
      path: '/:id/exportar',
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

        const id = req.routeParams?.id
        if (!id) return Response.json({ erro: 'Formulário não informado.' }, { status: 400 })

        try {
          const formulario = await req.payload.findByID({
            collection: 'formularios-inscricao',
            id: id as number | string,
            depth: 0,
            overrideAccess: true,
          })

          const { docs: inscricoes } = await req.payload.find({
            collection: 'inscricoes',
            where: { formulario: { equals: formulario.id } },
            sort: 'enviadaEm',
            depth: 2,
            pagination: false,
            overrideAccess: true,
          })

          const exportacao = gerarCsvInscricoes(formulario, inscricoes)
          req.payload.logger.info(
            `[exportacao] formulário ${formulario.id}: ${exportacao.linhas} inscrições exportadas por ${req.user?.email ?? req.user?.id}`,
          )
          registrarAcesso({
            acao: 'leitura',
            colecao: 'inscricoes',
            documento: formulario.id,
            detalhe: {
              evento: formulario.evento,
              formato: 'csv',
              formulario: formulario.id,
              registros: exportacao.linhas,
            },
            ...(req.user?.id != null ? { usuario: req.user.id } : {}),
          })

          return respostaCsv(exportacao)
        } catch (erro) {
          req.payload.logger.error({ err: erro, msg: 'Falha ao exportar inscrições' })
          return Response.json({ erro: 'Não foi possível gerar a exportação.' }, { status: 500 })
        }
      },
    },
  ],
  defaultSort: '-updatedAt',
  fields: [
    {
      name: 'titulo',
      label: 'Título',
      type: 'text',
      required: true,
      admin: { description: 'Ex.: "Inscrição — Maranhense Sub-15 a Sênior 2027".' },
    },
    {
      name: 'descricao',
      label: 'Instruções',
      type: 'richText',
      admin: { description: 'Aparece no topo do formulário: requisitos, documentos, categorias.' },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Campos',
          fields: [
            {
              name: 'campos',
              label: 'Perguntas do formulário',
              type: 'blocks',
              blocks: camposFormulario,
              required: true,
              minRows: 1,
              admin: {
                description:
                  'A identificação (nome, e-mail, CPF, nascimento) é automática e não precisa estar aqui.',
              },
            },
          ],
        },
        {
          label: 'LGPD',
          fields: [
            {
              name: 'lgpd',
              label: 'Dados e finalidade',
              type: 'group',
              fields: [
                {
                  name: 'finalidade',
                  label: 'Finalidade do tratamento',
                  type: 'textarea',
                  required: true,
                  admin: {
                    description:
                      'Em linguagem simples: para que os dados são usados. Ex.: "Organizar a inscrição e a ordem de entrada na competição".',
                  },
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'baseLegal',
                      label: 'Base legal',
                      type: 'select',
                      required: true,
                      defaultValue: 'contrato',
                      options: [...BASES_LEGAIS],
                      admin: { width: '60%' },
                    },
                    {
                      name: 'prazoRetencaoMeses',
                      label: 'Guardar por (meses)',
                      type: 'number',
                      required: true,
                      defaultValue: 12,
                      min: 1,
                      max: 120,
                      admin: { width: '20%' },
                    },
                    {
                      name: 'versaoAviso',
                      label: 'Versão do aviso',
                      type: 'text',
                      required: true,
                      defaultValue: '2026-10',
                      admin: { width: '20%' },
                    },
                  ],
                },
                {
                  name: 'justificativaRetencao',
                  label: 'Por que guardar por esse prazo',
                  type: 'textarea',
                  admin: {
                    description:
                      'Ex.: "Prazo de defesa em processo disciplinar" ou "Guarda fiscal de 5 anos".',
                  },
                },
                {
                  name: 'avisoPrivacidade',
                  label: 'Aviso de privacidade exibido ao atleta',
                  type: 'richText',
                  required: true,
                  admin: {
                    description:
                      'Texto mostrado antes do envio, com finalidade, prazo, compartilhamento e direitos. A versão acima é gravada junto do aceite.',
                  },
                },
              ],
            },
            {
              name: 'consentimentos',
              label: 'Consentimentos',
              type: 'array',
              required: true,
              minRows: 1,
              labels: { singular: 'Consentimento', plural: 'Consentimentos' },
              admin: {
                description:
                  'Cada item vira um checkbox separado, nunca pré-marcado. O texto aceito é congelado na inscrição (com hash).',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'identificador',
                      label: 'Identificador',
                      type: 'text',
                      required: true,
                      admin: { width: '40%', description: 'Ex.: tratamento-inscricao' },
                    },
                    {
                      name: 'finalidade',
                      label: 'Finalidade',
                      type: 'select',
                      required: true,
                      options: [...FINALIDADES_CONSENTIMENTO],
                      admin: { width: '35%' },
                    },
                    {
                      name: 'obrigatorio',
                      label: 'Obrigatório',
                      type: 'checkbox',
                      defaultValue: true,
                      admin: { width: '25%' },
                    },
                  ],
                },
                {
                  name: 'texto',
                  label: 'Texto do consentimento',
                  type: 'textarea',
                  required: true,
                  admin: { description: 'Sem termos vagos. Diga o que será feito e com o quê.' },
                },
              ],
            },
          ],
        },
        {
          label: 'Mensagens',
          fields: [
            {
              name: 'mensagens',
              type: 'group',
              fields: [
                {
                  name: 'sucesso',
                  label: 'Mensagem após o envio',
                  type: 'textarea',
                  defaultValue:
                    'Inscrição recebida. Você receberá as próximas informações no e-mail da conta.',
                },
                {
                  name: 'foraDoPeriodo',
                  label: 'Mensagem fora do período',
                  type: 'textarea',
                  admin: { description: 'Só é usada se o evento não tiver aviso próprio.' },
                },
              ],
            },
            {
              name: 'confirmacao',
              label: 'Modal antes do envio',
              type: 'group',
              admin: {
                description:
                  'Abre quando o atleta clica em "Enviar inscrição", no último passo. Serve para ele ler o edital/regulamento e confirmar. Deixe em branco para enviar direto, sem modal.',
              },
              fields: [
                {
                  name: 'titulo',
                  label: 'Título do modal',
                  type: 'text',
                  defaultValue: 'Confirme sua inscrição',
                },
                {
                  name: 'texto',
                  label: 'Texto do modal',
                  type: 'textarea',
                  admin: {
                    description:
                      'Opcional. Ex.: "Confira os dados e leia o edital antes de confirmar. Depois do envio, alterações dependem da federação."',
                  },
                },
                {
                  name: 'arquivo',
                  label: 'Arquivo exibido no modal',
                  type: 'relationship',
                  relationTo: 'documentos',
                  filterOptions: () => ({ publico: { equals: true } }),
                  admin: {
                    description:
                      'Ex.: o edital da competição. Precisa estar com "Visível no site" marcado — o PDF dos editais publicados aparece em Documentos › Editais e notas oficiais.',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'evento',
      label: 'Evento',
      type: 'relationship',
      relationTo: 'competicoes',
      required: true,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'O formulário só aparece no site se este evento abrir as inscrições.',
      },
    },
    {
      name: 'versao',
      label: 'Versão',
      type: 'number',
      defaultValue: 1,
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'limitePorAtleta',
      label: 'Inscrições por atleta',
      type: 'number',
      defaultValue: 1,
      min: 1,
      max: 10,
      admin: { position: 'sidebar' },
    },
  ],
}
