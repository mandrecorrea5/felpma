import type { EmailAdapter, Payload } from 'payload'
import { resendAdapter } from '@payloadcms/email-resend'
import { emailAtivacaoConta } from './email-templates'

/**
 * E-mail transacional pelo Resend (API HTTP).
 *
 * As credenciais entram só por variável de ambiente:
 *  - `RESEND_API_KEY` — chave criada em Resend → API Keys;
 *  - `EMAIL_FROM_ADDRESS` — remetente de um domínio verificado no Resend;
 *  - `EMAIL_FROM_NAME` — nome exibido na caixa de entrada.
 *
 * Sem as duas primeiras, o site continua funcionando em desenvolvimento: em vez
 * de enviar, o link de ativação/recuperação é impresso no terminal. Em produção,
 * o cadastro é bloqueado antes de chegar aqui (ver `emailDisponivel`) e o envio
 * falha de forma explícita — melhor do que uma conta criada sem e-mail nenhum.
 */

export const emailConfigurado = (): boolean =>
  Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM_ADDRESS?.trim())

/**
 * O envio está operacional? Em produção exige as credenciais do Resend; em
 * desenvolvimento o adaptador simulado imprime o link no terminal.
 */
export const emailDisponivel = (): boolean =>
  emailConfigurado() || process.env.NODE_ENV !== 'production'

const remetente = (): string =>
  process.env.EMAIL_FROM_ADDRESS?.trim() || 'nao-responda@felpma.com.br'

const nomeRemetente = (): string => process.env.EMAIL_FROM_NAME?.trim() || 'FELPMA'

/** Extrai o primeiro link do HTML para o log de desenvolvimento. */
const primeiroLink = (html?: null | string): string | undefined =>
  typeof html === 'string' ? html.match(/https?:\/\/[^\s"'<>]+/)?.[0] : undefined

const adapterSimulado: EmailAdapter = ({ payload }) => ({
  name: 'simulado-dev',
  defaultFromAddress: remetente(),
  defaultFromName: nomeRemetente(),
  async sendEmail(message) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Resend não configurado: defina RESEND_API_KEY e EMAIL_FROM_ADDRESS no ambiente.',
      )
    }

    const para = Array.isArray(message.to) ? message.to.join(', ') : String(message.to ?? '')
    payload.logger.info(
      `[e-mail simulado] para=${para} assunto=${String(message.subject ?? '')} link=${
        primeiroLink(message.html as string) ?? '(sem link)'
      }`,
    )
    return { simulado: true }
  },
})

export const emailAdapter: EmailAdapter = (args) => {
  if (!emailConfigurado()) return adapterSimulado(args)

  return resendAdapter({
    apiKey: process.env.RESEND_API_KEY as string,
    defaultFromAddress: remetente(),
    defaultFromName: nomeRemetente(),
  })(args)
}

/** Envia o link de ativação da conta de atleta recém-criada. */
export async function enviarEmailAtivacao(
  payload: Payload,
  args: { email: string; nome?: null | string; token: string },
): Promise<void> {
  await payload.sendEmail({
    to: args.email,
    subject: 'Ative sua conta — FELPMA',
    html: emailAtivacaoConta(args.token, args.nome),
  })
}
