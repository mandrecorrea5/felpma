/** Templates de e-mail transacional. Sem dados sensíveis no corpo — só nome e link. */

const base = () => (process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000').replace(/\/+$/, '')

/** Todo valor vindo do banco/entrada do usuário passa por aqui antes de virar HTML. */
const escapar = (valor: unknown): string =>
  String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const primeiroNome = (nome?: null | string): string | undefined => {
  const limpo = nome?.trim()
  return limpo ? limpo.split(/\s+/)[0] : undefined
}

const layout = (titulo: string, corpo: string, rodape: string): string => `<!doctype html>
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
                  ${rodape}
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
  `<p style="margin:24px 0"><a href="${escapar(url)}" style="display:inline-block;background:#1c0a96;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 22px;border-radius:10px">${escapar(rotulo)}</a></p>
   <p style="margin:0;font-size:13px;color:#5a5a66;word-break:break-all">Ou copie este endereço: ${escapar(url)}</p>`

const linhaDetalhe = (rotulo: string, valor: string): string =>
  `<tr>
     <td style="padding:6px 0;font-size:13px;color:#5a5a66;width:38%;vertical-align:top">${escapar(rotulo)}</td>
     <td style="padding:6px 0;font-size:14px;color:#14141a">${escapar(valor)}</td>
   </tr>`

export const emailRecuperacaoSenha = (token: string, nome?: null | string): string => {
  const url = `${base()}/area/redefinir-senha?token=${encodeURIComponent(token)}`
  const saudacao = primeiroNome(nome) ? `Olá, ${escapar(primeiroNome(nome))}.` : 'Olá.'
  return layout(
    'Redefinir sua senha',
    `<p style="margin:0">${saudacao} Recebemos um pedido para redefinir a senha da sua conta.</p>
     ${botao(url, 'Criar nova senha')}
     <p style="margin:16px 0 0;font-size:13px;color:#5a5a66">O link vale por 1 hora. Se não foi você, ignore o e-mail: sua senha atual continua valendo.</p>`,
    'Você recebeu este e-mail porque um pedido de redefinição de senha foi feito no site da FELPMA. Se não foi você, ignore esta mensagem.',
  )
}

/**
 * Link de ativação da conta de atleta. Quem clica confirma o e-mail e libera o
 * próprio acesso — não depende de aprovação manual no painel.
 */
export const emailAtivacaoConta = (token: string, nome?: null | string): string => {
  const url = `${base()}/area/ativar?token=${encodeURIComponent(token)}`
  const saudacao = primeiroNome(nome) ? `Olá, ${escapar(primeiroNome(nome))}.` : 'Olá.'
  return layout(
    'Ative sua conta',
    `<p style="margin:0">${saudacao} Falta só um passo para você entrar na área do atleta e se inscrever nos eventos da FELPMA.</p>
     <p style="margin:12px 0 0">Clique no botão abaixo para confirmar seu e-mail e ativar a conta:</p>
     ${botao(url, 'Ativar minha conta')}
     <p style="margin:16px 0 0;font-size:13px;color:#5a5a66">Depois da ativação, é só entrar com o e-mail e a senha que você cadastrou.</p>`,
    'Você recebeu este e-mail porque um cadastro foi iniciado no site da FELPMA. Se não foi você, ignore esta mensagem — nenhuma conta será ativada.',
  )
}

export type DetalheInscricaoEmail = { rotulo: string; valor: string }

/** Confirmação de inscrição com os dados do evento e o que o atleta respondeu. */
export const emailConfirmacaoInscricao = (args: {
  detalhes: DetalheInscricaoEmail[]
  enviadaEm?: string
  evento: string
  local?: string
  nome?: null | string
  protocolo: string
  quando?: string
  situacao?: string
}): string => {
  const url = `${base()}/area/inscricoes/${encodeURIComponent(args.protocolo)}`
  const saudacao = primeiroNome(args.nome) ? `Olá, ${escapar(primeiroNome(args.nome))}.` : 'Olá.'

  const linhas = [
    linhaDetalhe('Protocolo', args.protocolo),
    linhaDetalhe('Evento', args.evento),
    args.quando ? linhaDetalhe('Quando', args.quando) : '',
    args.local ? linhaDetalhe('Local', args.local) : '',
    args.enviadaEm ? linhaDetalhe('Enviada em', args.enviadaEm) : '',
    args.situacao ? linhaDetalhe('Situação', args.situacao) : '',
  ]
    .filter(Boolean)
    .join('')

  const respostas = args.detalhes.length
    ? `<h2 style="margin:24px 0 8px;font-size:16px;color:#14141a">O que você respondeu</h2>
       <ul style="margin:0;padding:0;list-style:none">
         ${args.detalhes
           .map(
             (d) =>
               `<li style="margin:0 0 10px;padding:10px 12px;background:#f6f6f9;border-radius:8px">
                  <span style="display:block;font-size:12px;color:#5a5a66">${escapar(d.rotulo)}</span>
                  <span style="display:block;font-size:14px;color:#14141a">${escapar(d.valor)}</span>
                </li>`,
           )
           .join('')}
       </ul>`
    : ''

  return layout(
    'Inscrição confirmada',
    `<p style="margin:0">${saudacao} Recebemos sua inscrição para <strong>${escapar(args.evento)}</strong>. Guarde o protocolo para acompanhar o andamento.</p>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 0;border-top:1px solid #e6e6ec;border-bottom:1px solid #e6e6ec">
       ${linhas}
     </table>
     ${respostas}
     ${botao(url, 'Ver minha inscrição')}
     <p style="margin:16px 0 0;font-size:13px;color:#5a5a66">A federação ainda vai analisar a inscrição. Você pode acompanhar a situação pela área do atleta.</p>`,
    'Você recebeu este e-mail porque uma inscrição foi enviada pelo site da FELPMA. Se não foi você, entre em contato com a federação.',
  )
}
