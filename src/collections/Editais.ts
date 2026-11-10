import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionConfig,
} from 'payload'
import { authenticated, doPainel } from '../access'
import { revalidateHooks } from '../hooks/revalidate'
import {
  ABERTURA_PADRAO,
  CATEGORIAS_IDADE_PADRAO,
  CATEGORIAS_PESO_PADRAO,
  DIREITOS_IMAGEM_PADRAO,
  DISPOSICOES_PADRAO,
  INSCRICOES_REGRAS_PADRAO,
  INSCRICOES_TEXTO_PADRAO,
  OBSERVACAO_TAXAS_PADRAO,
  REGRAS_PADRAO,
  REQUISITOS_PADRAO,
  TAXAS_PADRAO,
} from '../lib/editais/padrao'
import { gerarPdfEdital, type EditalParaPdf } from '../lib/editais/pdf'

type EditalGerado = EditalParaPdf & {
  createdAt?: string
  documento?: number | { id: number } | null
  id: number | string
  publicado?: boolean | null
}

const idDoDocumento = (valor: EditalGerado['documento']): number | null => {
  if (valor == null) return null
  return typeof valor === 'object' ? valor.id : valor
}

const nomeDoArquivo = (edital: EditalGerado): string => {
  const numero = String(edital.numero ?? '01')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
  // Nome estável: editar o título não cria um arquivo novo a cada salvamento;
  // o id evita colisão entre dois editais com a mesma numeração.
  return `edital-${numero}-${edital.ano}-${edital.id}.pdf`
}

/**
 * O edital é estruturado, mas o site publica documentos em PDF. Ao salvar com
 * "Publicado no site" marcado, o PDF é gerado no padrão e gravado/atualizado em
 * `documentos` — o mesmo lugar em que a federação já anexa editais.
 *
 * A falha na geração não derruba o salvamento do conteúdo: o administrador pode
 * baixar o PDF pela tela de edição e tentar de novo.
 */
const publicaPdf: CollectionAfterChangeHook = async ({ doc, req }) => {
  if (req.context?.gerandoPdfEdital) return doc

  const edital = doc as EditalGerado
  const documentoId = idDoDocumento(edital.documento)

  if (!edital.publicado) {
    if (documentoId) {
      try {
        await req.payload.update({
          collection: 'documentos',
          id: documentoId,
          data: { publico: false },
          overrideAccess: true,
          req,
          context: { gerandoPdfEdital: true },
        })
      } catch (erro) {
        req.payload.logger.error({ err: erro, msg: 'Falha ao despublicar PDF do edital' })
      }
    }
    return doc
  }

  try {
    const configuracoes = await req.payload.findGlobal({
      slug: 'configuracoes',
      depth: 1,
      overrideAccess: true,
    })
    const pdf = await gerarPdfEdital(edital, configuracoes)
    const arquivo = {
      data: pdf,
      mimetype: 'application/pdf',
      name: nomeDoArquivo(edital),
      size: pdf.length,
    }
    const dados = {
      titulo: `Edital ${edital.numero}/${edital.ano} — ${edital.titulo}`,
      categoria: 'edital' as const,
      ano: edital.ano,
      descricao: `Edital de convocação para ${edital.titulo}. Documento gerado automaticamente a partir do edital cadastrado no painel.`,
      dataPublicacao: edital.createdAt ?? new Date().toISOString(),
      publico: true,
    }

    if (documentoId) {
      await req.payload.update({
        collection: 'documentos',
        id: documentoId,
        data: dados,
        file: arquivo,
        overwriteExistingFiles: true,
        overrideAccess: true,
        req,
        context: { gerandoPdfEdital: true },
      })
    } else {
      const criado = await req.payload.create({
        collection: 'documentos',
        data: dados,
        file: arquivo,
        overrideAccess: true,
        req,
        context: { gerandoPdfEdital: true },
      })
      await req.payload.update({
        collection: 'editais',
        id: edital.id,
        data: { documento: criado.id },
        overrideAccess: true,
        req,
        context: { gerandoPdfEdital: true },
      })
    }
  } catch (erro) {
    req.payload.logger.error({ err: erro, msg: `Falha ao gerar PDF do edital ${edital.id}` })
  }

  return doc
}

/** Ao excluir o edital, o PDF deixa de aparecer no site em vez de virar órfão público. */
const despublicaPdf: CollectionAfterDeleteHook = async ({ doc, req }) => {
  const documentoId = idDoDocumento((doc as EditalGerado)?.documento)
  if (!documentoId) return
  try {
    await req.payload.update({
      collection: 'documentos',
      id: documentoId,
      data: { publico: false },
      overrideAccess: true,
      req,
      context: { gerandoPdfEdital: true },
    })
  } catch (erro) {
    req.payload.logger.error({ err: erro, msg: 'Falha ao despublicar PDF do edital excluído' })
  }
}

const campoTexto = (name: string, label: string, descricao?: string) => ({
  name,
  label,
  type: 'textarea' as const,
  admin: descricao ? { description: descricao } : undefined,
})

