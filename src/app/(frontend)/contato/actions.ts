'use server'

import type { Payload } from 'payload'
import { emailContato } from '@/lib/email'
import { emailContatoRecebido } from '@/lib/email-templates'
import { getPayloadClient } from '@/lib/payload'
import { origemDaRequisicao } from '@/lib/inscricoes/consentimento'
import { limitar } from '@/lib/rate-limit'

export type EstadoContato = {
  ok: boolean
  erro?: string
  campos?: Record<string, string>
  /**
   * `spam` = o anti-spam barrou e nada foi gravado, mas o usuário vê o mesmo
   * sucesso. Sem este sinal o funil de contato contaria robô como conversa.
   */
  motivo?: 'spam'
}

const ASSUNTOS = ['filiacao', 'competicoes', 'imprensa', 'parcerias', 'outros'] as const

const ROTULO_ASSUNTO: Record<(typeof ASSUNTOS)[number], string> = {
  filiacao: 'Filiação',
  competicoes: 'Competições',
  imprensa: 'Imprensa',
  parcerias: 'Patrocínio e parcerias',
  outros: 'Outros',
}

const baseUrl = (): string =>
  (process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000').replace(/\/+$/, '')

/**
 * Avisa a caixa de contato da federação.
 *
 * Best-effort: a mensagem já está gravada no painel, então uma falha do Resend
 * não pode aparecer para o visitante como "não enviou". O `Reply-To` é o e-mail
 * de quem escreveu — responder no cliente de e-mail já fala com a pessoa.
 */
async function avisarPorEmail(
  payload: Payload,
  mensagemId: number | string,
  campos: { assunto: string; email: string; mensagem: string; nome: string; telefone: string },
): Promise<void> {
  const assunto =
    ROTULO_ASSUNTO[campos.assunto as (typeof ASSUNTOS)[number]] ?? ROTULO_ASSUNTO.outros

  try {
    await payload.sendEmail({
      to: emailContato(),
      replyTo: campos.email,
      subject: `Contato pelo site — ${assunto} — ${campos.nome}`,
      html: emailContatoRecebido({
        adminUrl: `${baseUrl()}/admin/collections/mensagens/${mensagemId}`,
        assunto,
        email: campos.email,
        mensagem: campos.mensagem,
        nome: campos.nome,
        ...(campos.telefone ? { telefone: campos.telefone } : {}),
      }),
    })
  } catch (erro) {
    console.error('Falha ao avisar a federação sobre mensagem de contato', erro)
  }
}

export async function enviarContato(_prev: EstadoContato, form: FormData): Promise<EstadoContato> {
  // Honeypot pega robô burro; este teto pega o que preenche o formulário de
  // verdade. Sem ele, a coleção de mensagens vira depósito de spam.
  const origem = await origemDaRequisicao()
  if (origem.ipHash && !limitar(`contato:${origem.ipHash}`, 5, 10 * 60 * 1000)) {
    return { ok: false, erro: 'Muitas mensagens em pouco tempo. Aguarde alguns minutos.' }
  }

  const campos = {
    nome: String(form.get('nome') ?? '').trim(),
    email: String(form.get('email') ?? '').trim(),
    telefone: String(form.get('telefone') ?? '').trim(),
    assunto: String(form.get('assunto') ?? 'outros'),
    mensagem: String(form.get('mensagem') ?? '').trim(),
  }

  // Anti-spam simples: campo invisível preenchido ou envio em menos de 3 segundos.
  const inicio = Number(form.get('t') ?? 0)
  if (form.get('site') || (inicio && Date.now() - inicio < 3000))
    return { ok: true, motivo: 'spam' }

  if (campos.nome.length < 2) return { ok: false, erro: 'Informe seu nome.', campos }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campos.email))
    return { ok: false, erro: 'Informe um e-mail válido.', campos }
  if (campos.mensagem.length < 10)
    return { ok: false, erro: 'Escreva sua mensagem (mínimo de 10 caracteres).', campos }
  if (campos.mensagem.length > 5000)
    return { ok: false, erro: 'Mensagem muito longa (máximo de 5.000 caracteres).', campos }

  try {
    const payload = await getPayloadClient()
    const criada = await payload.create({
      collection: 'mensagens',
      overrideAccess: true,
      data: {
        nome: campos.nome.slice(0, 200),
        email: campos.email.slice(0, 200),
        telefone: campos.telefone.slice(0, 40) || undefined,
        assunto: (ASSUNTOS as readonly string[]).includes(campos.assunto)
          ? (campos.assunto as (typeof ASSUNTOS)[number])
          : 'outros',
        mensagem: campos.mensagem,
      },
    })

    await avisarPorEmail(payload, criada.id, {
      ...campos,
      assunto: String(criada.assunto ?? 'outros'),
    })

    return { ok: true }
  } catch (e) {
    console.error('Falha ao salvar mensagem de contato', e)
    return {
      ok: false,
      erro: 'Não foi possível enviar agora. Tente novamente em instantes.',
      campos,
    }
  }
}
