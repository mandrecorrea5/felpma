'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { sql } from '@payloadcms/db-postgres'
import { getPayloadClient } from '@/lib/payload'
import {
  COOKIE_VISITANTE,
  chaveValida,
  SEGUNDOS_COOKIE_VISITANTE,
  type ResultadoCurtida,
} from '@/lib/noticias/curtidas'

const erro = (mensagem: string): ResultadoCurtida => ({ erro: mensagem, ok: false })

/**
 * Curte ou descurte uma notícia para o navegador atual.
 *
 * Sem conta: o identificador vem de um cookie httpOnly criado no primeiro
 * clique. A unicidade (notícia, chave) é garantida pelo índice do banco, então
 * dois cliques simultâneos não duplicam a curtida.
 *
 * O contador em `noticias.curtidas` é recalculado a partir da coleção — assim
 * ele se corrige sozinho se alguém apagar uma curtida direto no painel.
 */
export async function alternarCurtida(noticiaId: number): Promise<ResultadoCurtida> {
  if (!Number.isInteger(noticiaId) || noticiaId <= 0) return erro('Notícia inválida.')

  const payload = await getPayloadClient()

  const noticia = await payload
    .findByID({ collection: 'noticias', id: noticiaId, depth: 0, overrideAccess: true })
    .catch(() => null)
  if (!noticia || noticia._status !== 'published') return erro('Esta notícia não está publicada.')

  const jar = await cookies()
  let chave = jar.get(COOKIE_VISITANTE)?.value
  if (!chaveValida(chave)) {
    chave = randomUUID()
    jar.set(COOKIE_VISITANTE, chave, {
      httpOnly: true,
      maxAge: SEGUNDOS_COOKIE_VISITANTE,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
  }

  const existente = await payload.find({
    collection: 'curtidas',
    where: { and: [{ noticia: { equals: noticiaId } }, { chave: { equals: chave } }] },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })

  let curtido: boolean
  if (existente.docs[0]) {
    await payload.delete({
      collection: 'curtidas',
      id: existente.docs[0].id,
      overrideAccess: true,
    })
    curtido = false
  } else {
    try {
      await payload.create({
        collection: 'curtidas',
        data: { noticia: noticiaId, chave },
        overrideAccess: true,
      })
    } catch {
      // Corrida com outro clique: a linha já existe, o estado final é "curtido".
    }
    curtido = true
  }

  const { totalDocs } = await payload.count({
    collection: 'curtidas',
    where: { noticia: { equals: noticiaId } },
    overrideAccess: true,
  })

  // Update direto no SQL de propósito: `payload.update` criaria versão de
  // rascunho e dispararia os hooks de revalidação a cada coração clicado.
  await payload.db.drizzle.execute(
    sql`UPDATE "noticias" SET "curtidas" = ${totalDocs}, "updated_at" = NOW() WHERE "id" = ${noticiaId}`,
  )

  // A listagem e a home mostram o número em cada card.
  revalidatePath('/noticias')
  revalidatePath('/')

  return { curtido, ok: true, total: totalDocs }
}
