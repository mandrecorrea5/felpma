/** Templates de e-mail transacional. Sem dados sensíveis no corpo — só nome e link. */

const base = () => (process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000').replace(/\/+$/, '')

const dominio = (): string => {
  try {
    return new URL(base()).host
  } catch {
    return 'felpma.com.br'
  }
}

/** Logo oficial em PNG (compatível com clientes que não renderizam WebP). */
const logoEmail = (): string => `${base()}/email/logo-felpma.png`

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

const link = (href: string, rotulo: string): string =>
  `<a href="${escapar(href)}" style="color:#1c0a96;text-decoration:none;font-weight:600">${escapar(rotulo)}</a>`

const layout = (titulo: string, corpo: string, rodape: string, preheader = ''): string => `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>${escapar(titulo)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f6f9;font-family:Arial,Helvetica,sans-serif;color:#14141a;-webkit-text-size-adjust:100%">
    ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all">${escapar(preheader)}</div>` : ''}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6f6f9;padding:28px 12px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e6e6ec;border-radius:16px;overflow:hidden">
            <tr>
              <td style="height:6px;background:#1c0a96;font-size:0;line-height:0">&nbsp;</td>
            </tr>
            <tr>
              <td align="center" style="padding:30px 32px 10px">
                <img src="${escapar(logoEmail())}" width="132" height="155" alt="FELPMA — Federação de Levantamento de Pesos do Maranhão" style="display:block;width:132px;height:auto;border:0;outline:none;text-decoration:none">
                <p style="margin:14px 0 0;font-size:15px;line-height:1.2;letter-spacing:.16em;text-transform:uppercase;color:#1c0a96;font-weight:700">FELPMA</p>
                <p style="margin:5px 0 0;font-size:10px;line-height:1.4;letter-spacing:.1em;text-transform:uppercase;color:#5a5a66">Levantamento de Pesos · Maranhão</p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px 0">
                <div style="height:1px;background:#e6e6ec;line-height:1px;font-size:0">&nbsp;</div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 0">
                <h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:23px;line-height:1.3;color:#14141a;font-weight:700">${escapar(titulo)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 32px 30px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#3e3e48">
                ${corpo}
              </td>
            </tr>
            <tr>
              <td style="padding:22px 32px 26px;background:#f6f6f9;border-top:1px solid #e6e6ec;font-family:Arial,Helvetica,sans-serif">
                <p style="margin:0 0 12px;font-size:12px;line-height:1.6;color:#5a5a66">${rodape}</p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#14141a;font-weight:700">FELPMA</p>
                <p style="margin:2px 0 0;font-size:11px;line-height:1.5;color:#8a8a96">Federação de Levantamento de Pesos do Maranhão</p>
                <p style="margin:10px 0 0;font-size:12px;line-height:1.6;color:#5a5a66">
                  ${link(base(), dominio())} &nbsp;·&nbsp; ${link(`${base()}/contato`, 'Fale com a federação')}
                </p>
                <p style="margin:8px 0 0;font-size:11px;line-height:1.5;color:#9a9aa4">Este é um e-mail automático — não responda.</p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;font-size:10px;line-height:1.5;color:#9a9aa4">FELPMA · São Luís — MA</p>
        </td>
      </tr>
    </table>
  </body>
</html>`

const botao = (url: string, rotulo: string): string =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 0">
     <tr>
       <td align="center" bgcolor="#1c0a96" style="border-radius:10px">
         <a href="${escapar(url)}" style="display:inline-block;padding:15px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px">${escapar(rotulo)}</a>
       </td>
     </tr>
   </table>
   <p style="margin:14px 0 0;font-size:12px;line-height:1.6;color:#5a5a66;word-break:break-all">Se o botão não funcionar, copie e cole este endereço no navegador:<br><span style="color:#1c0a96">${escapar(url)}</span></p>`

