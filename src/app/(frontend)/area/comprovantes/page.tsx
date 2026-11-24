import type { Metadata } from 'next'
import Link from 'next/link'
import { FormularioAcao } from '@/components/area/FormularioAcao'
import { Icon } from '@/components/Icon'
import { PageHero } from '@/components/ui'
import { exigirAtleta } from '@/lib/atleta/guarda'
import { labelOf, STATUS_INSCRICAO } from '@/lib/constants'
import { dataCurta, periodo, tamanhoArquivo } from '@/lib/format'
import { acceptDoCampo, LIMITE_ARQUIVO_MB } from '@/lib/inscricoes/arquivo'
import {
  comprovantesDoAtleta,
  estaPendenteDeComprovante,
  eventoDaInscricao,
  eventoCobraInscricao,
  MAX_COMPROVANTES_POR_EVENTO,
} from '@/lib/inscricoes/comprovante'
import { inscricoesDoAtleta } from '@/lib/inscricoes/consultas'
import { enviarComprovante } from './actions'

export const metadata: Metadata = { title: 'Comprovantes', robots: { index: false } }
export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ enviado?: string; inscricao?: string }> }

const nomeDoEvento = (evento: unknown): string =>
  typeof evento === 'object' && evento && 'nome' in evento
    ? String((evento as { nome?: null | string }).nome ?? 'Evento')
    : 'Evento'

