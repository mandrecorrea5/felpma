import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { NextRequest } from 'next/server'
import { atletaAtual } from '@/lib/atleta/sessao'
import { getPayloadClient } from '@/lib/payload'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ arquivo: string; protocolo: string }> }

/** Nome seguro para o cabeçalho `Content-Disposition` (sem aspas/quebra de linha). */
const nomeParaCabecalho = (nome: string): string =>
  nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '_')
    .replace(/["\\\r\n]/g, '')

/**
 * Download privado do arquivo enviado pelo próprio atleta.
 *
 * A coleção `arquivos-inscricao` não é pública e a API do Payload só reconhece
 * sessão de painel — por isso o atleta baixa por aqui, com a sessão dele. A
 * consulta filtra pelo dono do arquivo: saber o id não basta para baixar.
 */
export async function GET(_req: NextRequest, { params }: Props) {
  const { arquivo: id, protocolo } = await params

  const atleta = await atletaAtual()
  if (!atleta)
    return new Response('Entre na área do atleta para baixar o arquivo.', { status: 401 })

  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'arquivos-inscricao',
    where: { and: [{ id: { equals: id } }, { atleta: { equals: atleta.id } }] },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  })

  const registro = docs[0]
  if (!registro?.filename) return new Response('Arquivo não encontrado.', { status: 404 })

  // Se o arquivo já está vinculado a uma inscrição, o protocolo da URL precisa
  // ser o mesmo — um link de outra inscrição não vaza o arquivo.
  const inscricao = typeof registro.inscricao === 'object' ? registro.inscricao : null
  if (inscricao?.protocolo && inscricao.protocolo !== protocolo) {
    return new Response('Arquivo não encontrado.', { status: 404 })
  }

  const pasta = path.join(process.cwd(), 'arquivos-inscricao')
  const caminho = path.join(pasta, path.basename(registro.filename))

  let conteudo: Buffer
  try {
    conteudo = await readFile(caminho)
  } catch {
    return new Response('Arquivo não encontrado no servidor.', { status: 404 })
  }

  const nome = registro.titulo || registro.filename
  const ascii = nomeParaCabecalho(nome) || registro.filename

  return new Response(new Uint8Array(conteudo), {
    status: 200,
    headers: {
      'Content-Type': registro.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nome)}`,
      'Content-Length': String(conteudo.byteLength),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
