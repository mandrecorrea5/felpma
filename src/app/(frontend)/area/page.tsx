import type { Metadata } from 'next'
import Link from 'next/link'
import { FormularioCard } from '@/components/area/FormularioCard'
import { PageHero } from '@/components/ui'
import { exigirAtleta } from '@/lib/atleta/guarda'
import { labelOf, STATUS_INSCRICAO } from '@/lib/constants'
import { dataCurta, periodo } from '@/lib/format'
import { categoriaPesoDaInscricao } from '@/lib/inscricoes/categoria-peso'
import {
  comprovantesDoAtleta,
  estaPendenteDeComprovante,
  eventoDaInscricao,
} from '@/lib/inscricoes/comprovante'
import { painelDoAtleta } from '@/lib/inscricoes/consultas'
import { sairAction } from './actions'

export const metadata: Metadata = { title: 'Área do atleta' }
export const dynamic = 'force-dynamic'

const TOM: Record<string, string> = {
  recebida: 'status--blue',
  'em-analise': 'status--blue',
  aprovada: 'status--green',
  'lista-espera': 'status--gray',
  rejeitada: 'status--red',
  cancelada: 'status--muted',
}

type Props = { searchParams: Promise<{ retomar?: string }> }

export default async function AreaPage({ searchParams }: Props) {
  const { retomar } = await searchParams
  // Sessão expirada não perde o formulário que a pessoa estava abrindo.
  const atleta = await exigirAtleta(
    retomar ? `/area?retomar=${encodeURIComponent(retomar)}` : '/area',
  )
  const painel = await painelDoAtleta(atleta.id)
  const comprovantes = await comprovantesDoAtleta(atleta.id)
  const comprovantesDoEvento = (inscricao: (typeof painel.inscricoes)[number]) =>
    comprovantes.get(String(eventoDaInscricao(inscricao) ?? ''))
  const eventoDa = (inscricao: (typeof painel.inscricoes)[number]) =>
    typeof inscricao.evento === 'object' ? inscricao.evento : undefined
  const pendentes = painel.inscricoes.filter((inscricao) =>
    estaPendenteDeComprovante(inscricao, comprovantesDoEvento(inscricao), eventoDa(inscricao)),
  )

  // Quem clicou em "Preencher" antes de entrar volta para cá: o formulário que
  // estava abrindo sobe para o topo da lista, já com o botão de continuar.
  const destaque = retomar
    ? (painel.disponiveis.find((i) => i.evento.slug === retomar) ?? null)
    : null
  const disponiveis = destaque
    ? [destaque, ...painel.disponiveis.filter((i) => i !== destaque)]
    : painel.disponiveis
  const emBreveRetomar = retomar
    ? (painel.emBreve.find((i) => i.evento.slug === retomar) ?? null)
    : null
  const inscricaoRetomar = retomar
    ? (painel.inscricoes.find((i) => typeof i.evento === 'object' && i.evento?.slug === retomar) ??
      null)
    : null

  return (
    <>
      <PageHero
        titulo={`Olá, ${atleta.nome.split(' ')[0]}`}
        intro="Formulários para preencher, inscrições enviadas e seus dados — em um só lugar."
        crumbs={[{ label: 'Área do atleta' }]}
      >
        <div className="comp-card__tags">
          <span className="tag">
            {disponiveis.length} {disponiveis.length === 1 ? 'disponível' : 'disponíveis'}
          </span>
          <span className="tag">
            {painel.inscricoes.length} preenchido{painel.inscricoes.length === 1 ? '' : 's'}
          </span>
          {pendentes.length > 0 ? (
            <span className="tag tag--vermelho">
              {pendentes.length} com comprovante pendente
            </span>
          ) : null}
          <span className="tag tag--cinza" data-ndovu-mask>
            {atleta.email}
          </span>
        </div>
      </PageHero>

      <div className="container section" style={{ display: 'grid', gap: 40 }}>
        {!atleta.sexo ? (
          <div className="alerta alerta--erro" role="status" style={{ margin: 0 }}>
            <strong>Complete seu sexo no cadastro.</strong> Ele define a categoria de peso nas
            inscrições e evita perguntas repetidas. Você pode informar agora em{' '}
            <Link href="/area/meus-dados">Meus dados</Link> ou na primeira inscrição — vamos salvar
            na sua conta.
          </div>
        ) : null}
        {pendentes.length > 0 ? (
          <div className="alerta alerta--erro" role="alert" style={{ margin: 0 }}>
            <strong>Inscrição pendente de comprovante.</strong>{' '}
            {pendentes.length === 1
              ? 'Uma inscrição ainda precisa'
              : `${pendentes.length} inscrições ainda precisam`}{' '}
            do comprovante de pagamento. Envie em{' '}
            <Link href="/area/comprovantes">Comprovantes</Link> para regularizar.
            <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
              {pendentes.map((inscricao) => {
                const evento =
                  typeof inscricao.evento === 'object' ? inscricao.evento : null
                return (
                  <li key={inscricao.id}>
                    {evento?.nome ?? 'Evento'} · {inscricao.protocolo} —{' '}
                    <Link href={`/area/comprovantes?inscricao=${inscricao.protocolo}`}>
                      enviar comprovante
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}
        {retomar && !destaque ? (
          <div
            className={
              inscricaoRetomar || emBreveRetomar ? 'alerta alerta--ok' : 'alerta alerta--erro'
            }
            role="status"
            style={{ margin: 0 }}
          >
            {inscricaoRetomar ? (
              <>
                Você já preencheu este formulário.{' '}
                <Link href={`/area/inscricoes/${inscricaoRetomar.protocolo}`}>
                  Ver a inscrição {inscricaoRetomar.protocolo}
                </Link>
                .
              </>
            ) : emBreveRetomar ? (
              <>
                As inscrições para <strong>{emBreveRetomar.evento.nome}</strong> ainda não abriram.{' '}
                <Link href={`/calendario/${emBreveRetomar.evento.slug}`}>Ver o evento</Link>.
              </>
            ) : (
              <>
                O formulário que você tentou abrir não está mais disponível. Confira abaixo os que
                estão abertos ou veja o <Link href="/calendario">calendário</Link>.
              </>
            )}
          </div>
        ) : null}

        <section aria-labelledby="formularios-disponiveis">
          <h2 id="formularios-disponiveis" className="eyebrow">
            Formulários disponíveis
          </h2>

          {disponiveis.length === 0 ? (
            <div className="empty">
              Nenhum formulário aberto no momento. Acompanhe o{' '}
              <Link href="/calendario">calendário de competições</Link> para saber quando as
              próximas inscrições abrirem.
            </div>
          ) : (
            <div className="form-grid">
              {disponiveis.map((item) => (
                <FormularioCard key={item.formularioId} item={item} destaque={item === destaque} />
              ))}
            </div>
          )}

          {painel.emBreve.length > 0 ? (
            <div className="card card--pad" style={{ marginTop: 16 }}>
              <h3 className="card__titulo">Abrem em breve</h3>
              <div className="em-breve-lista">
                {painel.emBreve.map((item) => (
                  <div key={item.formularioId} className="em-breve-lista__item">
                    <strong>{item.evento.nome}</strong>
                    <span className="muted" style={{ fontSize: 14 }}>
                      {item.estado.detalhe}
                    </span>
                    {item.evento.slug ? (
                      <Link
                        href={`/calendario/${item.evento.slug}`}
                        className="btn btn--sm btn--contorno"
                      >
                        Ver evento
                      </Link>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <section aria-labelledby="formularios-preenchidos">
          <h2 id="formularios-preenchidos" className="eyebrow">
            Formulários preenchidos
          </h2>

          {painel.inscricoes.length === 0 ? (
            <div className="empty">
              Você ainda não preencheu nenhum formulário. Escolha um dos disponíveis acima para
              começar.
            </div>
          ) : (
            <div className="card card--pad inscricao-lista">
              {painel.inscricoes.map((i) => {
                const evento = typeof i.evento === 'object' ? i.evento : null
                const quando = periodo(evento?.dataInicio, evento?.dataFim)
                const categoriaPeso = categoriaPesoDaInscricao(i)
                const pendente = estaPendenteDeComprovante(
                  i,
                  comprovantesDoEvento(i),
                  evento ?? undefined,
                )
                // O formulário do evento ainda aceita outra inscrição deste atleta?
                const podeAdicionar = Boolean(
                  evento &&
                    i.status !== 'cancelada' &&
                    painel.porEvento.get(String(evento.id))?.estado.podeInscrever,
                )
                return (
                  <div key={i.id} className="inscricao-lista__item">
                    <div className="inscricao-lista__txt">
                      <strong>{evento?.nome ?? 'Evento'}</strong>
                      <div className="muted" style={{ fontSize: 14 }}>
                        {quando ? `${quando} · ` : ''}
                        Protocolo {i.protocolo} · enviada em {dataCurta(i.enviadaEm)}
                      </div>
                      {pendente ? (
                        <div
                          style={{
                            color: 'var(--vermelho-escuro)',
                            fontSize: 14,
                            fontWeight: 600,
                            marginTop: 4,
                          }}
                        >
                          Falta enviar o comprovante de pagamento.
                        </div>
                      ) : null}
                    </div>
                    {categoriaPeso ? (
                      <span className="tag tag--cinza">Categoria de peso: {categoriaPeso}</span>
                    ) : null}
                    {pendente ? (
                      <span
                        className="status status--red"
                        title="Falta enviar o comprovante de pagamento"
                      >
                        Pendente
                      </span>
                    ) : null}
                    <span className={`status ${TOM[i.status] ?? 'status--blue'}`}>
                      {labelOf(STATUS_INSCRICAO, i.status)}
                    </span>
                    {i.status !== 'cancelada' ? (
                      <Link
                        href={`/area/comprovantes?inscricao=${i.protocolo}`}
                        className={
                          pendente ? 'btn btn--sm btn--vermelho' : 'btn btn--sm btn--contorno'
                        }
                      >
                        {pendente ? 'Enviar comprovante' : 'Comprovante'}
                      </Link>
                    ) : null}
                    <Link
                      href={`/area/inscricoes/${i.protocolo}`}
                      className="btn btn--sm btn--contorno"
                    >
                      Ver detalhes
                    </Link>
                    {podeAdicionar && evento ? (
                      <Link
                        href={`/inscricoes/${evento.slug}/formulario`}
                        className="btn btn--sm btn--azul"
                      >
                        Adicionar categoria
                      </Link>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section aria-labelledby="atalhos">
          <h2 id="atalhos" className="eyebrow">
            Conta
          </h2>
          <div className="tiles">
            <Link href="/area/comprovantes" className="tile">
              <span className="tile__titulo">Comprovantes</span>
              <span className="muted">Enviar pagamento</span>
            </Link>
            <Link href="/area/meus-dados" className="tile">
              <span className="tile__titulo">Meus dados</span>
              <span className="muted">Contato e senha</span>
            </Link>
            <Link href="/area/consentimentos" className="tile">
              <span className="tile__titulo">Consentimentos</span>
              <span className="muted">Ver e revogar</span>
            </Link>
            <Link href="/area/privacidade" className="tile">
              <span className="tile__titulo">Privacidade</span>
              <span className="muted">Exportar ou excluir</span>
            </Link>
            <form action={sairAction}>
              <button type="submit" className="btn btn--contorno">
                Sair da conta
              </button>
            </form>
          </div>
        </section>
      </div>
    </>
  )
}
