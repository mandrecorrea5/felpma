import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FormularioInscricao } from '@/components/inscricoes/FormularioInscricao'
import { PagamentoInscricao } from '@/components/inscricoes/PagamentoInscricao'
import { RichText } from '@/components/RichText'
import { PageHero } from '@/components/ui'
import { exigirAtleta } from '@/lib/atleta/guarda'
import { periodo } from '@/lib/format'
import {
  eventoPorSlug,
  formularioPublicado,
  inscricoesDoAtletaNoEvento,
  inscritosNoEvento,
} from '@/lib/inscricoes/consultas'
import { estadoInscricao, type EventoParaInscricao } from '@/lib/inscricoes/estado'
import {
  categoriaPesoDaInscricao,
  pesoDaCategoria,
} from '@/lib/inscricoes/categoria-peso'
import { dadosIniciaisDoCadastro } from '@/lib/inscricoes/dados-cadastro'
import { idadeEm } from '@/lib/inscricoes/idade'
import type { CampoFormulario } from '@/lib/inscricoes/validacao'
import { enviarInscricao } from '../actions'

export const metadata: Metadata = { title: 'Formulário de inscrição', robots: { index: false } }
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ evento: string }> }

export default async function FormularioPage({ params }: Props) {
  const { evento: slug } = await params
  const evento = await eventoPorSlug(slug)
  if (!evento) notFound()

  const retorno = `/inscricoes/${slug}/formulario`
  const atleta = await exigirAtleta(retorno)

  const formulario = await formularioPublicado(evento.id)
  if (!formulario) notFound()

  const inscritos = await inscritosNoEvento(evento)
  const inscricoes = await inscricoesDoAtletaNoEvento(evento.id, atleta.id)
  const estado = estadoInscricao(evento as EventoParaInscricao, {
    temFormulario: true,
    inscritos,
    inscricoesDoAtleta: inscricoes.length,
    limitePorAtleta: formulario.limitePorAtleta ?? 1,
  })

  if (!estado.podeInscrever) {
    return (
      <>
        <PageHero
          titulo={`Inscrição — ${evento.nome}`}
          crumbs={[{ href: '/area', label: 'Área do atleta' }, { label: 'Inscrição' }]}
        />
        <div className="container section" style={{ maxWidth: 720 }}>
          <div className="alerta alerta--erro" role="alert">
            {estado.rotulo}: {estado.detalhe}
          </div>
          <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {inscricoes[0] ? (
              <Link
                href={`/area/inscricoes/${inscricoes[0].protocolo}`}
                className="btn btn--azul"
              >
                {inscricoes.length > 1 ? 'Ver minhas inscrições' : 'Ver minha inscrição'}
              </Link>
            ) : null}
            <Link href={`/calendario/${evento.slug}`} className="btn btn--contorno">
              Voltar ao evento
            </Link>
          </div>
        </div>
      </>
    )
  }

  // Peso já usado nas inscrições deste evento: a nova tem de repetir o kg, então
  // o formulário nem oferece outra categoria de peso.
  const pesoPermitido =
    inscricoes
      .map((inscricao) => pesoDaCategoria(categoriaPesoDaInscricao(inscricao)))
      .find((peso) => peso != null) ?? null

  const idade = idadeEm(atleta.dataNascimento)
  const campos = (formulario.campos ?? []) as CampoFormulario[]
  const { respostas: respostasIniciais, bloqueados: camposBloqueados } = dadosIniciaisDoCadastro(
    campos,
    atleta,
    evento.dataInicio,
  )

  // O modal só é montado se houver algo para mostrar. O documento precisa estar
  // público: o link aponta para a rota de arquivo do Payload, que respeita
  // `publico` e devolveria 403 para quem não está no painel.
  const relacaoDoModal = formulario.confirmacao?.arquivo
  const arquivoDoModal =
    relacaoDoModal &&
    typeof relacaoDoModal === 'object' &&
    relacaoDoModal.publico &&
    relacaoDoModal.filename
      ? {
          href: `/api/documentos/file/${encodeURIComponent(relacaoDoModal.filename)}`,
          nome: relacaoDoModal.titulo,
        }
      : null
  const textoDoModal = formulario.confirmacao?.texto?.trim() ?? ''
  const temConfirmacao = Boolean(arquivoDoModal || textoDoModal)

  return (
    <>
      <PageHero
        titulo={formulario.titulo}
        intro={`${evento.nome} · ${periodo(evento.dataInicio, evento.dataFim)}`}
        crumbs={[
          { href: '/area', label: 'Área do atleta' },
          { href: `/inscricoes/${slug}`, label: 'Inscrição' },
          { label: 'Formulário' },
        ]}
      />

      <div className="container section" style={{ maxWidth: 820, display: 'grid', gap: 18 }}>
        <PagamentoInscricao
          valor={evento.valorInscricao}
          pixChave={evento.pixChave}
          pixTitular={evento.pixTitular}
        />

        {inscricoes.length > 0 ? (
          <div className="alerta alerta--ok" role="status">
            <strong>
              Você já tem {inscricoes.length === 1 ? 'uma inscrição' : `${inscricoes.length} inscrições`}{' '}
              neste evento.
            </strong>{' '}
            Pode se inscrever em outra <strong>categoria de idade</strong> (por exemplo, Sub-17 e
            Sub-20), desde que a <strong>categoria de peso</strong> seja a mesma. Cada inscrição
            fica com seu próprio protocolo e seu comprovante.
          </div>
        ) : null}
        <FormularioInscricao
          acao={enviarInscricao}
          camposBloqueados={camposBloqueados}
          respostasIniciais={respostasIniciais}
          pesoPermitido={pesoPermitido}
          confirmacao={
            temConfirmacao
              ? {
                  titulo: formulario.confirmacao?.titulo ?? 'Confirme sua inscrição',
                  texto: textoDoModal || null,
                  arquivo: arquivoDoModal,
                }
              : null
          }
          evento={{
            slug,
            nome: evento.nome,
            prazo: estado.detalhe,
          }}
          formulario={{
            id: String(formulario.id),
            titulo: formulario.titulo,
            versaoAviso: formulario.lgpd?.versaoAviso ?? '2026-10',
            campos,
            consentimentos: (formulario.consentimentos ?? []).map((c) => ({
              identificador: String(c.identificador ?? ''),
              texto: c.texto ?? '',
              obrigatorio: Boolean(c.obrigatorio),
            })),
          }}
          atleta={{
            nome: atleta.nome,
            email: atleta.email,
            cpfMascara: atleta.cpfMascara ?? '***.***.***-**',
            nascimento: atleta.dataNascimento,
            idade,
            menor: idade < 18,
          }}
          aviso={formulario.lgpd?.avisoPrivacidade ? (
            <RichText data={formulario.lgpd.avisoPrivacidade} />
          ) : null}
        />
      </div>
    </>
  )
}
