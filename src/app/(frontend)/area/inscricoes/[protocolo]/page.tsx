import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { EventoGA } from '@/components/analytics/EventoGA'
import { PageHero } from '@/components/ui'
import { Icon } from '@/components/Icon'
import { exigirAtleta } from '@/lib/atleta/guarda'
import { labelOf, STATUS_INSCRICAO } from '@/lib/constants'
import { decifrar, ehCifrado } from '@/lib/crypto/campos'
import { mascararCpf } from '@/lib/cpf'
import { dataCurta, dataLonga, tamanhoArquivo } from '@/lib/format'
import { categoriaPesoDaInscricao, ehCategoriaPeso } from '@/lib/inscricoes/categoria-peso'
import {
  formularioPublicado,
  inscricoesDoAtletaNoEvento,
  inscritosNoEvento,
} from '@/lib/inscricoes/consultas'
import { estadoInscricao, type EventoParaInscricao } from '@/lib/inscricoes/estado'
import {
  comprovantesDoEvento,
  estaPendenteDeComprovante,
} from '@/lib/inscricoes/comprovante'
import { getPayloadClient } from '@/lib/payload'
import { cancelarInscricao } from './actions'

export const metadata: Metadata = { title: 'Inscrição', robots: { index: false } }
export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ protocolo: string }>
  searchParams: Promise<{ cancelada?: string; enviada?: string; erro?: string }>
}

type Snapshot = {
  campo: string
  cifrado?: boolean
  exibicao?: null | string
  rotulo: string
  sensivel?: boolean
  tipo: string
  valor: boolean | number | string | string[]
  arquivo?: null | { id: number | string; nome: string; tamanho?: number }
}

const TOM: Record<string, string> = {
  recebida: 'status--blue',
  'em-analise': 'status--blue',
  aprovada: 'status--green',
  'lista-espera': 'status--gray',
  rejeitada: 'status--red',
  cancelada: 'status--muted',
}

const exibir = (s: Snapshot): string => {
  if (s.exibicao) return s.exibicao
  if (typeof s.valor === 'boolean') return s.valor ? 'Sim' : 'Não'
  if (Array.isArray(s.valor)) return s.valor.join(', ')
  if (s.tipo === 'data' && typeof s.valor === 'string') return dataLonga(s.valor)
  return String(s.valor ?? '—')
}

