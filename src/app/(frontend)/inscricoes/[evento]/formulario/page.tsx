import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FormularioInscricao } from '@/components/inscricoes/FormularioInscricao'
import { RichText } from '@/components/RichText'
import { PageHero } from '@/components/ui'
import { exigirAtleta } from '@/lib/atleta/guarda'
import { periodo } from '@/lib/format'
import {
  eventoPorSlug,
  formularioPublicado,
  inscricaoDoAtleta,
  inscritosNoEvento,
} from '@/lib/inscricoes/consultas'
import { estadoInscricao, type EventoParaInscricao } from '@/lib/inscricoes/estado'
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

  const inscritos = await inscritosNoEvento(evento.id)
  const inscricao = await inscricaoDoAtleta(evento.id, atleta.id)
  const estado = estadoInscricao(evento as EventoParaInscricao, {
    temFormulario: true,
    inscritos,
    jaInscrito: Boolean(inscricao),
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
            {inscricao ? (
              <Link href={`/area/inscricoes/${inscricao.protocolo}`} className="btn btn--azul">
                Ver minha inscrição
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

  const idade = idadeEm(atleta.dataNascimento)

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

      <div className="container section" style={{ maxWidth: 820 }}>
        <FormularioInscricao
          acao={enviarInscricao}
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
            campos: (formulario.campos ?? []) as CampoFormulario[],
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
