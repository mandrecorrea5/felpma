import 'server-only'
import type { Where } from 'payload'
import type { Competicao, FormularioInscricao, Inscricao } from '@/payload-types'
import { getPayloadClient } from '@/lib/payload'
import { estadoInscricao, type ResultadoEstado } from './estado'

export async function eventoPorSlug(slug: string): Promise<Competicao | null> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'competicoes',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 1,
  })
  return docs[0] ?? null
}

export async function eventoPorId(id: number | string): Promise<Competicao | null> {
  const payload = await getPayloadClient()
  return (await payload.findByID({
    collection: 'competicoes',
    id,
    depth: 1,
  })) as Competicao
}

/** O formulário publicado mais recente do evento (o rascunho nunca vai ao ar). */
export async function formularioPublicado(
  eventoId: number | string,
): Promise<FormularioInscricao | null> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'formularios-inscricao',
    where: {
      and: [{ evento: { equals: eventoId } }, { _status: { equals: 'published' } }],
    },
    sort: '-versao',
    limit: 1,
    depth: 1,
  })
  return docs[0] ?? null
}

/**
 * Quantas vagas o evento já ocupou (usado no limite de vagas).
 *
 * Por padrão cada inscrição ocupa uma vaga — quem entra em Sub-17 e Sub-20
 * ocupa duas. A competição pode optar por contar atletas (`contarVagasPor:
 * 'atletas'`), aí a pessoa ocupa uma vaga só, quantas categorias fizer.
 */
export async function inscritosNoEvento(
  evento: number | string | { contarVagasPor?: null | string; id: number | string },
): Promise<number> {
  const payload = await getPayloadClient()
  const eventoId = typeof evento === 'object' ? evento.id : evento
  const modo = typeof evento === 'object' ? (evento.contarVagasPor ?? 'inscricoes') : 'inscricoes'
  const where: Where = {
    and: [
      { evento: { equals: eventoId } },
      { status: { not_in: ['cancelada', 'rejeitada'] } },
    ],
  }

  if (modo !== 'atletas') {
    const { totalDocs } = await payload.count({ collection: 'inscricoes', where })
    return totalDocs
  }

  // Uma vaga por atleta: busca só a relação e conta os ids distintos.
  const { docs } = await payload.find({
    collection: 'inscricoes',
    where,
    select: { atleta: true },
    pagination: false,
    limit: 5000,
    depth: 0,
  })
  const atletas = new Set(
    docs.map((inscricao) => {
      const atleta = inscricao.atleta
      return typeof atleta === 'object' && atleta ? atleta.id : atleta
    }),
  )
  return atletas.size
}

/**
 * Todas as inscrições ativas do atleta no evento.
 *
 * Pode ser mais de uma: o mesmo atleta se inscreve em várias categorias de
 * idade (Sub-17, Sub-20, Adulto), desde que a categoria de peso seja a mesma.
 * Canceladas não contam — quem cancelou pode se inscrever de novo.
 */
export async function inscricoesDoAtletaNoEvento(
  eventoId: number | string,
  atletaId: number | string,
): Promise<Inscricao[]> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'inscricoes',
    where: {
      and: [
        { evento: { equals: eventoId } },
        { atleta: { equals: atletaId } },
        { status: { not_equals: 'cancelada' } },
      ],
    },
    sort: '-enviadaEm',
    limit: 25,
    depth: 1,
  })
  return docs
}

export async function inscricoesDoAtleta(atletaId: number | string): Promise<Inscricao[]> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'inscricoes',
    where: { atleta: { equals: atletaId } },
    sort: '-enviadaEm',
    limit: 100,
    depth: 2,
  })
  return docs
}

/** Formulário publicado + o estado calculado para um atleta. */
export type FormularioDoPainel = {
  evento: Competicao
  /** Id do formulário publicado (chave da lista; o conteúdo não é carregado aqui). */
  formularioId: number
  estado: ResultadoEstado
}

export type PainelDoAtleta = {
  /** Formulários que o atleta pode preencher agora, do prazo mais curto para o mais longo. */
  disponiveis: FormularioDoPainel[]
  /** Formulários cuja janela ainda vai abrir (informativo, sem botão de preencher). */
  emBreve: FormularioDoPainel[]
  /** Formulários que ele já preencheu (inscrições), da mais recente para a mais antiga. */
  inscricoes: Inscricao[]
  /**
   * Estado de inscrição por evento (id do evento → estado), inclusive dos que já
   * foram preenchidos. É o que a lista de inscrições usa para oferecer
   * "Adicionar categoria" quando o formulário ainda aceita outra.
   */
  porEvento: Map<string, FormularioDoPainel>
}

