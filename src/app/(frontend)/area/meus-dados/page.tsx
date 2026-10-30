import type { Metadata } from 'next'
import Link from 'next/link'
import { FormularioAcao } from '@/components/area/FormularioAcao'
import { PageHero } from '@/components/ui'
import { exigirAtleta } from '@/lib/atleta/guarda'
import { dataCurta } from '@/lib/format'
import { atualizarDadosAction } from '../actions'

export const metadata: Metadata = { title: 'Meus dados', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function MeusDadosPage() {
  const atleta = await exigirAtleta('/area/meus-dados')

  return (
    <>
      <PageHero
        titulo="Meus dados"
        intro="Você pode corrigir contato e endereço. CPF e data de nascimento exigem atendimento da federação."
        crumbs={[{ href: '/area', label: 'Área do atleta' }, { label: 'Meus dados' }]}
      />
      <div className="container section" style={{ maxWidth: 640 }}>
        <div className="card card--pad" style={{ marginBottom: 24 }}>
          <ul className="info-list">
            <li>
              <div>
                <small>E-mail da conta</small>
                {atleta.email}
              </div>
            </li>
            <li>
              <div>
                <small>CPF</small>
                {atleta.cpfMascara ?? '***.***.***-**'}
              </div>
            </li>
            <li>
              <div>
                <small>Data de nascimento</small>
                {dataCurta(atleta.dataNascimento)}
              </div>
            </li>
          </ul>
        </div>

        <FormularioAcao acao={atualizarDadosAction} rotulo="Salvar dados">
          <div className="field">
            <label htmlFor="nome">Nome completo</label>
            <input
              id="nome"
              name="nome"
              data-ndovu-mask
              className="input"
              defaultValue={atleta.nome}
              autoComplete="name"
              required
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="telefone">Telefone (WhatsApp)</label>
              <input
                id="telefone"
                name="telefone"
                type="tel"
                data-ndovu-mask
                className="input"
                defaultValue={atleta.telefone ?? ''}
                autoComplete="tel"
              />
            </div>
            <div className="field">
              <label htmlFor="uf">UF</label>
              <input
                id="uf"
                name="uf"
                className="input"
                defaultValue={atleta.uf ?? 'MA'}
                maxLength={2}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="cidade">Cidade</label>
            <input
              id="cidade"
              name="cidade"
              className="input"
              defaultValue={atleta.cidade ?? ''}
              autoComplete="address-level2"
            />
          </div>
        </FormularioAcao>

        <p style={{ marginTop: 20, fontSize: 14 }}>
          Quer trocar a senha? <Link href="/area/recuperar-senha">Enviar link por e-mail</Link>.
        </p>
        <p style={{ marginTop: 8, fontSize: 14 }}>
          Precisa corrigir CPF ou data de nascimento?{' '}
          <Link href="/contato">Fale com a federação</Link>.
        </p>
      </div>
    </>
  )
}
