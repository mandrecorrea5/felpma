import type { Metadata } from 'next'
import Link from 'next/link'
import { FormularioAcao } from '@/components/area/FormularioAcao'
import { Icon } from '@/components/Icon'
import { PageHero } from '@/components/ui'
import { exigirAtleta } from '@/lib/atleta/guarda'
import { labelOf, STATUS_INSCRICAO } from '@/lib/constants'
import { dataCurta, periodo, tamanhoArquivo } from '@/lib/format'
import { acceptDoCampo, LIMITE_ARQUIVO_MB } from '@/lib/inscricoes/arquivo'
import { comprovantesDoAtleta, estaPendenteDeComprovante } from '@/lib/inscricoes/comprovante'
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

  const protocoloPreferido = [sp.enviado, sp.inscricao].find(
    (protocolo) => protocolo && ativas.some((inscricao) => inscricao.protocolo === protocolo),
  )
  const selecionada = protocoloPreferido ?? ativas[0]?.protocolo ?? ''

  const enviado = sp.enviado
    ? (inscricoes.find((inscricao) => inscricao.protocolo === sp.enviado) ?? null)
    : null

  const comComprovante = ativas.filter((inscricao) =>
    comprovantes.has(String(inscricao.id)),
  )
  const pendentes = ativas.filter((inscricao) =>
    estaPendenteDeComprovante(inscricao, comprovantes.get(String(inscricao.id))),
  )

  return (
    <>
      <PageHero
        titulo="Comprovantes de pagamento"
        intro="Escolha a competição e envie o comprovante da inscrição que ficou para depois. A federação recebe uma cópia por e-mail."
        crumbs={[{ href: '/area', label: 'Área do atleta' }, { label: 'Comprovantes' }]}
      />

      <div className="container section" style={{ display: 'grid', gap: 32, maxWidth: 860 }}>
        {enviado ? (
          <div className="alerta alerta--ok" role="status">
            Comprovante enviado. A federação recebeu uma cópia por e-mail.{' '}
            <Link href={`/area/inscricoes/${enviado.protocolo}`}>Ver a inscrição</Link>.
          </div>
        ) : null}

        {pendentes.length > 0 ? (
          <div className="alerta alerta--erro" role="alert">
            <strong>
              {pendentes.length === 1
                ? 'Uma inscrição está pendente'
                : `${pendentes.length} inscrições estão pendentes`}{' '}
              de comprovante.
            </strong>{' '}
            Escolha a competição abaixo e envie o comprovante de pagamento para regularizar.
          </div>
        ) : ativas.length > 0 ? (
          <div className="alerta alerta--ok" role="status">
            Nenhuma inscrição pendente de comprovante de pagamento.
          </div>
        ) : null}

        {ativas.length === 0 ? (
          <div className="empty">
            Você ainda não tem inscrições que possam receber comprovante.{' '}
            <Link href="/area">Voltar para a área do atleta</Link> ou confira o{' '}
            <Link href="/calendario">calendário de competições</Link>.
          </div>
        ) : (
          <section aria-labelledby="enviar-comprovante">
            <h2 id="enviar-comprovante" className="eyebrow">
              Enviar comprovante
            </h2>
            <div className="card card--pad" style={{ marginTop: 12 }}>
              <FormularioAcao acao={enviarComprovante} rotulo="Enviar comprovante">
                <div className="field">
                  <label htmlFor="protocolo">Competição</label>
                  <select
                    id="protocolo"
                    name="protocolo"
                    className="select"
                    defaultValue={selecionada}
                    required
                  >
                    {ativas.map((inscricao) => {
                      const evento = typeof inscricao.evento === 'object' ? inscricao.evento : null
                      const lista = comprovantes.get(String(inscricao.id))
                      const quantos = lista?.length ?? 0
                      const faltaComprovante = estaPendenteDeComprovante(inscricao, lista)
                      const quando = periodo(evento?.dataInicio, evento?.dataFim)
                      return (
                        <option key={inscricao.id} value={inscricao.protocolo}>
                          {nomeDoEvento(evento)}
                          {quando ? ` — ${quando}` : ''} · {inscricao.protocolo}
                          {quantos > 0
                            ? ' (comprovante enviado)'
                            : faltaComprovante
                              ? ' (comprovante pendente)'
                              : ''}
                        </option>
                      )
                    })}
                  </select>
                  <small className="muted">
                    A inscrição precisa já ter sido feita pelo site. Não encontrou a competição?{' '}
                    <Link href="/contato">Fale com a federação</Link>.
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
                    PDF ou foto (JPG/PNG), até {LIMITE_ARQUIVO_MB} MB. Pode enviar mais de um
                    comprovante para a mesma inscrição.
                  </small>
                </div>
              </FormularioAcao>
            </div>
          </section>
        )}

        {comComprovante.length > 0 ? (
          <section aria-labelledby="comprovantes-enviados">
            <h2 id="comprovantes-enviados" className="eyebrow">
              Comprovantes já enviados
            </h2>
            <div className="card card--pad" style={{ marginTop: 12, display: 'grid', gap: 22 }}>
              {comComprovante.map((inscricao) => {
                const evento = typeof inscricao.evento === 'object' ? inscricao.evento : null
                const lista = comprovantes.get(String(inscricao.id)) ?? []
                return (
                  <div key={inscricao.id}>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 8,
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                      }}
                    >
                      <strong>
                        {nomeDoEvento(evento)} · {inscricao.protocolo}
                      </strong>
                      <span className="muted" style={{ fontSize: 13 }}>
                        {labelOf(STATUS_INSCRICAO, inscricao.status)}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                      {lista.map((comprovante) => (
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
                  </div>
                )
              })}
            </div>
          </section>
        ) : null}

        <p className="muted" style={{ fontSize: 14 }}>
          O comprovante fica guardado junto da sua inscrição e é visível para você e para a
          federação. Dúvidas sobre pagamento? <Link href="/contato">Fale com a federação</Link>.
        </p>
      </div>
    </>
  )
}