/**
 * Tudo o que a área do atleta precisa para responder "o que falta preencher?" e
 * "o que já preenchi?".
 *
 * A lista de disponíveis nasce dos formulários publicados, não do calendário:
 * evento sem formulário nunca aparece como "para preencher", e a mesma regra de
 * `estadoInscricao` usada na página do formulário e na server action decide o que
 * está realmente aberto.
 */
export async function painelDoAtleta(atletaId: number | string): Promise<PainelDoAtleta> {
  const payload = await getPayloadClient()

  const [publicados, inscricoes] = await Promise.all([
    payload.find({
      collection: 'formularios-inscricao',
      where: { _status: { equals: 'published' } },
      sort: '-versao',
      limit: 200,
      depth: 1,
      // A lista só precisa saber que o formulário existe e a qual evento pertence.
      select: { evento: true, versao: true, limitePorAtleta: true },
    }),
    inscricoesDoAtleta(atletaId),
  ])

  // Um evento pode ter mais de uma versão publicada: vale sempre a mais recente.
  const formularioPorEvento = new Map<
    string,
    { id: number; evento: Competicao; limitePorAtleta: number; versao: number }
  >()
  for (const formulario of publicados.docs) {
    if (typeof formulario.evento !== 'object' || !formulario.evento) continue
    const chave = String(formulario.evento.id)
    const atual = formularioPorEvento.get(chave)
    const versao = Number(formulario.versao ?? 0)
    if (!atual || versao > atual.versao) {
      formularioPorEvento.set(chave, {
        id: formulario.id,
        evento: formulario.evento as Competicao,
        limitePorAtleta: Number(formulario.limitePorAtleta ?? 1),
        versao,
      })
    }
  }

  // A inscrição mais recente de cada evento (a lista já vem da mais nova para a mais antiga)
  // e quantas ativas o atleta tem ali — ele pode ter uma por categoria de idade.
  const inscricaoPorEvento = new Map<string, Inscricao>()
  const contagemPorEvento = new Map<string, number>()
  for (const inscricao of inscricoes) {
    if (inscricao.status === 'cancelada') continue
    const eventoId = typeof inscricao.evento === 'object' ? inscricao.evento?.id : inscricao.evento
    if (eventoId == null) continue
    const chave = String(eventoId)
    contagemPorEvento.set(chave, (contagemPorEvento.get(chave) ?? 0) + 1)
    if (!inscricaoPorEvento.has(chave)) inscricaoPorEvento.set(chave, inscricao)
  }

  const itens = await Promise.all(
    [...formularioPorEvento.values()].map(async (formulario): Promise<FormularioDoPainel> => {
      const evento = formulario.evento
      const feitas = contagemPorEvento.get(String(evento.id)) ?? 0
      // Só conta vagas quando isso pode mudar a decisão: evento com limite,
      // inscrições abertas e atleta ainda sem inscrição.
      const contarVagas = Boolean(evento.limiteVagas && evento.inscricoesAbertas && feitas === 0)
      const inscritos = contarVagas ? await inscritosNoEvento(evento) : 0

      return {
        evento,
        formularioId: formulario.id,
        estado: estadoInscricao(evento, {
          temFormulario: true,
          inscritos,
          inscricoesDoAtleta: feitas,
          limitePorAtleta: formulario.limitePorAtleta,
        }),
      }
    }),
  )

  return {
    porEvento: new Map(itens.map((item) => [String(item.evento.id), item])),
    disponiveis: itens
      .filter((i) => i.estado.podeInscrever)
      .sort((a, b) => (a.evento.inscricoesAte ?? '').localeCompare(b.evento.inscricoesAte ?? '')),
    emBreve: itens
      .filter((i) => i.estado.estado === 'em-breve' && !inscricaoPorEvento.has(String(i.evento.id)))
      .sort((a, b) => (a.evento.inscricoesDe ?? '').localeCompare(b.evento.inscricoesDe ?? '')),
    inscricoes,
  }
}
