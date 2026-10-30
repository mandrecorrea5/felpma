import type { Metadata } from 'next'
import Link from 'next/link'
import { FormularioAcao } from '@/components/area/FormularioAcao'
import { PageHero } from '@/components/ui'
import { redefinirSenhaAction } from '../actions'

export const metadata: Metadata = { title: 'Nova senha', robots: { index: false } }
export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ token?: string }> }

export default async function RedefinirSenhaPage({ searchParams }: Props) {
  const { token } = await searchParams

  return (
    <>
      <PageHero
        titulo="Criar nova senha"
        crumbs={[{ href: '/area', label: 'Área do atleta' }, { label: 'Nova senha' }]}
      />
      <div className="container section" style={{ maxWidth: 560 }}>
        {token ? (
          <FormularioAcao acao={redefinirSenhaAction} rotulo="Salvar nova senha">
            <input type="hidden" name="token" defaultValue={token} />
            <div className="field">
              <label htmlFor="senha">Nova senha</label>
              <input
                id="senha"
                name="senha"
                type="password"
                data-ndovu-mask
                className="input"
                autoComplete="new-password"
                minLength={10}
                required
                aria-describedby="senha-ajuda"
              />
              <small id="senha-ajuda" className="muted">
                Mínimo de 10 caracteres, com letras e números.
              </small>
            </div>
            <div className="field">
              <label htmlFor="confirmacao">Repita a nova senha</label>
              <input
                id="confirmacao"
                name="confirmacao"
                type="password"
                data-ndovu-mask
                className="input"
                autoComplete="new-password"
                required
              />
            </div>
          </FormularioAcao>
        ) : (
          <div className="alerta alerta--erro" role="alert">
            Link inválido ou expirado. Peça um novo em{' '}
            <Link href="/area/recuperar-senha">recuperar senha</Link>.
          </div>
        )}
      </div>
    </>
  )
}
