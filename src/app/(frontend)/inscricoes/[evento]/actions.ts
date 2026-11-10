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
  type ArquivoSnapshot,
  type CampoFormulario,
  camposVisiveis,
  montarSnapshot,
  validarRespostas,
  type Respostas,
} from '@/lib/inscricoes/validacao'
import { LIMITE_ARQUIVO_BYTES, nomeArmazenado } from '@/lib/inscricoes/arquivo'
import { type ArquivoPreparado, prepararArquivo } from '@/lib/inscricoes/arquivo-servidor'
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

  // ------------------------------------------------------------- arquivos
  // O navegador manda cada arquivo em `arquivo:<nome do campo>`. Antes de validar
  // as respostas, o upload é conferido (tipo e tamanho reais) e o nome entra na
  // resposta para a revisão; o binário só é gravado depois, junto da inscrição.
  type Preparado = Extract<ArquivoPreparado, { ok: true }>
  const arquivos = new Map<string, { nome: string; preparado: Preparado }>()
  let bytesEnviados = 0

  for (const campo of camposVisiveis(campos, respostas)) {
    if (campo.blockType !== 'arquivo' || !campo.nome) continue
    const enviado = form.get(`arquivo:${campo.nome}`)
    const arquivo = enviado instanceof File ? enviado : null
    const rotulo = campo.rotulo ?? campo.nome

    if (!arquivo || arquivo.size === 0) {
      if (campo.obrigatorio) {
        return {
          ok: false,
          erro: `Envie o arquivo em "${rotulo}".`,
          erros: [{ campo: campo.nome, mensagem: 'Arquivo obrigatório.' }],
        }
      }
      continue
    }

    const preparado = await prepararArquivo(arquivo, campo.aceita)
    if (!preparado.ok) {
      return {
        ok: false,
        erro: preparado.erro,
        erros: [{ campo: campo.nome, mensagem: preparado.erro }],
      }
    }

    bytesEnviados += preparado.tamanho
    if (bytesEnviados > LIMITE_ARQUIVO_BYTES * 5) {
      return {
        ok: false,
        erro: 'Os arquivos somam mais de 10 MB. Envie menos arquivos ou reduza o tamanho.',
      }
    }

    arquivos.set(campo.nome, { nome: arquivo.name, preparado })
    respostas[campo.nome] = arquivo.name
  }

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
  const payload = await getPayloadClient()
  const protocolo = gerarProtocolo()
  const respostasSnapshot = montarSnapshot(campos, validacao.valores)

  const arquivosPorCampo = new Map<string, ArquivoSnapshot>()
  const arquivosGravados: Array<number | string> = []
  let inscricaoCriada = false

  try {
    // Os uploads vêm antes da inscrição: se um falhar, nada fica pela metade.
    for (const [campo, { nome, preparado }] of arquivos) {
      const rotulo = campos.find((c) => c.nome === campo)?.rotulo ?? campo
      const criado = await payload.create({
        collection: 'arquivos-inscricao',
        data: {
          titulo: nome,
          campo,
          rotulo,
          atleta: atleta.id,
          formulario: formulario.id,
        },
        file: {
          data: preparado.buffer,
          mimetype: preparado.mimetype,
          name: nomeArmazenado(protocolo, campo, preparado.extensao),
          size: preparado.tamanho,
        },
        overrideAccess: true,
      })

      arquivosGravados.push(criado.id)
      arquivosPorCampo.set(campo, {
        id: criado.id,
        mimetype: preparado.mimetype,
        nome,
        tamanho: preparado.tamanho,
      })
    }

    const snapshot = respostasSnapshot.map((item) => {
      const arquivo = arquivosPorCampo.get(item.campo)
      const comArquivo = arquivo ? { ...item, arquivo, valor: arquivo.nome } : item
      if (!comArquivo.sensivel) return comArquivo
      return { ...comArquivo, cifrado: true, valor: cifrar(JSON.stringify(comArquivo.valor)) }
    })

    const dados: RequiredDataFromCollectionSlug<'inscricoes'> = {
      protocolo,
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

    const criada = await payload.create({
      collection: 'inscricoes',
      overrideAccess: true,
      data: dados,
    })
    inscricaoCriada = true

    // Vincula os uploads à inscrição — é o vínculo que a área do atleta usa
    // para liberar o download. Falhar aqui não derruba a inscrição já gravada.
    for (const id of arquivosGravados) {
      try {
        await payload.update({
          collection: 'arquivos-inscricao',
          id,
          data: { inscricao: criada.id },
          overrideAccess: true,
        })
      } catch (erro) {
        console.error('Falha ao vincular arquivo à inscrição', id, erro)
      }
    }

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
    // Sem inscrição gravada, os uploads seriam órfãos e continuariam ocupando disco.
    if (!inscricaoCriada) {
      for (const id of arquivosGravados) {
        try {
          await payload.delete({ collection: 'arquivos-inscricao', id, overrideAccess: true })
        } catch {
          // O arquivo órfão é um problema menor do que mascarar o erro original.
        }
      }
    }
    console.error('Falha ao gravar inscrição', e)
    // O Payload valida o conteúdo do arquivo (não só a extensão). Um PDF
    // corrompido ou uma foto que não abre merece uma mensagem acionável.
    if (e && typeof e === 'object' && 'name' in e && e.name === 'ValidationError') {
      return {
        ok: false,
        erro: 'Não foi possível anexar um dos arquivos. Verifique se ele abre e envie de novo.',
      }
    }
    return { ok: false, erro: 'Não foi possível enviar agora. Tente novamente em instantes.' }
  }
}
