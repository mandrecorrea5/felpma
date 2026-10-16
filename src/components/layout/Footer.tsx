import Link from 'next/link'
import type { ConfiguracoesSite } from '@/payload-types'
import { mediaUrl, whatsappLink } from '@/lib/format'
import { Icon } from '../Icon'

export function Apoio({ config }: { config: ConfiguracoesSite }) {
  const apoiadores = config.apoiadores ?? []
  if (apoiadores.length === 0) return null
  return (
    <section aria-label="Apoiadores" className="container apoio">
      <span className="apoio__titulo">Apoio e parceiros</span>
      <div className="apoio__logos">
        {apoiadores.map((a) => {
          const logo = mediaUrl(a.logo)
          const inner = logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={a.nome} loading="lazy" />
          ) : (
            a.nome
          )
          return a.url ? (
            <a key={a.id} href={a.url} className="apoio__logo" target="_blank" rel="noopener">
              {inner}
            </a>
          ) : (
            <div key={a.id} className="apoio__logo">
              {inner}
            </div>
          )
        })}
      </div>
    </section>
  )
}

export function Footer({ config }: { config: ConfiguracoesSite }) {
  const logo = mediaUrl(config.logo)
  const wpp = whatsappLink(config.whatsapp)
  const ano = new Date().getFullYear()
  return (
    <footer className="footer">
      <div className="container footer__top">
        <div className="footer__brand">
          <div className="footer__brand-head">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {logo ? <img src={logo} alt="" /> : null}
            <span>{config.sigla}</span>
          </div>
          <address className="footer__contato">
            {config.endereco ? (
              <>
                {config.endereco}
                <br />
              </>
            ) : null}
            {[config.cidade, 'MA'].filter(Boolean).join(' — ')}
            {config.cep ? ` · CEP ${config.cep}` : ''}
            <br />
            {config.email ? <a href={`mailto:${config.email}`}>{config.email}</a> : null}
            {config.email && config.telefone ? ' · ' : ''}
            {config.telefone ? (
              <a href={`tel:${config.telefone.replace(/\D/g, '')}`}>{config.telefone}</a>
            ) : null}
          </address>
          <div className="social">
            {config.instagram ? (
              <a href={config.instagram} aria-label="Instagram" target="_blank" rel="noopener">
                <Icon name="instagram" />
              </a>
            ) : null}
            {config.youtube ? (
              <a href={config.youtube} aria-label="YouTube" target="_blank" rel="noopener">
                <Icon name="youtube" />
              </a>
            ) : null}
            {config.facebook ? (
              <a href={config.facebook} aria-label="Facebook" target="_blank" rel="noopener">
                <Icon name="facebook" />
              </a>
            ) : null}
            {wpp ? (
              <a href={wpp} aria-label="WhatsApp" target="_blank" rel="noopener">
                <Icon name="whatsapp" />
              </a>
            ) : null}
          </div>
        </div>
        <div className="footer__cols">
          <nav className="footer__col" aria-labelledby="f-comp">
            <h2 id="f-comp">Competições</h2>
            <Link href="/calendario">Calendário</Link>
            <Link href="/eventos">Eventos e cursos</Link>
            <Link href="/resultados">Resultados</Link>
            <Link href="/recordes">Recordes estaduais</Link>
          </nav>
          <nav className="footer__col" aria-labelledby="f-fil">
            <h2 id="f-fil">Filiados</h2>
            <Link href="/filiacao">Filiação</Link>
            <Link href="/convocacoes">Convocações</Link>
            <Link href="/centros">Centros de Treinamento</Link>
            {config.linkAreaFiliado ? <a href={config.linkAreaFiliado}>Área do filiado</a> : null}
          </nav>
          <nav className="footer__col" aria-labelledby="f-fed">
            <h2 id="f-fed">A Federação</h2>
            <Link href="/federacao">Quem somos</Link>
            <Link href="/federacao#diretoria">Diretoria</Link>
            <Link href="/documentos">Estatuto e documentos</Link>
            <Link href="/transparencia">Transparência</Link>
            <Link href="/contato">Contato</Link>
          </nav>
        </div>
      </div>
      <div className="container footer__bottom">
        <span>
          © {ano} {config.sigla} — {config.nomeCompleto}
          {config.cnpj ? ` · CNPJ ${config.cnpj}` : ''}
        </span>
        <Link href="/institucional/politica-de-privacidade">Política de privacidade</Link>
      </div>
    </footer>
  )
}