const caixa = (conteudo: string, destaque = false): string =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 0;background:${destaque ? '#f3f1ff' : '#f6f6f9'};border:1px solid ${destaque ? '#e2defb' : '#e6e6ec'};border-radius:10px">
     <tr>
       <td style="padding:14px 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#5a5a66">${conteudo}</td>
     </tr>
   </table>`

const linhaDetalhe = (rotulo: string, valor: string): string =>
  `<tr>
     <td style="padding:7px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.4;color:#5a5a66;width:38%;vertical-align:top">${escapar(rotulo)}</td>
     <td style="padding:7px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#14141a;font-weight:600">${escapar(valor)}</td>
   </tr>`

export const emailRecuperacaoSenha = (token: string, nome?: null | string): string => {
  const url = `${base()}/area/redefinir-senha?token=${encodeURIComponent(token)}`
  const saudacao = primeiroNome(nome) ? `Olá, ${escapar(primeiroNome(nome))}.` : 'Olá.'
  return layout(
    'Redefinir sua senha',
    `<p style="margin:0">${saudacao} Recebemos um pedido para redefinir a senha da sua conta.</p>
     <p style="margin:14px 0 0">Crie uma senha nova clicando no botão abaixo:</p>
     ${botao(url, 'Criar nova senha')}
     ${caixa('O link vale por <strong style="color:#14141a">1 hora</strong>. Se não foi você, ignore este e-mail: sua senha atual continua valendo.')}`,
    'Você recebeu este e-mail porque um pedido de redefinição de senha foi feito no site da FELPMA. Se não foi você, ignore esta mensagem.',
    'Pedido de redefinição de senha na área do atleta da FELPMA.',
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
     <p style="margin:14px 0 0">Clique no botão para confirmar seu e-mail e ativar a conta:</p>
     ${botao(url, 'Ativar minha conta')}
     ${caixa('Depois da ativação, é só entrar com o e-mail e a senha que você cadastrou.', true)}`,
    'Você recebeu este e-mail porque um cadastro foi iniciado no site da FELPMA. Se não foi você, ignore esta mensagem — nenhuma conta será ativada.',
    'Confirme seu e-mail para ativar a conta de atleta da FELPMA.',
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
    args.quando ? linhaDetalhe('Quando', args.quando) : '',
    args.local ? linhaDetalhe('Local', args.local) : '',
    args.enviadaEm ? linhaDetalhe('Enviada em', args.enviadaEm) : '',
    args.situacao ? linhaDetalhe('Situação', args.situacao) : '',
  ]
    .filter(Boolean)
    .join('')

  const respostas = args.detalhes.length
    ? `<h2 style="margin:28px 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.3;color:#14141a;font-weight:700">O que você respondeu</h2>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #e6e6ec">
         ${args.detalhes
           .map(
             (d) =>
               `<tr>
                  <td style="padding:12px 0;border-bottom:1px solid #e6e6ec;font-family:Arial,Helvetica,sans-serif">
                    <span style="display:block;font-size:12px;line-height:1.4;color:#5a5a66">${escapar(d.rotulo)}</span>
                    <span style="display:block;margin-top:3px;font-size:14px;line-height:1.5;color:#14141a">${escapar(d.valor)}</span>
                  </td>
                </tr>`,
           )
           .join('')}
       </table>`
    : ''

  return layout(
    'Inscrição confirmada',
    `<p style="margin:0">${saudacao} Recebemos sua inscrição para <strong style="color:#14141a">${escapar(args.evento)}</strong>.</p>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 0;background:#1c0a96;border-radius:12px">
       <tr>
         <td style="padding:18px 20px;font-family:Arial,Helvetica,sans-serif">
           <p style="margin:0;font-size:11px;line-height:1.4;letter-spacing:.12em;text-transform:uppercase;color:#d6d2f6;font-weight:700">Protocolo</p>
           <p style="margin:5px 0 0;font-size:24px;line-height:1.1;color:#ffffff;font-weight:700;letter-spacing:.04em">${escapar(args.protocolo)}</p>
         </td>
       </tr>
     </table>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 0;border-top:1px solid #e6e6ec;border-bottom:1px solid #e6e6ec">
       ${linhas}
     </table>
     ${respostas}
     ${botao(url, 'Ver minha inscrição')}
     ${caixa('A federação ainda vai analisar a inscrição. Você pode acompanhar a situação pela área do atleta.', true)}`,
    'Você recebeu este e-mail porque uma inscrição foi enviada pelo site da FELPMA. Se não foi você, entre em contato com a federação.',
    `Inscrição ${args.protocolo} recebida para ${args.evento}.`,
  )
}
