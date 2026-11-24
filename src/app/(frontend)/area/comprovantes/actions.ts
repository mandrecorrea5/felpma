'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { atletaAtual } from '@/lib/atleta/sessao'
import type { EstadoFormulario } from '@/lib/atleta/tipos'
import { CAMPO_COMPROVANTE, ROTULO_COMPROVANTE } from '@/lib/constants'
import { nomeArmazenado } from '@/lib/inscricoes/arquivo'
import {
  eventoCobraInscricao,
  MAX_COMPROVANTES_POR_EVENTO,
  quantosComprovantesNoEvento,
} from '@/lib/inscricoes/comprovante'
import { prepararArquivo } from '@/lib/inscricoes/arquivo-servidor'
import { enviarComprovanteParaFederacao } from '@/lib/inscricoes/notificacao-federacao'
import { getPayloadClient } from '@/lib/payload'
import { limitar } from '@/lib/rate-limit'

/**
 * Comprovante de pagamento enviado depois da inscrição.
 *
 * O comprovante é do **atleta na competição**, não de uma inscrição: quem entrou
 * em Sub-17 e Sub-20 paga uma vez e manda um comprovante só, que quita as duas.
 * Cada evento é independente — nada é reaproveitado de outro. O limite é de
 * 3 comprovantes por competição (pagamento dividido).
 *
 * O atleta precisa ter inscrição ativa naquele evento; o id vem do formulário,
 * mas não é prova de nada — a consulta é filtrada pelo dono. Depois de gravar, a
 * federação recebe uma cópia por e-mail.
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

  const eventoId = String(form.get('evento') ?? '').trim()
  if (!eventoId) return { ok: false, erro: 'Escolha a competição.' }

  const enviado = form.get('arquivo')
  const arquivo = enviado instanceof File ? enviado : null
  if (!arquivo || arquivo.size === 0) {
    return { ok: false, erro: 'Escolha o arquivo do comprovante de pagamento.' }
  }

  const preparado = await prepararArquivo(arquivo, 'pdf-imagem')
  if (!preparado.ok) return { ok: false, erro: preparado.erro }

  const payload = await getPayloadClient()

  // Inscrições do atleta neste evento — é o que dá direito a enviar comprovante.
  const { docs: inscricoes } = await payload.find({
    collection: 'inscricoes',
    where: {
      and: [
        { evento: { equals: eventoId } },
        { atleta: { equals: atleta.id } },
        { status: { not_equals: 'cancelada' } },
      ],
    },
    sort: '-enviadaEm',
    limit: 10,
    depth: 2,
    overrideAccess: true,
  })

  const inscricao = inscricoes[0]
  if (!inscricao) {
    return {
      ok: false,
      erro: 'Você não tem inscrição ativa nesta competição. Confira a competição escolhida.',
    }
  }

  const evento = typeof inscricao.evento === 'object' ? inscricao.evento : null
  if (!evento) {
    return { ok: false, erro: 'Não foi possível localizar esta competição.' }
  }

  // Evento gratuito (valor vazio ou zero) não cobra comprovante.
  if (!eventoCobraInscricao(evento)) {
    return {
      ok: false,
      erro: 'Esta competição não tem taxa de inscrição — não é preciso enviar comprovante.',
    }
  }

  const jaEnviados = await quantosComprovantesNoEvento(atleta.id, evento.id)
  if (jaEnviados >= MAX_COMPROVANTES_POR_EVENTO) {
    return {
      ok: false,
      erro: `Esta competição já tem ${MAX_COMPROVANTES_POR_EVENTO} comprovantes seus. Se precisar trocar algum, fale com a federação.`,
    }
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
        evento: evento.id,
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
  revalidatePath('/area')
  for (const item of inscricoes) {
    revalidatePath(`/area/inscricoes/${item.protocolo}`)
  }
  redirect(`/area/comprovantes?enviado=${encodeURIComponent(String(evento.id))}`)
}
