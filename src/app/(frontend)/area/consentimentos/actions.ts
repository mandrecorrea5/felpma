'use server'

import { redirect } from 'next/navigation'
import { atletaAtual } from '@/lib/atleta/sessao'
import { getPayloadClient } from '@/lib/payload'

/** Revoga (não apaga) um consentimento não obrigatório de uma inscrição do próprio atleta. */
export async function revogarConsentimentoForm(form: FormData): Promise<void> {
  const atleta = await atletaAtual()
  if (!atleta) redirect('/area/entrar')

  const inscricaoId = String(form.get('inscricao') ?? '')
  const identificador = String(form.get('identificador') ?? '')
  if (!inscricaoId || !identificador) redirect('/area/consentimentos')

  const payload = await getPayloadClient()
  const inscricao = await payload.findByID({
    collection: 'inscricoes',
    id: inscricaoId,
    depth: 0,
    overrideAccess: true,
  })

  const dono = typeof inscricao?.atleta === 'object' ? inscricao.atleta?.id : inscricao?.atleta
  if (String(dono) !== String(atleta.id)) redirect('/area/consentimentos')

  const consentimentos = (inscricao.consentimentos ?? []).map((c) =>
    c.identificador === identificador && !c.obrigatorio
      ? { ...c, aceito: false, revogadoEm: new Date().toISOString() }
      : c,
  )

  await payload.update({
    collection: 'inscricoes',
    id: inscricaoId,
    overrideAccess: true,
    data: { consentimentos },
  })

  redirect('/area/consentimentos?revogado=1')
}
