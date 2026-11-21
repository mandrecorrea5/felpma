import 'server-only'
import type { Payload } from 'payload'
import type { Atleta, Competicao, Inscricao } from '@/payload-types'
import { labelOf, STATUS_INSCRICAO } from '@/lib/constants'
import { emailFederacao } from '@/lib/email'
import { emailFederacaoComprovante, emailFederacaoInscricao } from '@/lib/email-templates'
import { dataHora, periodo } from '@/lib/format'
import { detalhesDasRespostas } from './respostas-email'
import type { RespostaSnapshot } from './validacao'

/** Arquivo pronto para anexar ao e-mail operacional da federação. */
export type AnexoFederacao = { buffer: Buffer; mimetype: string; nome: string }

const baseUrl = (): string =>
  (process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000').replace(/\/+$/, '')

const adminUrl = (id: number | string): string =>
  `${baseUrl()}/admin/collections/inscricoes/${encodeURIComponent(String(id))}`

const localDoEvento = (
  evento: Pick<Competicao, 'cidade' | 'local' | 'uf'>,
): string => [evento.local, evento.cidade, evento.uf].filter(Boolean).join(' · ')

/**
 * A API do Resend recebe o conteúdo do anexo em base64. O adaptador do Payload
 * repassa o valor como veio, então não dá para entregar um Buffer cru: ele
 * viraria `{"type":"Buffer","data":[...]}` no JSON.
 */
const anexosParaEmail = (
  anexos: AnexoFederacao[],
): { content: string; filename: string }[] =>
  anexos.map((anexo) => ({
    content: anexo.buffer.toString('base64'),
    filename: anexo.nome,
  }))

type Envio = {
  anexos: AnexoFederacao[]
  html: string
  payload: Payload
  replyTo?: string
  subject: string
}

/**
 * Envia a cópia para a caixa da federação.
 *
 * Best-effort, como a confirmação do atleta: a inscrição/arquivo já foi gravado
 * e não pode falhar porque o Resend recusou um anexo. Se o envio com anexo
 * falhar, tenta de novo sem anexo para a federação ao menos saber que existe
 * algo para conferir no painel.
 */
async function enviarParaFederacao({ anexos, html, payload, replyTo, subject }: Envio): Promise<boolean> {
  const to = emailFederacao()

  try {
    await payload.sendEmail({
      to,
      subject,
      html,
      ...(replyTo ? { replyTo } : {}),
      ...(anexos.length > 0 ? { attachments: anexosParaEmail(anexos) } : {}),
    })
    return true
  } catch (erro) {
    console.error('[federacao] falha ao enviar e-mail com anexos', erro)

    if (anexos.length === 0) return false

    try {
      await payload.sendEmail({ to, subject, html, ...(replyTo ? { replyTo } : {}) })
      return false
    } catch (erroSemAnexo) {
      console.error('[federacao] falha ao enviar e-mail sem anexos', erroSemAnexo)
      return false
    }
  }
}

/** Cópia da inscrição recém-enviada, com todos os arquivos anexados. */
export async function enviarInscricaoParaFederacao(args: {
  anexos: AnexoFederacao[]
  atleta: Pick<Atleta, 'email' | 'nome' | 'telefone'>
  evento: Pick<Competicao, 'cidade' | 'dataFim' | 'dataInicio' | 'local' | 'nome' | 'uf'>
  inscricao: Pick<Inscricao, 'enviadaEm' | 'id' | 'protocolo' | 'status'>
  payload: Payload
  respostas: RespostaSnapshot[]
}): Promise<boolean> {
  const { anexos, atleta, evento, inscricao, payload, respostas } = args

  const html = emailFederacaoInscricao({
    adminUrl: adminUrl(inscricao.id),
    anexos: anexos.map((anexo) => anexo.nome),
    atleta: atleta.nome,
    emailAtleta: atleta.email,
    enviadaEm: dataHora(inscricao.enviadaEm),
    evento: evento.nome,
    local: localDoEvento(evento) || undefined,
    protocolo: inscricao.protocolo,
    quando: periodo(evento.dataInicio, evento.dataFim) || undefined,
    respostas: detalhesDasRespostas(respostas),
    situacao: labelOf(STATUS_INSCRICAO, inscricao.status),
    ...(atleta.telefone ? { telefone: atleta.telefone } : {}),
  })

  return enviarParaFederacao({
    anexos,
    html,
    payload,
    replyTo: atleta.email,
    subject: `Nova inscrição — ${evento.nome} — ${atleta.nome}`,
  })
}

/** Aviso de comprovante de pagamento enviado depois da inscrição. */
export async function enviarComprovanteParaFederacao(args: {
  anexo: AnexoFederacao
  atleta: Pick<Atleta, 'email' | 'nome' | 'telefone'>
  evento: Pick<Competicao, 'nome'>
  inscricao: Pick<Inscricao, 'enviadaEm' | 'id' | 'protocolo' | 'status'>
  payload: Payload
}): Promise<boolean> {
  const { anexo, atleta, evento, inscricao, payload } = args

  const html = emailFederacaoComprovante({
    adminUrl: adminUrl(inscricao.id),
    arquivo: anexo.nome,
    atleta: atleta.nome,
    emailAtleta: atleta.email,
    enviadaEm: dataHora(inscricao.enviadaEm),
    evento: evento.nome,
    protocolo: inscricao.protocolo,
    situacao: labelOf(STATUS_INSCRICAO, inscricao.status),
    ...(atleta.telefone ? { telefone: atleta.telefone } : {}),
  })

  return enviarParaFederacao({
    anexos: [anexo],
    html,
    payload,
    replyTo: atleta.email,
    subject: `Comprovante de pagamento — ${evento.nome} — ${atleta.nome}`,
  })
}
