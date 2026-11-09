import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { emailConfigurado, emailDisponivel } from '@/lib/email'
import { FormularioLogin } from '@/components/area/FormularioLogin'
import { PageHero } from '@/components/ui'
import { atletaAtual } from '@/lib/atleta/sessao'
import { caminhoInterno, destinoPosLogin } from '@/lib/atleta/caminho'
import { entrarAction } from '../actions'

export const metadata: Metadata = { title: 'Entrar', robots: { index: false } }
export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<{
    ativada?: string
    criada?: string
    envio?: string
    pendente?: string
    redefinida?: string
    retorno?: string
  }>
}

export default async function EntrarPage({ searchParams }: Props) {
  const sp = await searchParams
  const retorno = caminhoInterno(sp.retorno)

  // Já logado: não faz sentido mostrar o formulário de novo — segue para o
  // destino que ele tentou abrir (e cai na área do atleta após a validação).
  if (await atletaAtual()) redirect(destinoPosLogin(retorno))

  return (
    <>
      <PageHero
        titulo="Entrar na área do atleta"
        intro="Use o e-mail e a senha cadastrados para se inscrever nos eventos."
        crumbs={[{ href: '/area', label: 'Área do atleta' }, { label: 'Entrar' }]}
      />
      <div className="container section" style={{ maxWidth: 560 }}>
        {sp.ativada ? (
          <div className="alerta alerta--ok" role="status" style={{ marginBottom: 16 }}>
            <strong>Conta ativada!</strong> Seu e-mail foi confirmado. Entre com o e-mail e a
            senha que você cadastrou.
          </div>
        ) : null}
        {sp.pendente ? (
          <div className="alerta alerta--ok" role="status" style={{ marginBottom: 16 }}>
            <strong>Ative sua conta.</strong> Abra o e-mail que enviamos e clique no link de
            ativação. Depois disso, entre com o mesmo e-mail e senha.
          </div>
        ) : null}
        {sp.criada ? (
          sp.envio === 'falhou' ? (
            <div className="alerta alerta--erro" role="alert" style={{ marginBottom: 16 }}>
              <strong>Conta criada, mas não conseguimos enviar o e-mail de ativação.</strong>{' '}
              Tente novamente mais tarde ou fale com a federação pelo{' '}
              <Link href="/contato">canal de contato</Link>.
            </div>
          ) : (
            <div className="alerta alerta--ok" role="status" style={{ marginBottom: 16 }}>
              <strong>Cadastro enviado.</strong> Enviamos um e-mail com o link para ativar sua
              conta. Confira a caixa de entrada e o spam antes de entrar.
              {process.env.NODE_ENV !== 'production' && !emailConfigurado() ? (
                <span className="muted" style={{ display: 'block', marginTop: 6, fontSize: 13 }}>
                  Em desenvolvimento, o link também aparece no terminal do servidor.
                </span>
              ) : null}
            </div>
          )
        ) : null}
        {sp.redefinida ? (
          <div className="alerta alerta--ok" role="status" style={{ marginBottom: 16 }}>
            Senha alterada. Entre com a nova senha.
          </div>
        ) : null}

        <FormularioLogin
          acao={entrarAction}
          recuperacaoDisponivel={emailDisponivel()}
          retorno={retorno}
        />
      </div>
    </>
  )
}
