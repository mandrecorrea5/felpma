import Link from 'next/link'
import { Icon } from '@/components/Icon'
import { periodo } from '@/lib/format'
import type { FormularioDoPainel } from '@/lib/inscricoes/consultas'

/**
 * Um formulário na lista da área do atleta.
 *
 * O botão principal leva direto ao formulário (não ao evento, não ao calendário):
 * é o menor caminho possível entre "entrei na conta" e "estou preenchendo".
 */
export function FormularioCard({
  item,
  destaque = false,
}: {
  item: FormularioDoPainel
  destaque?: boolean
}) {
  const { evento, estado } = item
  const local = [evento.local, evento.cidade].filter(Boolean).join(' · ')
  const detalhes = evento.slug ? `/calendario/${evento.slug}` : '/calendario'
  const formulario = evento.slug ? `/inscricoes/${evento.slug}/formulario` : null

  return (
    <article
      className={
        destaque ? 'card card--pad form-card form-card--destaque' : 'card card--pad form-card'
      }
      aria-labelledby={`formulario-${item.formularioId}`}
    >
      <div className="form-card__topo">
        {destaque ? <span className="kicker">Continue de onde parou</span> : null}
        <span className={`status ${estado.podeInscrever ? 'status--green' : 'status--gray'}`}>
          {estado.rotulo}
        </span>
      </div>

      <div>
        <h3 id={`formulario-${item.formularioId}`} className="form-card__titulo">
          {evento.nome}
        </h3>
        <p className="form-card__meta">
          {periodo(evento.dataInicio, evento.dataFim)}
          {local ? ` · ${local}` : ''}
        </p>
        {evento.categorias ? <span className="tag">{evento.categorias}</span> : null}
      </div>

      <p className="form-card__prazo">{estado.detalhe}</p>

      <div className="form-card__acoes">
        {formulario && estado.podeInscrever ? (
          <Link href={formulario} className="btn btn--azul">
            Preencher agora
            <Icon name="seta" size={18} strokeWidth={2.2} />
          </Link>
        ) : (
          <Link href={detalhes} className="btn btn--contorno">
            Ver evento
          </Link>
        )}
        {estado.podeInscrever ? (
          <Link href={detalhes} className="btn btn--contorno">
            Detalhes
          </Link>
        ) : null}
      </div>
    </article>
  )
}
