'use server'

import { redirect } from 'next/navigation'
import type { RequiredDataFromCollectionSlug } from 'payload'
import { atletaAtual } from '@/lib/atleta/sessao'
import type { EstadoFormulario } from '@/lib/atleta/tipos'
import { cpfValido, normalizarCpf } from '@/lib/cpf'
import { cifrar } from '@/lib/crypto/campos'
import { limitar } from '@/lib/rate-limit'
import { origemDaRequisicao, provaConsentimento } from '@/lib/inscricoes/consentimento'
import {
  estadoInscricao,
  type EventoParaInscricao,
} from '@/lib/inscricoes/estado'
import { ehMenorDeIdade, idadeEm } from '@/lib/inscricoes/idade'
import {
  eventoPorSlug,
  formularioPublicado,
  inscricaoDoAtleta,
  inscritosNoEvento,
} from '@/lib/inscricoes/consultas'
import {
  type CampoFormulario,
  montarSnapshot,
  validarRespostas,
  type Respostas,
} from '@/lib/inscricoes/validacao'
import { getPayloadClient } from '@/lib/payload'
import { enviarConfirmacaoInscricao } from '@/lib/inscricoes/confirmacao'
import { gerarProtocolo } from '@/lib/inscricoes/protocolo'

/**
 * Grava a inscrição. Tudo é revalidado aqui — a tela pode ter sido aberta antes
 * da janela abrir, o link pode estar salvo há semanas, e o corpo pode ter sido
 * forjado. O servidor é a única fonte de verdade.
 */
export async function enviarInscricao(
  _prev: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const atleta = await atletaAtual()
  if (!atleta) return { ok: false, erro: 'Sua sessão expirou. Entre novamente para se inscrever.' }

  const origem = await origemDaRequisicao()
  if (!limitar(`inscricao:${atleta.id}`, 5, 10 * 60 * 1000)) {
    return { ok: false, erro: 'Muitas tentativas em pouco tempo. Aguarde alguns minutos.' }
  }

  const eventoSlug = String(form.get('evento') ?? '')
  const formularioId = String(form.get('formulario') ?? '')

  const evento = await eventoPorSlug(eventoSlug)
  if (!evento) return { ok: false, erro: 'Evento não encontrado.' }

  const formulario = await formularioPublicado(evento.id)
  if (!formulario || String(formulario.id) !== formularioId) {
    return { ok: false, erro: 'Este formulário não está mais disponível.' }
  }

  const inscritos = await inscritosNoEvento(evento.id)
  const jaInscrito = await inscricaoDoAtleta(evento.id, atleta.id)
  const estado = estadoInscricao(evento as EventoParaInscricao, {
    temFormulario: true,
    inscritos,
    jaInscrito: Boolean(jaInscrito),
  })

  if (!estado.podeInscrever) return { ok: false, erro: estado.detalhe }

  let respostas: Respostas
  let aceitos: string[]
  try {
    const bruto = String(form.get('respostas') ?? '{}')
    if (bruto.length > 100_000) return { ok: false, erro: 'Respostas muito longas.' }
    respostas = JSON.parse(bruto) as Respostas
    aceitos = JSON.parse(String(form.get('aceitos') ?? '[]')) as string[]
    if (!respostas || typeof respostas !== 'object' || Array.isArray(respostas)) {
      return { ok: false, erro: 'Respostas inválidas.' }
    }
    if (!Array.isArray(aceitos)) aceitos = []
  } catch {
    return { ok: false, erro: 'Não foi possível ler as respostas. Recarregue a página.' }
  }

  const campos = (formulario.campos ?? []) as CampoFormulario[]
  const validacao = validarRespostas(campos, respostas)
  if (!validacao.ok) {
    return { ok: false, erro: 'Confira os campos destacados.', erros: validacao.erros }
  }

  // ---------------------------------------------------------------- menores
  const idade = idadeEm(atleta.dataNascimento)
  const menor = ehMenorDeIdade(atleta.dataNascimento)
  const responsavel = {
    nome: String(form.get('responsavelNome') ?? '').trim(),
    parentesco: String(form.get('responsavelParentesco') ?? '').trim(),
    telefone: String(form.get('responsavelTelefone') ?? '').replace(/\D/g, ''),
    cpf: normalizarCpf(String(form.get('responsavelCpf') ?? '')),
  }

  if (menor) {
    if (responsavel.nome.length < 5 || !responsavel.nome.includes(' ')) {
      return { ok: false, erro: 'Informe o nome completo do responsável.' }
    }
    if (!cpfValido(responsavel.cpf)) {
      return { ok: false, erro: 'Informe um CPF válido para o responsável.' }
    }
    if (!responsavel.parentesco) {
      return { ok: false, erro: 'Informe o parentesco do responsável.' }
    }
  }

  // --------------------------------------------------------- consentimentos
  const consentimentosDoFormulario = formulario.consentimentos ?? []
  const obrigatoriosPendentes = consentimentosDoFormulario.filter(
    (c) => c.obrigatorio && !aceitos.includes(String(c.identificador)),
  )
  if (obrigatoriosPendentes.length > 0) {
    return { ok: false, erro: 'É necessário aceitar os consentimentos obrigatórios.' }
  }

  const provas = consentimentosDoFormulario.map((c) =>
    provaConsentimento({
      aceito: aceitos.includes(String(c.identificador)),
      consentimento: c,
      ipHash: origem.ipHash,
      versaoAviso: formulario.lgpd?.versaoAviso ?? '2026-10',
      userAgentHash: origem.userAgentHash,
    }),
  )

  // ------------------------------------------------------ snapshot + cifra
  const respostasSnapshot = montarSnapshot(campos, validacao.valores)
  const snapshot = respostasSnapshot.map((item) => {
    if (!item.sensivel) return item
    return { ...item, cifrado: true, valor: cifrar(JSON.stringify(item.valor)) }
  })

  const payload = await getPayloadClient()

  const dados: RequiredDataFromCollectionSlug<'inscricoes'> = {
    protocolo: gerarProtocolo(),
    enviadaEm: new Date().toISOString(),
    atleta: atleta.id,
    evento: evento.id,
    formulario: formulario.id,
    formularioVersao: formulario.versao ?? 1,
    status: 'recebida',
    respostas: snapshot,
    consentimentos: provas,
    menorDeIdade: menor,
    idadeNaInscricao: idade,
    ...(menor
      ? {
          responsavel: {
            nome: responsavel.nome,
            parentesco: responsavel.parentesco,
            telefone: responsavel.telefone || undefined,
            cpf: responsavel.cpf,
          },
        }
      : {}),
  }

  try {
    const criada = await payload.create({
      collection: 'inscricoes',
      overrideAccess: true,
      data: dados,
    })

    // Confirmação com os dados do evento e as respostas (sem dados sensíveis).
    // A função engole o erro: inscrição gravada não pode falhar por e-mail.
    await enviarConfirmacaoInscricao({
      atleta,
      evento,
      inscricao: criada,
      payload,
      respostas: respostasSnapshot,
    })

    redirect(`/area/inscricoes/${criada.protocolo}?enviada=1`)
  } catch (e) {
    // `redirect` lança um erro especial do Next — não pode cair no catch como falha.
    if (e && typeof e === 'object' && 'digest' in e) throw e
    console.error('Falha ao gravar inscrição', e)
    return { ok: false, erro: 'Não foi possível enviar agora. Tente novamente em instantes.' }
  }
}
