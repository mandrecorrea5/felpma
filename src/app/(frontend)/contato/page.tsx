import type { Metadata } from 'next'
import { Icon } from '@/components/Icon'
import { PageHero } from '@/components/ui'
import { whatsappLink } from '@/lib/format'
import { getConfiguracoes } from '@/lib/payload'
import { ContatoForm } from './ContatoForm'

export const metadata: Metadata = {
  title: 'Contato',
  description: 'Fale com a Federação de Levantamento de Pesos do Maranhão.',
}

type Props = { searchParams: Promise<{ assunto?: string; perfil?: string }> }

export default async function ContatoPage({ searchParams }: Props) {
  const { assunto, perfil } = await searchParams
  const config = await getConfiguracoes()
  const wpp = whatsappLink(config.whatsapp)

  return (
    <>
      <PageHero
        titulo="Contato"
        intro="Dúvidas sobre filiação, competições, imprensa ou parcerias? Fale com a federação."
        crumbs={[{ label: 'Contato' }]}
      />
      <div className="container layout-2col">
        <div className="layout-2col__main">
          <div className="card" style={{ padding: 28 }}>
            <ContatoForm
              assuntoInicial={assunto}
              mensagemInicial={
                perfil ? `Gostaria de iniciar a filiação como ${perfil}.` : undefined
              }
            />
          </div>
        </div>
        <aside className="layout-2col__aside">
          <div className="card card--pad">
            <ul className="info-list">
              {config.email ? (
                <li>
                  <Icon name="email" />
                  <div>
                    <small>E-mail</small>
                    <a href={`mailto:${config.email}`}>{config.email}</a>
                  </div>
                </li>
              ) : null}
              {config.telefone ? (
                <li>
                  <Icon name="telefone" />
                  <div>
                    <small>Telefone</small>
                    <a href={`tel:${config.telefone.replace(/\D/g, '')}`}>{config.telefone}</a>
                  </div>
                </li>
              ) : null}
              {config.endereco ? (
                <li>
                  <Icon name="local" />
                  <div>
                    <small>Sede</small>
                    {config.endereco}
                    <br />
                    {config.cidade}/MA{config.cep ? ` · CEP ${config.cep}` : ''}
                  </div>
                </li>
              ) : null}
              {config.horarioAtendimento ? (
                <li>
                  <Icon name="relogio" />
                  <div>
                    <small>Atendimento</small>
                    {config.horarioAtendimento}
                  </div>
                </li>
              ) : null}
            </ul>
            {wpp ? (
              <a href={wpp} className="btn btn--azul btn--bloco" target="_blank" rel="noopener">
                <Icon name="whatsapp" size={18} />
                WhatsApp da federação
              </a>
            ) : null}
          </div>
        </aside>
      </div>
    </>
  )
}
