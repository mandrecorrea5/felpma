/** Templates de e-mail transacional. Sem dados sensíveis no corpo — só nome e link. */

const base = () => (process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000').replace(/\/+$/, '')

const layout = (titulo: string, corpo: string): string => `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background:#f6f6f9;font-family:Arial,Helvetica,sans-serif;color:#14141a">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f9;padding:24px 12px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e6e6ec">
            <tr>
              <td style="height:6px;background:#1c0a96"></td>
            </tr>
            <tr>
              <td style="padding:28px 32px 8px">
                <p style="margin:0;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#5a5a66">FELPMA</p>
                <h1 style="margin:8px 0 0;font-size:22px;line-height:1.25;color:#14141a">${titulo}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 32px 28px;font-size:15px;line-height:1.6;color:#3e3e48">
                ${corpo}
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#5a5a66">
                  Você recebeu este e-mail porque um cadastro foi iniciado no site da FELPMA.
                  Se não foi você, ignore esta mensagem — nenhuma conta será ativada.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

const botao = (url: string, rotulo: string): string =>
  `<p style="margin:24px 0"><a href="${url}" style="display:inline-block;background:#1c0a96;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 22px;border-radius:10px">${rotulo}</a></p>
   <p style="margin:0;font-size:13px;color:#5a5a66;word-break:break-all">Ou copie este endereço: ${url}</p>`

export const emailRecuperacaoSenha = (token: string, nome?: null | string): string => {
  const url = `${base()}/area/redefinir-senha?token=${encodeURIComponent(token)}`
  const saudacao = nome ? `Olá, ${nome.split(' ')[0]}.` : 'Olá.'
  return layout(
    'Redefinir sua senha',
    `<p style="margin:0">${saudacao} Recebemos um pedido para redefinir a senha da sua conta.</p>
     ${botao(url, 'Criar nova senha')}
     <p style="margin:16px 0 0;font-size:13px;color:#5a5a66">O link vale por 1 hora. Se não foi você, ignore o e-mail: sua senha atual continua valendo.</p>`,
  )
}
