'use server'

import { redirect } from 'next/navigation'
import { atletaAtual } from '@/lib/atleta/sessao'
import { getPayloadClient } from '@/lib/payload'

/** Cancelamento pelo próprio atleta, enquanto a inscrição está em avaliação. */
export async function cancelarInscricao(form: FormData): Promise<void> {
  const atleta = await atletaAtual()
  if (!atleta) redirect('/area/entrar')

  const protocolo = String(form.get('protocolo') ?? '').trim()
  if (!protocolo) redirect('/area')

  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'inscricoes',
    where: {
      and: [{ protocolo: { equals: protocolo } }, { atleta: { equals: atleta.id } }],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const inscricao = docs[0]
  if (!inscricao) redirect('/area')

  if (!['recebida', 'em-analise'].includes(inscricao.status)) {
    redirect(`/area/inscricoes/${protocolo}?erro=status`)
  }

  await payload.update({
    collection: 'inscricoes',
    id: inscricao.id,
    overrideAccess: true,
    data: { status: 'cancelada' },
  })

  redirect(`/area/inscricoes/${protocolo}?cancelada=1`)
}
