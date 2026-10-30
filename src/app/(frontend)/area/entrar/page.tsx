import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { smtpConfigurado } from '@/lib/email'
import { FormularioLogin } from '@/components/area/FormularioLogin'
import { PageHero } from '@/components/ui'
import { atletaAtual } from '@/lib/atleta/sessao'
import { entrarAction } from '../actions'

export const metadata: Metadata = { title: 'Entrar', robots: { index: false } }
export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<{
    criada?: string
    pendente?: string
    redefinida?: string
    retorno?: string
  }>
}

export default async function EntrarPage({ searchParams }: Props) {
  const sp = await searchParams
  if (await atletaAtual()) redirect('/area')

  return (
    <>
      <PageHero
        titulo="Entrar na área do atleta"
        intro="Use o e-mail e a senha cadastrados para se inscrever nos eventos."
        crumbs={[{ href: '/area', label: 'Área do atleta' }, { label: 'Entrar' }]}
      />
      <div className="container section" style={{ maxWidth: 560 }}>
        {sp.pendente ? (
          <div className="alerta alerta--ok" role="status" style={{ marginBottom: 16 }}>
            <strong>Cadastro enviado.</strong> Um administrador da federação precisa aprovar antes
            do primeiro acesso. Assim que for aprovado, entre com o mesmo e-mail e senha.
          </div>
        ) : null}
        {sp.criada ? (
          <div className="alerta alerta--ok" role="status" style={{ marginBottom: 16 }}>
            Conta criada. Confirme o e-mail que enviamos para ativá-la antes de entrar.
          </div>
        ) : null}
        {sp.redefinida ? (
          <div className="alerta alerta--ok" role="status" style={{ marginBottom: 16 }}>
            Senha alterada. Entre com a nova senha.
          </div>
        ) : null}

        <FormularioLogin
          acao={entrarAction}
          recuperacaoDisponivel={smtpConfigurado()}
          retorno={sp.retorno ?? '/area'}
        />
      </div>
    </>
  )
}
