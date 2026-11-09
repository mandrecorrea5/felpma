import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PageHero } from '@/components/ui'
import { getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = { title: 'Ativar conta', robots: { index: false } }
export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ token?: string }> }

type Estado = 'ativo' | 'bloqueado' | 'erro' | 'invalido'

/**
 * Ativação da conta de atleta pelo link enviado no cadastro.
 *
 * A página confirma o token de verificação do Payload e libera o `status` da
 * conta. A partir daí o login normal funciona, sem aprovação manual no painel.
 * O token é de uso único: depois do clique ele é apagado pelo próprio Payload.
 */
export default async function AtivarPage({ searchParams }: Props) {
  const { token } = await searchParams
  let estado: Estado = 'invalido'

  if (token) {
    try {
      const payload = await getPayloadClient()
      const { docs } = await payload.find({
        collection: 'atletas',
        where: { _verificationToken: { equals: token } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })

      const atleta = docs[0]
      if (atleta) {
        if (atleta.status === 'bloqueado') {
          estado = 'bloqueado'
        } else {
          await payload.verifyEmail({ collection: 'atletas', token })
          if (atleta.status !== 'ativo') {
            await payload.update({
              collection: 'atletas',
              id: atleta.id,
              data: { status: 'ativo' },
              overrideAccess: true,
            })
          }
          estado = 'ativo'
        }
      }
    } catch (e) {
      console.error('Falha ao ativar conta de atleta', e)
      estado = 'erro'
    }
  }

  // Sucesso sai por redirect: o `redirect` lança fora do try/catch acima e a URL
  // final não carrega o token (requisições repetidas, como prefetch do browser,
  // não encontram mais o token e não mostram "link inválido" para quem ativou).
  if (estado === 'ativo') redirect('/area/entrar?ativada=1')

  return (
    <>
      <PageHero
        titulo="Ativar conta"
        intro="Confirmação do e-mail para liberar o acesso à área do atleta."
        crumbs={[{ href: '/area', label: 'Área do atleta' }, { label: 'Ativar conta' }]}
      />
      <div className="container section" style={{ maxWidth: 620 }}>
        {estado === 'bloqueado' ? (
          <div className="alerta alerta--erro" role="alert">
            <strong>Esta conta está bloqueada.</strong> Fale com a federação pelo{' '}
            <Link href="/contato">canal de contato</Link> para regularizar o acesso.
          </div>
        ) : null}

        {estado === 'invalido' ? (
          <>
            <div className="alerta alerta--erro" role="alert">
              <strong>Link inválido ou já utilizado.</strong> Se você já ativou a conta, é só
              entrar normalmente. Se ainda não recebeu o e-mail, confira a caixa de spam ou fale
              com a federação pelo <Link href="/contato">canal de contato</Link>.
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/area/entrar" className="btn btn--azul">
                Ir para o login
              </Link>
              <Link href="/area/criar-conta" className="btn btn--contorno">
                Criar outra conta
              </Link>
            </div>
          </>
        ) : null}

        {estado === 'erro' ? (
          <div className="alerta alerta--erro" role="alert">
            <strong>Não foi possível ativar agora.</strong> Tente abrir o link de novo em alguns
            instantes. Se o problema continuar, fale com a federação pelo{' '}
            <Link href="/contato">canal de contato</Link>.
          </div>
        ) : null}
      </div>
    </>
  )
}