export const Editais: CollectionConfig = {
  slug: 'editais',
  typescript: { interface: 'Edital' },
  labels: { singular: 'Edital', plural: 'Editais' },
  admin: {
    useAsTitle: 'titulo',
    group: 'Competições',
    defaultColumns: ['numero', 'ano', 'titulo', 'dataEvento', 'publicado'],
    listSearchableFields: ['titulo', 'numero'],
    description:
      'Cadastre o edital uma vez. O PDF no padrão da federação é gerado ao salvar e, com "Publicado", entra em Documentos.',
    components: {
      edit: {
        beforeDocumentControls: ['/components/admin/BaixarEdital#BaixarEdital'],
      },
    },
  },
  access: {
    read: ({ req: { user } }) => (doPainel(user) ? true : { publicado: { equals: true } }),
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  endpoints: [
    {
      path: '/:id/pdf',
      method: 'get',
      handler: async (req) => {
        const id = req.routeParams?.id
        if (!id) return Response.json({ erro: 'Edital não informado.' }, { status: 400 })

        try {
          const edital = await req.payload.findByID({
            collection: 'editais',
            id: id as number | string,
            depth: 0,
            overrideAccess: true,
          })

          if (!edital.publicado && !doPainel(req.user)) {
            return Response.json({ erro: 'Edital não encontrado.' }, { status: 404 })
          }

          const configuracoes = await req.payload.findGlobal({
            slug: 'configuracoes',
            depth: 1,
            overrideAccess: true,
          })
          const pdf = await gerarPdfEdital(edital, configuracoes)
          const arquivo = nomeDoArquivo(edital)

          return new Response(pdf, {
            status: 200,
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `inline; filename="${arquivo}"`,
              'Cache-Control': 'no-store',
              'X-Content-Type-Options': 'nosniff',
            },
          })
        } catch (erro) {
          req.payload.logger.error({ err: erro, msg: 'Falha ao gerar PDF do edital' })
          return Response.json({ erro: 'Não foi possível gerar o PDF.' }, { status: 500 })
        }
      },
    },
  ],
  hooks: {
    ...revalidateHooks,
    afterChange: [...revalidateHooks.afterChange, publicaPdf],
    afterDelete: [...revalidateHooks.afterDelete, despublicaPdf],
  },
  defaultSort: '-ano',
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Edital',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'numero',
                  label: 'Número',
                  type: 'text',
                  required: true,
                  defaultValue: '01',
                  admin: {
                    width: '30%',
                    description: 'Ex.: 01. O PDF mostra "Edital 01/2025".',
                  },
                },
                {
                  name: 'ano',
                  label: 'Ano',
                  type: 'number',
                  required: true,
                  defaultValue: () => new Date().getFullYear(),
                  admin: { width: '20%' },
                },
                {
                  name: 'dataEvento',
                  label: 'Data da competição',
                  type: 'date',
                  required: true,
                  admin: {
                    width: '25%',
                    date: { pickerAppearance: 'dayOnly', displayFormat: 'dd/MM/yyyy' },
                  },
                },
                {
                  name: 'horario',
                  label: 'Horário',
                  type: 'text',
                  admin: { width: '25%', description: 'Ex.: a partir das 8h.' },
                },
              ],
            },
            {
              name: 'titulo',
              label: 'Título da convocação',
              type: 'text',
              required: true,
              admin: {
                description:
                  'Ex.: "I ETAPA DO CAMPEONATO ESTADUAL DE LEVANTAMENTO DE PESOS — COPA DIMAS".',
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'local',
                  label: 'Local',
                  type: 'text',
                  required: true,
                  admin: { width: '50%', description: 'Ex.: SPORT VILLAGE — espaço CTLPO-MA.' },
                },
                {
                  name: 'endereco',
                  label: 'Endereço completo',
                  type: 'text',
                  required: true,
                  admin: { width: '50%' },
                },
              ],
            },
            {
              name: 'pesagem',
              label: 'Informação extra de pesagem',
              type: 'textarea',
              admin: {
                description:
                  'Opcional. Ex.: "A pesagem acontece das 7h às 8h, na sala ao lado do ginásio."',
              },
            },
            {
              name: 'competicao',
              label: 'Competição vinculada',
              type: 'relationship',
              relationTo: 'competicoes',
              admin: {
                description: 'Opcional. Serve para ligar o edital ao evento no calendário.',
              },
            },
            {
              ...campoTexto(
                'abertura',
                'Abertura',
                'Texto abaixo do título. Use {titulo}, {ano}, {local} e {cidade} para preencher automaticamente.',
              ),
              defaultValue: ABERTURA_PADRAO,
            },
            {
              ...campoTexto('disposicoes', 'Disposições preliminares'),
              defaultValue: DISPOSICOES_PADRAO,
            },
          ],
        },
        {
          label: 'Inscrições e taxas',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'inscricoesDe',
                  label: 'Inscrições de',
                  type: 'date',
                  required: true,
                  admin: {
                    width: '35%',
                    date: { pickerAppearance: 'dayOnly', displayFormat: 'dd/MM/yyyy' },
                  },
                },
                {
                  name: 'inscricoesAte',
                  label: 'Inscrições até',
                  type: 'date',
                  required: true,
                  admin: {
                    width: '35%',
                    date: { pickerAppearance: 'dayOnly', displayFormat: 'dd/MM/yyyy' },
                  },
                },
                {
                  name: 'emailInscricao',
                  label: 'E-mail para comprovante',
                  type: 'email',
                  defaultValue: 'felpmaranhao@gmail.com',
                  admin: { width: '30%' },
                },
              ],
            },
            {
              ...campoTexto(
                'inscricoesTexto',
                'Texto das inscrições',
                'Use {inscricoesDe}, {inscricoesAte} e {emailInscricao} para preencher automaticamente.',
              ),
              defaultValue: INSCRICOES_TEXTO_PADRAO,
            },
            {
              name: 'taxas',
              label: 'Tabela de taxas',
              type: 'array',
              labels: { singular: 'Faixa', plural: 'Faixas' },
              defaultValue: TAXAS_PADRAO,
              admin: { description: 'Cada linha vira uma linha da tabela no PDF.' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'categoria',
                      label: 'Categoria de idade',
                      type: 'text',
                      admin: { width: '50%' },
                    },
                    { name: 'federado', label: 'Federado', type: 'text', admin: { width: '25%' } },
                    {
                      name: 'naoFederado',
                      label: 'Não-federado',
                      type: 'text',
                      admin: { width: '25%' },
                    },
                  ],
                },
              ],
            },
            {
              ...campoTexto('observacaoTaxas', 'Observação abaixo da tabela de taxas'),
              defaultValue: OBSERVACAO_TAXAS_PADRAO,
            },
            {
              name: 'inscricoesRegras',
              label: 'Regras após a tabela',
              type: 'array',
              labels: { singular: 'Regra', plural: 'Regras' },
              defaultValue: INSCRICOES_REGRAS_PADRAO,
              fields: [{ name: 'texto', type: 'textarea', required: true }],
            },
          ],
        },
        {
          label: 'Categorias',
          fields: [
            {
              name: 'categoriasIdade',
              label: 'Categorias de idade',
              type: 'array',
              labels: { singular: 'Categoria', plural: 'Categorias' },
              defaultValue: CATEGORIAS_IDADE_PADRAO,
              admin: { description: 'Use {ano} para o ano do edital.' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'nome',
                      label: 'Nome',
                      type: 'text',
                      required: true,
                      admin: { width: '35%' },
                    },
                    {
                      name: 'descricao',
                      label: 'Descrição',
                      type: 'text',
                      admin: { width: '65%' },
                    },
                  ],
                },
              ],
            },
            {
              name: 'categoriasPeso',
              label: 'Tabelas de peso',
              type: 'array',
              labels: { singular: 'Tabela', plural: 'Tabelas' },
              defaultValue: CATEGORIAS_PESO_PADRAO,
              admin: {
                description: 'Ex.: uma tabela para Sub-12 e outra para as demais categorias.',
              },
              fields: [
                { name: 'titulo', label: 'Título da tabela', type: 'text', required: true },
                {
                  name: 'linhas',
                  label: 'Linhas',
                  type: 'array',
                  labels: { singular: 'Linha', plural: 'Linhas' },
                  fields: [
                    {
                      type: 'row',
                      fields: [
                        {
                          name: 'masculino',
                          label: 'Masculino',
                          type: 'text',
                          admin: { width: '50%' },
                        },
                        {
                          name: 'feminino',
                          label: 'Feminino',
                          type: 'text',
                          admin: { width: '50%' },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Requisitos e textos finais',
          fields: [
            {
              name: 'requisitos',
              label: 'Requisitos para competição',
              type: 'array',
              labels: { singular: 'Requisito', plural: 'Requisitos' },
              defaultValue: REQUISITOS_PADRAO,
              fields: [{ name: 'texto', type: 'textarea', required: true }],
            },
            {
              ...campoTexto('regras', 'Regras da competição'),
              defaultValue: REGRAS_PADRAO,
            },
            {
              ...campoTexto('direitosImagem', 'Direitos de imagem'),
              defaultValue: DIREITOS_IMAGEM_PADRAO,
            },
            {
              ...campoTexto('observacoesFinais', 'Disposições finais (opcional)'),
            },
          ],
        },
      ],
    },
    {
      name: 'publicado',
      label: 'Publicado no site',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description:
          'Ao marcar, o PDF é gerado no padrão e aparece em Documentos › Editais e notas oficiais.',
      },
    },
    {
      name: 'documento',
      label: 'PDF publicado',
      type: 'relationship',
      relationTo: 'documentos',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Gerado automaticamente. Não precisa anexar nada aqui.',
      },
    },
    {
      name: 'cidadeAssinatura',
      label: 'Cidade da assinatura',
      type: 'text',
      defaultValue: 'São Luís',
      admin: { position: 'sidebar' },
    },
  ],
}
