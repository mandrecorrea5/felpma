'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { atletaAtual } from '@/lib/atleta/sessao'
import type { EstadoFormulario } from '@/lib/atleta/tipos'
import { CAMPO_COMPROVANTE, ROTULO_COMPROVANTE } from '@/lib/constants'
import { nomeArmazenado } from '@/lib/inscricoes/arquivo'
import { prepararArquivo } from '@/lib/inscricoes/arquivo-servidor'
import { enviarComprovanteParaFederacao } from '@/lib/inscricoes/notificacao-federacao'
import { getPayloadClient } from '@/lib/payload'
import { limitar } from '@/lib/rate-limit'

/**
 * Comprovante de pagamento enviado depois da inscrição.
 *
 * A inscrição precisa existir e ser do próprio atleta: o protocolo vem do
 * formulário, mas não é prova de nada. O arquivo passa pelas mesmas regras do
 * upload da inscrição (PDF/JPG/PNG, até 2 MB) e é gravado na coleção privada,
 * vinculado à inscrição — é esse vínculo que libera o download na área e no
 * painel. Depois de gravar, a federação recebe uma cópia por e-mail.
 */
export async function enviarComprovante(
  _prev: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const atleta = await atletaAtual()
  if (!atleta) {
    return { ok: false, erro: 'Sua sessão expirou. Entre novamente para enviar o comprovante.' }
  }

  // Cada comprovante gera e-mail com anexo: um teto simples evita bombardeio.
  if (!limitar(`comprovante:${atleta.id}`, 10, 10 * 60 * 1000)) {
    return { ok: false, erro: 'Muitos envios em pouco tempo. Aguarde alguns minutos.' }
  }

  const protocolo = String(form.get('protocolo') ?? '').trim()
  if (!protocolo) return { ok: false, erro: 'Escolha a competição da inscrição.' }

  const enviado = form.get('arquivo')
  const arquivo = enviado instanceof File ? enviado : null
  if (!arquivo || arquivo.size === 0) {
    return { ok: false, erro: 'Escolha o arquivo do comprovante de pagamento.' }
  }

  const preparado = await prepararArquivo(arquivo, 'pdf-imagem')
  if (!preparado.ok) return { ok: false, erro: preparado.erro }

  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'inscricoes',
    where: {
      and: [{ protocolo: { equals: protocolo } }, { atleta: { equals: atleta.id } }],
    },
    limit: 1,
    depth: 2,
    overrideAccess: true,
  })

  const inscricao = docs[0]
  if (!inscricao) {
    return { ok: false, erro: 'Inscrição não encontrada na sua conta. Confira a competição.' }
  }
  if (inscricao.status === 'cancelada') {
    return { ok: false, erro: 'Esta inscrição foi cancelada e não aceita mais comprovantes.' }
  }

  const evento = typeof inscricao.evento === 'object' ? inscricao.evento : null
  if (!evento) {
    return { ok: false, erro: 'Não foi possível localizar o evento desta inscrição.' }
  }

  const formularioId =
    typeof inscricao.formulario === 'object' ? inscricao.formulario?.id : inscricao.formulario

  let comprovanteId: number | string
  try {
    const criado = await payload.create({
      collection: 'arquivos-inscricao',
      overrideAccess: true,
      data: {
        titulo: arquivo.name.slice(0, 200),
        campo: CAMPO_COMPROVANTE,
        rotulo: ROTULO_COMPROVANTE,
        atleta: atleta.id,
        inscricao: inscricao.id,
        ...(formularioId != null ? { formulario: formularioId } : {}),
      },
      file: {
        data: preparado.buffer,
        mimetype: preparado.mimetype,
        name: nomeArmazenado(inscricao.protocolo, CAMPO_COMPROVANTE, preparado.extensao),
        size: preparado.tamanho,
      },
    })
    comprovanteId = criado.id
  } catch (erro) {
    console.error('Falha ao gravar comprovante de pagamento', erro)
    return { ok: false, erro: 'Não foi possível salvar o comprovante agora. Tente novamente.' }
  }

  // Best-effort: o comprovante já está no painel, o e-mail é uma conveniência.
  await enviarComprovanteParaFederacao({
    anexo: { buffer: preparado.buffer, mimetype: preparado.mimetype, nome: arquivo.name },
    atleta,
    evento,
    inscricao,
    payload,
  }).catch((erro) => {
    console.error(`Falha ao enviar o comprovante ${comprovanteId} para a federação`, erro)
  })

  revalidatePath('/area/comprovantes')
  revalidatePath(`/area/inscricoes/${inscricao.protocolo}`)
  redirect(`/area/comprovantes?enviado=${encodeURIComponent(inscricao.protocolo)}`)
}
