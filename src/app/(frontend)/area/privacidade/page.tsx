import type { Metadata } from 'next'
import Link from 'next/link'
import { FormularioAcao } from '@/components/area/FormularioAcao'
import { PageHero } from '@/components/ui'
import { exigirAtleta } from '@/lib/atleta/guarda'
import { excluirContaAction } from '../actions'

export const metadata: Metadata = { title: 'Privacidade', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function PrivacidadePage() {
  await exigirAtleta('/area/privacidade')

  return (
    <>
      <PageHero
        titulo="Privacidade e seus dados"
        intro="Você pode levar seus dados com você ou pedir a exclusão da conta a qualquer momento."
        crumbs={[{ href: '/area', label: 'Área do atleta' }, { label: 'Privacidade' }]}
      />
      <div className="container section" style={{ display: 'grid', gap: 28, maxWidth: 720 }}>
        <section aria-labelledby="exportar">
          <h2 id="exportar" style={{ fontSize: 20 }}>
            Baixar meus dados
          </h2>
          <p className="muted" style={{ marginTop: 8 }}>
            Gera um arquivo JSON com sua conta, inscrições e consentimentos registrados.
          </p>
          <a
            href="/area/privacidade/exportar"
            className="btn btn--azul"
            style={{ marginTop: 12 }}
            download
          >
            Baixar arquivo
          </a>
        </section>

        <section aria-labelledby="consentimentos">
          <h2 id="consentimentos" style={{ fontSize: 20 }}>
            Consentimentos
          </h2>
          <p className="muted" style={{ marginTop: 8 }}>
            Veja e revogue o que não é obrigatório em{' '}
            <Link href="/area/consentimentos">consentimentos</Link>.
          </p>
        </section>

        <section aria-labelledby="excluir">
          <h2 id="excluir" style={{ fontSize: 20 }}>
            Excluir minha conta
          </h2>
          <div className="alerta alerta--erro" style={{ marginTop: 12 }}>
            A exclusão apaga sua conta e suas inscrições. Não é possível desfazer. Se houver
            obrigação legal de guarda (por exemplo, prestação de contas de um evento já realizado),
            a federação poderá manter apenas o registro mínimo exigido por lei, sem seus dados de
            contato.
          </div>
          <div style={{ marginTop: 16 }}>
            <FormularioAcao acao={excluirContaAction} rotulo="Excluir definitivamente">
              <div className="field">
                <label htmlFor="confirmacao">
                  Digite <strong>EXCLUIR</strong> para confirmar
                </label>
                <input
                  id="confirmacao"
                  name="confirmacao"
                  className="input"
                  autoComplete="off"
                  data-ndovu-mask
                  required
                />
              </div>
            </FormularioAcao>
          </div>
        </section>

        <p className="muted" style={{ fontSize: 14 }}>
          Dúvidas sobre tratamento de dados? Consulte a{' '}
          <Link href="/institucional/politica-de-privacidade">política de privacidade</Link> ou{' '}
          <Link href="/contato">fale com a federação</Link>.
        </p>
      </div>
    </>
  )
}