export default async function InscricaoPage({ params, searchParams }: Props) {
  const { protocolo } = await params
  const sp = await searchParams
  const atleta = await exigirAtleta(`/area/inscricoes/${protocolo}`)

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
  if (!inscricao) notFound()

  // O comprovante é do atleta na competição: vale por todas as inscrições dele ali.
  const comprovantes = inscricao.evento
    ? await comprovantesDoEvento(
        atleta.id,
        typeof inscricao.evento === 'object' ? inscricao.evento.id : inscricao.evento,
      )
    : []
  const pendenteComprovante = estaPendenteDeComprovante(inscricao, comprovantes)

  const evento = typeof inscricao.evento === 'object' ? inscricao.evento : null
  const categoriaPeso = categoriaPesoDaInscricao(inscricao)
  // Cursos e eventos podem não pedir categoria de peso: nesse caso não há o
  // que cobrar do atleta nem o que exibir como "não informada".
  const formulario = typeof inscricao.formulario === 'object' ? inscricao.formulario : null
  const camposDoFormulario = (formulario?.campos ?? []) as {
    nome?: null | string
    rotulo?: null | string
  }[]
  const exigeCategoriaPeso = camposDoFormulario.some((campo) => ehCategoriaPeso(campo))
  const mostrarCategoriaPeso = Boolean(categoriaPeso) || exigeCategoriaPeso
  // Dá para adicionar outra categoria de idade? Depende da janela do evento, do
  // limite do formulário e de já não ter estourado as inscrições. A regra é a
  // mesma da página do evento: nada de link que leva a uma tela bloqueada.
  const formularioDoEvento = evento ? await formularioPublicado(evento.id) : null
  const inscricoesDoEvento =
    evento && atleta ? await inscricoesDoAtletaNoEvento(evento.id, atleta.id) : []
  const inscritos =
    evento && evento.limiteVagas ? await inscritosNoEvento(evento) : 0
  const estadoDoEvento = evento
    ? estadoInscricao(evento as EventoParaInscricao, {
        temFormulario: Boolean(formularioDoEvento),
        inscritos,
        inscricoesDoAtleta: inscricoesDoEvento.length,
        limitePorAtleta: formularioDoEvento?.limitePorAtleta ?? 1,
      })
    : null
  const podeAdicionarCategoria = Boolean(
    estadoDoEvento?.podeInscrever && inscricao.status !== 'cancelada',
  )

  const respostas = (Array.isArray(inscricao.respostas) ? inscricao.respostas : []).map((r) => {
    const item = r as Snapshot
    // O titular vê o próprio dado: aqui o valor cifrado é decifrado.
    if (item.cifrado && typeof item.valor === 'string' && ehCifrado(item.valor)) {
      try {
        return {
          ...item,
          cifrado: false,
          valor: JSON.parse(decifrar(item.valor)) as Snapshot['valor'],
        }
      } catch {
        return item
      }
    }
    return item
  }) as Snapshot[]
  const podeCancelar = ['recebida', 'em-analise'].includes(inscricao.status)
  const responsavel = (inscricao.responsavel ?? {}) as {
    nome?: null | string
    parentesco?: null | string
    telefone?: null | string
    cpf?: null | string
  }
  const cpfResponsavel = responsavel.cpf
    ? mascararCpf(ehCifrado(responsavel.cpf) ? decifrar(responsavel.cpf) : responsavel.cpf)
    : null

  return (
    <>
      <PageHero
        titulo={`Inscrição ${inscricao.protocolo}`}
        intro={evento?.nome ?? 'Evento'}
        crumbs={[
          { href: '/area', label: 'Área do atleta' },
          { label: inscricao.protocolo ?? 'Inscrição' },
        ]}
      >
        <div className="comp-card__tags">
          <span className={`status ${TOM[inscricao.status] ?? 'status--blue'}`}>
            {labelOf(STATUS_INSCRICAO, inscricao.status)}
          </span>
          {pendenteComprovante ? (
            <span
              className="status status--red"
              title="Falta enviar o comprovante de pagamento"
            >
              Pendente
            </span>
          ) : null}
          {categoriaPeso ? <span className="tag">Categoria de peso: {categoriaPeso}</span> : null}
          <span className="tag tag--cinza">Enviada em {dataCurta(inscricao.enviadaEm)}</span>
        </div>
      </PageHero>

      <div className="container section" style={{ display: 'grid', gap: 28, maxWidth: 820 }}>
        {/*
          Conversão principal do site (GA4). `protocolo` fica só na chave de
          deduplicação: ele identifica o titular e não vai como parâmetro — vai
          o slug do evento, que é o dado de negócio.
        */}
        {sp.enviada ? (
          <EventoGA
            chave={`inscricao:${inscricao.protocolo}`}
            nome="inscricao_enviada"
            parametros={{ evento: evento?.slug ?? 'desconhecido' }}
          />
        ) : null}
        {sp.cancelada ? (
          <div className="alerta alerta--ok" role="status">
            Inscrição cancelada.
          </div>
        ) : null}
        {sp.erro === 'status' ? (
          <div className="alerta alerta--erro" role="alert">
            Esta inscrição não pode mais ser cancelada por aqui. Fale com a federação.
          </div>
        ) : null}
        {podeAdicionarCategoria && evento ? (
          <div className="alerta alerta--ok" role="status" style={{ display: 'grid', gap: 10 }}>
            <div>
              <strong>Dá para competir em mais de uma categoria de idade.</strong> Este evento
              aceita outra inscrição sua — Sub-17, Sub-20, Adulto… — desde que a categoria de
              peso seja a mesma desta ({categoriaPeso ?? 'a informada'}).
            </div>
            <div>
              <Link
                href={`/inscricoes/${evento.slug}/formulario`}
                className="btn btn--sm btn--azul"
              >
                Adicionar outra categoria
              </Link>
            </div>
          </div>
        ) : null}
        {inscricao.status === 'rejeitada' && inscricao.motivoRejeicao ? (
          <div className="alerta alerta--erro" role="alert">
            <strong>Motivo:</strong> {inscricao.motivoRejeicao}
          </div>
        ) : null}
        {pendenteComprovante ? (
          <div
            className="alerta alerta--erro"
            role="alert"
            style={{ display: 'grid', gap: 10 }}
          >
            <div>
              <strong>Inscrição pendente de comprovante.</strong> Falta o envio do comprovante de
              pagamento. A inscrição fica pendente até a federação receber o comprovante.
            </div>
            <div>
              <Link
                href={`/area/comprovantes?inscricao=${inscricao.protocolo}`}
                className="btn btn--sm btn--vermelho"
              >
                Enviar comprovante agora
              </Link>
            </div>
          </div>
        ) : null}

        {mostrarCategoriaPeso ? (
          <section aria-labelledby="categoria-peso">
            <div className="card card--pad">
              <small id="categoria-peso" className="muted">
                Categoria de peso
              </small>
              <p style={{ fontSize: 22, fontWeight: 700, margin: '4px 0 0' }}>
                {categoriaPeso ?? 'Não informada'}
              </p>
              {!categoriaPeso ? (
                <p className="muted" style={{ fontSize: 13, margin: '6px 0 0' }}>
                  A categoria não foi encontrada nas respostas desta inscrição. Fale com a
                  federação para regularizar antes da competição.
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        <section aria-labelledby="respostas">
          <h2 id="respostas" style={{ fontSize: 20 }}>
            O que você respondeu
          </h2>
          <div className="card card--pad" style={{ marginTop: 12 }}>
            <ul className="info-list">
              {respostas.map((r) => (
                <li key={r.campo}>
                  <div>
                    <small>{r.rotulo}</small>
                    {r.arquivo ? (
                      <a
                        href={`/area/inscricoes/${inscricao.protocolo}/arquivos/${r.arquivo.id}`}
                        className="btn btn--sm btn--contorno"
                        download
                        data-ndovu-mask
                      >
                        <Icon name="download" size={16} />
                        Baixar {r.arquivo.nome}
                      </a>
                    ) : (
                      // `data-ndovu-mask` é proteção de dado, não estilo: o valor já
                      // vem decifrado para o titular e não pode ir num snapshot de
                      // tela (ver src/lib/ndovu/client.ts).
                      <span data-ndovu-mask>{exibir(r)}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="comprovantes">
          <h2 id="comprovantes" style={{ fontSize: 20 }}>
            Comprovante de pagamento
          </h2>
          <div className="card card--pad" style={{ marginTop: 12, display: 'grid', gap: 14 }}>
            {pendenteComprovante ? (
              <div className="alerta alerta--erro" role="status" style={{ margin: 0 }}>
                <strong>Comprovante pendente.</strong> Nenhum comprovante de pagamento foi
                enviado para esta inscrição. Envie um PDF ou uma foto (JPG/PNG) para regularizar.
              </div>
            ) : comprovantes.length === 0 ? (
              <p className="muted" style={{ margin: 0, fontSize: 14 }}>
                Nenhum comprovante enviado por aqui. Se o pagamento foi feito depois da inscrição,
                envie o comprovante para a federação.
              </p>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {comprovantes.map((comprovante) => (
                  <a
                    key={comprovante.id}
                    href={`/area/inscricoes/${inscricao.protocolo}/arquivos/${comprovante.id}`}
                    className="btn btn--sm btn--contorno"
                    download
                    data-ndovu-mask
                    style={{ justifyContent: 'flex-start' }}
                  >
                    <Icon name="download" size={16} />
                    {comprovante.nome}
                    {comprovante.tamanho ? ` · ${tamanhoArquivo(comprovante.tamanho)}` : ''}
                    <span className="muted" style={{ fontSize: 12 }}>
                      {dataCurta(comprovante.criadoEm)}
                    </span>
                  </a>
                ))}
              </div>
            )}

            {inscricao.status !== 'cancelada' ? (
              <div>
                <Link
                  href={`/area/comprovantes?inscricao=${inscricao.protocolo}`}
                  className={
                    pendenteComprovante ? 'btn btn--sm btn--vermelho' : 'btn btn--sm btn--azul'
                  }
                >
                  {comprovantes.length === 0 ? 'Enviar comprovante' : 'Enviar outro comprovante'}
                </Link>
              </div>
            ) : null}
          </div>
        </section>

        {inscricao.menorDeIdade && responsavel.nome ? (
          <section aria-labelledby="responsavel">
            <h2 id="responsavel" style={{ fontSize: 20 }}>
              Responsável
            </h2>
            <div className="card card--pad" style={{ marginTop: 12 }}>
              <ul className="info-list">
                <li>
                  <div>
                    <small>Nome</small>
                    <span data-ndovu-mask>{responsavel.nome}</span>
                  </div>
                </li>
                <li>
                  <div>
                    <small>Parentesco</small>
                    <span data-ndovu-mask>{responsavel.parentesco ?? '—'}</span>
                  </div>
                </li>
                <li>
                  <div>
                    <small>Telefone</small>
                    <span data-ndovu-mask>{responsavel.telefone ?? '—'}</span>
                  </div>
                </li>
                <li>
                  <div>
                    <small>CPF</small>
                    <span data-ndovu-mask>{cpfResponsavel ?? '—'}</span>
                  </div>
                </li>
              </ul>
            </div>
          </section>
        ) : null}

        <section aria-labelledby="consentimentos">
          <h2 id="consentimentos" style={{ fontSize: 20 }}>
            Consentimentos
          </h2>
          <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
            {(inscricao.consentimentos ?? []).map((c) => (
              <div key={c.id ?? c.identificador} className="consentimento">
                <p style={{ margin: 0, fontSize: 14 }}>{c.texto ?? '—'}</p>
                <p className="muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
                  Versão {c.versao} ·{' '}
                  {c.aceito ? `aceito em ${dataCurta(c.aceitoEm)}` : 'não aceito'}
                </p>
              </div>
            ))}
          </div>
        </section>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/area" className="btn btn--contorno">
            Voltar
          </Link>
          {podeCancelar ? (
            <form action={cancelarInscricao}>
              <input type="hidden" name="protocolo" value={inscricao.protocolo ?? ''} />
              <button type="submit" className="btn btn--vermelho">
                Cancelar inscrição
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </>
  )
}