export default async function ComprovantesPage({ searchParams }: Props) {
  const atleta = await exigirAtleta('/area/comprovantes')
  const sp = await searchParams

  const [inscricoes, comprovantes] = await Promise.all([
    inscricoesDoAtleta(atleta.id),
    comprovantesDoAtleta(atleta.id),
  ])

  // Inscrição cancelada não recebe pagamento novo; o histórico continua no detalhe.
  const ativas = inscricoes.filter((inscricao) => inscricao.status !== 'cancelada')

  // O comprovante é do atleta na competição: o seletor é o evento, não a
  // inscrição. Quem entrou em Sub-17 e Sub-20 manda um comprovante só.
  const porEvento = new Map<
    string,
    { evento: NonNullable<(typeof ativas)[number]['evento']> & object; inscricoes: typeof ativas }
  >()
  for (const inscricao of ativas) {
    const evento = typeof inscricao.evento === 'object' ? inscricao.evento : null
    if (!evento) continue
    const chave = String(evento.id)
    const atual = porEvento.get(chave)
    if (atual) atual.inscricoes.push(inscricao)
    else porEvento.set(chave, { evento, inscricoes: [inscricao] })
  }

  const preferido = [sp.enviado, sp.inscricao].find(
    (valor) =>
      valor &&
      (porEvento.has(String(valor)) ||
        ativas.some((inscricao) => inscricao.protocolo === valor)),
  )
  const selecionado = (() => {
    if (!preferido) return String([...porEvento.keys()][0] ?? '')
    if (porEvento.has(String(preferido))) return String(preferido)
    const inscricao = ativas.find((i) => i.protocolo === preferido)
    return inscricao ? String(eventoDaInscricao(inscricao) ?? '') : ''
  })()

  const enviado = sp.enviado ? (porEvento.get(String(sp.enviado)) ?? null) : null

  // Evento sem taxa não entra na cobrança: nada de comprovante nem pendência.
  const eventosComTaxa = [...porEvento.entries()].filter(([, grupo]) =>
    eventoCobraInscricao(grupo.evento),
  )

  const eventosPendentes = eventosComTaxa.filter(([chave, grupo]) =>
    grupo.inscricoes.some((inscricao) =>
      estaPendenteDeComprovante(inscricao, comprovantes.get(chave), grupo.evento),
    ),
  )
  const eventosComComprovante = [...porEvento.entries()].filter(
    ([chave]) => (comprovantes.get(chave)?.length ?? 0) > 0,
  )

  return (
    <>
      <PageHero
        titulo="Comprovantes de pagamento"
        intro="Escolha a competição e envie o comprovante do pagamento. A federação recebe uma cópia por e-mail."
        crumbs={[{ href: '/area', label: 'Área do atleta' }, { label: 'Comprovantes' }]}
      />

      <div className="container section" style={{ display: 'grid', gap: 32, maxWidth: 860 }}>
        {enviado ? (
          <div className="alerta alerta--ok" role="status">
            Comprovante enviado. A federação recebeu uma cópia por e-mail.{' '}
            <Link href={`/area/inscricoes/${enviado.inscricoes[0].protocolo}`}>
              Ver a inscrição
            </Link>
            .
          </div>
        ) : null}

        {eventosPendentes.length > 0 ? (
          <div className="alerta alerta--erro" role="alert">
            <strong>
              {eventosPendentes.length === 1
                ? 'Uma competição está pendente'
                : `${eventosPendentes.length} competições estão pendentes`}{' '}
              de comprovante.
            </strong>{' '}
            Um comprovante já quita todas as inscrições suas naquela competição.
          </div>
        ) : eventosComTaxa.length > 0 && eventosComComprovante.length > 0 ? (
          <div className="alerta alerta--ok" role="status">
            Nenhuma competição pendente de comprovante de pagamento.
          </div>
        ) : null}

        {porEvento.size === 0 ? (
          <div className="empty">
            Você ainda não tem inscrições que possam receber comprovante.{' '}
            <Link href="/area">Voltar para a área do atleta</Link> ou confira o{' '}
            <Link href="/calendario">calendário de competições</Link>.
          </div>
        ) : eventosComTaxa.length === 0 ? (
          <div className="alerta alerta--ok" role="status">
            Nenhuma das suas competições tem taxa de inscrição — não é preciso enviar comprovante
            de pagamento.
          </div>
        ) : (
          <section aria-labelledby="enviar-comprovante">
            <h2 id="enviar-comprovante" className="eyebrow">
              Enviar comprovante
            </h2>
            <div className="card card--pad" style={{ marginTop: 12 }}>
              <FormularioAcao acao={enviarComprovante} rotulo="Enviar comprovante">
                <div className="field">
                  <label htmlFor="evento">Competição</label>
                  <select
                    id="evento"
                    name="evento"
                    className="select"
                    defaultValue={selecionado}
                    required
                  >
                    {eventosComTaxa.map(([chave, grupo]) => {
                      const lista = comprovantes.get(chave)
                      const quantos = lista?.length ?? 0
                      const falta = grupo.inscricoes.some((inscricao) =>
                        estaPendenteDeComprovante(inscricao, lista, grupo.evento),
                      )
                      return (
                        <option key={chave} value={chave}>
                          {nomeDoEvento(grupo.evento)}
                          {periodo(grupo.evento.dataInicio, grupo.evento.dataFim)
                            ? ` — ${periodo(grupo.evento.dataInicio, grupo.evento.dataFim)}`
                            : ''}
                          {quantos > 0
                            ? ` (${quantos} comprovante${quantos > 1 ? 's' : ''} enviado${quantos > 1 ? 's' : ''})`
                            : falta
                              ? ' (comprovante pendente)'
                              : ''}
                        </option>
                      )
                    })}
                  </select>
                  <small className="muted">
                    Uma inscrição por categoria de idade conta como a mesma competição. Não
                    encontrou a competição? <Link href="/contato">Fale com a federação</Link>.
                  </small>
                </div>

                <div className="field">
                  <label htmlFor="arquivo">Comprovante de pagamento</label>
                  <input
                    id="arquivo"
                    name="arquivo"
                    type="file"
                    className="input arquivo-campo__input"
                    accept={acceptDoCampo('pdf-imagem')}
                    required
                  />
                  <small className="muted">
                    PDF ou foto (JPG/PNG), até {LIMITE_ARQUIVO_MB} MB. Dá para enviar até{' '}
                    {MAX_COMPROVANTES_POR_EVENTO} comprovantes por competição (pagamento
                    dividido) — um só já vale por todas as suas inscrições nela.
                  </small>
                </div>
              </FormularioAcao>
            </div>
          </section>
        )}

        {eventosComComprovante.length > 0 ? (
          <section aria-labelledby="comprovantes-enviados">
            <h2 id="comprovantes-enviados" className="eyebrow">
              Comprovantes já enviados
            </h2>
            <div className="card card--pad" style={{ marginTop: 12, display: 'grid', gap: 22 }}>
              {eventosComComprovante.map(([chave, grupo]) => {
                const lista = comprovantes.get(chave) ?? []
                const protocolo = grupo.inscricoes[0]?.protocolo
                return (
                  <div key={chave}>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 8,
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                      }}
                    >
                      <strong>{nomeDoEvento(grupo.evento)}</strong>
                      <span className="muted" style={{ fontSize: 13 }}>
                        {grupo.inscricoes
                          .map((inscricao) => labelOf(STATUS_INSCRICAO, inscricao.status))
                          .join(' · ')}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                      {lista.map((comprovante) => (
                        <a
                          key={comprovante.id}
                          href={`/area/inscricoes/${protocolo}/arquivos/${comprovante.id}`}
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
                  </div>
                )
              })}
            </div>
          </section>
        ) : null}

        <p className="muted" style={{ fontSize: 14 }}>
          O comprovante fica guardado na sua competição e é visível para você e para a federação.
          Dúvidas sobre pagamento? <Link href="/contato">Fale com a federação</Link>.
        </p>
      </div>
    </>
  )
}
