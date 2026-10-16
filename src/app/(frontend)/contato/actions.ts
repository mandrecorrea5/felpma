'use server'

import { getPayloadClient } from '@/lib/payload'

export type EstadoContato = { ok: boolean; erro?: string; campos?: Record<string, string> }

const ASSUNTOS = ['filiacao', 'competicoes', 'imprensa', 'parcerias', 'outros'] as const

export async function enviarContato(_prev: EstadoContato, form: FormData): Promise<EstadoContato> {
  const campos = {
    nome: String(form.get('nome') ?? '').trim(),
    email: String(form.get('email') ?? '').trim(),
    telefone: String(form.get('telefone') ?? '').trim(),
    assunto: String(form.get('assunto') ?? 'outros'),
    mensagem: String(form.get('mensagem') ?? '').trim(),
  }

  // Anti-spam simples: campo invisível preenchido ou envio em menos de 3 segundos.
  const inicio = Number(form.get('t') ?? 0)
  if (form.get('site') || (inicio && Date.now() - inicio < 3000)) return { ok: true }

  if (campos.nome.length < 2) return { ok: false, erro: 'Informe seu nome.', campos }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campos.email))
    return { ok: false, erro: 'Informe um e-mail válido.', campos }
  if (campos.mensagem.length < 10)
    return { ok: false, erro: 'Escreva sua mensagem (mínimo de 10 caracteres).', campos }
  if (campos.mensagem.length > 5000)
    return { ok: false, erro: 'Mensagem muito longa (máximo de 5.000 caracteres).', campos }

  try {
    const payload = await getPayloadClient()
    await payload.create({
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
