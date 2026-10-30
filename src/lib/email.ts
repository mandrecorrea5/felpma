import type { EmailAdapter } from 'payload'
import nodemailer, { type Transporter } from 'nodemailer'

/**
 * E-mail transacional por SMTP.
 *
 * A federação ainda não tem o provedor contratado, então as credenciais entram
 * só por variável de ambiente (`SMTP_*`). Até lá:
 *  - desenvolvimento: em vez de enviar, o link de verificação/recuperação é
 *    impresso no terminal — dá para testar o fluxo inteiro;
 *  - produção sem SMTP: o envio falha de forma explícita e o cadastro é
 *    bloqueado antes de chegar aqui (ver `smtpConfigurado`).
 */

export const smtpConfigurado = (): boolean =>
  Boolean(process.env.SMTP_HOST?.trim() && process.env.SMTP_FROM?.trim())

let transporte: null | Transporter = null

const getTransporte = (): Transporter => {
  if (transporte) return transporte
  const porta = Number(process.env.SMTP_PORT ?? 587)
  transporte = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: porta,
    secure: porta === 465,
    auth: process.env.SMTP_USER
      ? { pass: process.env.SMTP_PASS, user: process.env.SMTP_USER }
      : undefined,
  })
  return transporte
}

/** Extrai o primeiro link do HTML para o log de desenvolvimento. */
const primeiroLink = (html?: null | string): string | undefined =>
  typeof html === 'string' ? html.match(/https?:\/\/[^\s"'<>]+/)?.[0] : undefined

export const emailAdapter: EmailAdapter = ({ payload }) => {
  const defaultFromAddress = process.env.SMTP_FROM?.trim() || 'nao-responda@felpma.org.br'
  const defaultFromName = process.env.SMTP_FROM_NOME?.trim() || 'FELPMA'

  return {
    name: 'smtp-felpma',
    defaultFromAddress,
    defaultFromName,
    async sendEmail(message) {
      const para = Array.isArray(message.to)
        ? message.to.join(', ')
        : String(message.to ?? '')

      if (!smtpConfigurado()) {
        if (process.env.NODE_ENV !== 'production') {
          payload.logger.info(
            `[e-mail simulado] para=${para} assunto=${String(message.subject ?? '')} link=${
              primeiroLink(message.html as string) ?? '(sem link)'
            }`,
          )
          return { simulado: true }
        }
        throw new Error(
          'SMTP não configurado: defina SMTP_HOST, SMTP_PORT, SMTP_FROM e as credenciais.',
        )
      }

      return getTransporte().sendMail({
        ...message,
        from: message.from ?? `"${defaultFromName}" <${defaultFromAddress}>`,
      })
    },
  }
}
