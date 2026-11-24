import type { CollectionAfterChangeHook, CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { authenticated } from '../access'
import { emailContato } from '../lib/email'
import { emailRespostaContato } from '../lib/email-templates'

const ROTULO_ASSUNTO: Record<string, string> = {
  filiacao: 'Filiação',
  competicoes: 'Competições',
  imprensa: 'Imprensa',
  parcerias: 'Patrocínio e parcerias',
  outros: 'Outros',
}

/**
 * Envia a resposta escrita no painel para o visitante.
 *
 * O gatilho é a caixa "Enviar esta resposta" marcada num update — assim o
 * editor escreve, revisa e só então dispara, sem botão mágico. Depois do envio
 * a caixa é desmarcada, `respondidaEm` é preenchido e a mensagem vira
 * "Respondida" (o `contexto` evita que esse update dispare o hook de novo).
 *
 * Se o Resend falhar, o erro sobe para o painel: o texto continua salvo e a
 * caixa segue marcada, então salvar de novo tenta o reenvio.
 */
const enviaRespostaAoVisitante: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (operation !== 'update') return doc
  if (req.context?.respostaEnviada) return doc
  if (!doc?.enviarResposta) return doc

  const resposta = String(doc.resposta ?? '').trim()
  if (!resposta) {
    throw new APIError('Escreva a resposta antes de marcar o envio ao visitante.', 400)
  }

  const assunto = ROTULO_ASSUNTO[String(doc.assunto ?? 'outros')] ?? ROTULO_ASSUNTO.outros

  try {
    await req.payload.sendEmail({
      to: String(doc.email),
      // A resposta do visitante volta para a caixa de contato da federação.
      replyTo: emailContato(),
      subject: `Resposta da FELPMA — ${assunto}`,
      html: emailRespostaContato({
        assunto,
        mensagemOriginal: String(doc.mensagem ?? ''),
        nome: String(doc.nome ?? ''),
        resposta,
      }),
    })
  } catch (erro) {
    req.payload.logger.error({ err: erro, msg: 'Falha ao enviar resposta ao visitante' })
    throw new APIError(
      'Não foi possível enviar o e-mail agora. A resposta ficou salva; salve de novo para tentar outra vez.',
      502,
    )
  }

  const respondidaEm = new Date().toISOString()

  // `req` mantém o update na MESMA transação do save — sem ele o banco trava
  // a linha (o update de fora ainda não commitou) e o painel fica girando.
  await req.payload.update({
    req,
    collection: 'mensagens',
    id: doc.id,
    data: { enviarResposta: false, respondidaEm, status: 'respondida' },
    context: { respostaEnviada: true },
    overrideAccess: true,
  })

  // O painel exibe o `doc` devolvido pelo update externo; sem espelhar aqui,
  // a caixa continuaria marcada na tela até recarregar.
  doc.enviarResposta = false
  doc.status = 'respondida'
  doc.respondidaEm = respondidaEm

  return doc
}

/** Mensagens enviadas pelo formulário de contato do site. */
export const Mensagens: CollectionConfig = {
  slug: 'mensagens',
  typescript: { interface: 'Mensagem' },
  labels: { singular: 'Mensagem de contato', plural: 'Mensagens de contato' },
  admin: {
    useAsTitle: 'assunto',
    group: 'Conteúdo',
    defaultColumns: ['assunto', 'nome', 'email', 'status', 'respondidaEm', 'createdAt'],
    description:
      'Para responder ao visitante: abra a mensagem, escreva em "Resposta ao visitante", marque "Enviar esta resposta por e-mail" e clique em Salvar. O e-mail sai com o texto e a mensagem original citada.',
  },
  access: {
    // A criação acontece só pelo servidor (server action com overrideAccess).
    create: () => false,
    read: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  hooks: {
    afterChange: [enviaRespostaAoVisitante],
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
    {
      name: 'mensagem',
      type: 'textarea',
      required: true,
      admin: { description: 'Mensagem recebida do visitante.' },
    },
    {
      name: 'resposta',
      label: 'Resposta ao visitante',
      type: 'textarea',
      admin: {
        description:
          'Escreva aqui a resposta. Ela só é enviada quando a caixa abaixo está marcada ao salvar — assim dá para revisar antes.',
      },
    },
    {
      name: 'enviarResposta',
      label: 'Enviar esta resposta por e-mail ao visitante',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'Depois do envio a caixa é desmarcada sozinha, o campo "Respondida em" é preenchido e a situação vira "Respondida".',
      },
    },
    {
      name: 'respondidaEm',
      label: 'Respondida em',
      type: 'date',
      admin: {
        position: 'sidebar',
        readOnly: true,
        date: { pickerAppearance: 'dayAndTime', displayFormat: 'dd/MM/yyyy HH:mm' },
      },
    },
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
