import type { Metadata } from 'next'
import Link from 'next/link'
import { FormularioCadastro } from '@/components/area/FormularioCadastro'
import { PageHero } from '@/components/ui'
import { criarConta } from '../actions'

export const metadata: Metadata = { title: 'Criar conta', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function CriarContaPage() {
  return (
    <>
      <PageHero
        titulo="Criar conta de atleta"
        intro="É por esta conta que você se inscreve nos eventos da federação."
        crumbs={[{ href: '/area', label: 'Área do atleta' }, { label: 'Criar conta' }]}
      />
      <div className="container section" style={{ maxWidth: 640 }}>
        <FormularioCadastro acao={criarConta} />
        <p className="muted" style={{ marginTop: 16, fontSize: 14 }}>
          Já tem conta? <Link href="/area/entrar">Entrar</Link>.
        </p>
      </div>
    </>
  )
}
