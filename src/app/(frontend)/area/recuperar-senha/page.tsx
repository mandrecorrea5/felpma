import type { Metadata } from 'next'
import Link from 'next/link'
import { FormularioAcao } from '@/components/area/FormularioAcao'
import { PageHero } from '@/components/ui'
import { emailDisponivel } from '@/lib/email'
import { recuperarSenhaAction } from '../actions'

export const metadata: Metadata = { title: 'Recuperar senha', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default function RecuperarSenhaPage() {
  const disponivel = emailDisponivel()

  return (
    <>
      <PageHero
        titulo="Recuperar senha"
        intro="Informe o e-mail da conta e enviamos um link para criar uma nova senha."
        crumbs={[{ href: '/area', label: 'Área do atleta' }, { label: 'Recuperar senha' }]}
      />
      <div className="container section" style={{ maxWidth: 560 }}>
        {!disponivel ? (
          <div className="alerta alerta--erro" role="note" style={{ marginBottom: 16 }}>
            A recuperação de senha por e-mail ainda não está disponível. Fale com a federação
            pelo <Link href="/contato">canal de contato</Link> para redefinir o acesso.
          </div>
        ) : null}
        {disponivel ? (
        <FormularioAcao acao={recuperarSenhaAction} rotulo="Enviar link">
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              name="email"
              type="email"
              data-ndovu-mask
              className="input"
              autoComplete="email"
              required
            />
          </div>
        </FormularioAcao>
        ) : null}
        <p className="muted" style={{ marginTop: 16, fontSize: 14 }}>
          Lembrou a senha? <Link href="/area/entrar">Entrar</Link>.
        </p>
      </div>
    </>
  )
}
