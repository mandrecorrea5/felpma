'use client'

import { useRouter } from 'next/navigation'
import { type FormEvent, type ReactNode, useState, useTransition } from 'react'
import type { EstadoFormulario } from '@/lib/atleta/tipos'

/**
 * Casca dos formulários da área do atleta: mostra erro/sucesso do servidor e
 * desabilita o botão durante o envio. O `data-ndovu-manual` impede o SDK de
 * observabilidade de capturar o corpo do formulário (PII).
 */
export function FormularioAcao({
  acao,
  children,
  rodape,
  rotulo,
}: {
  acao: (prev: EstadoFormulario, form: FormData) => Promise<EstadoFormulario>
  children: ReactNode
  rodape?: ReactNode
  rotulo: string
}) {
  const [estado, setEstado] = useState<EstadoFormulario>({ ok: false })
  const [pendente, iniciarTransicao] = useTransition()
  const router = useRouter()

  // Envio manual: `action={...}` faria o React resetar os campos no erro.
  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    const dados = new FormData(evento.currentTarget)
    iniciarTransicao(async () => {
      const resultado = await acao(estado, dados)
      setEstado(resultado)
      // O resumo acima do formulário é renderizado no servidor: sem o refresh
      // ele continuaria mostrando o dado antigo depois de salvar.
      if (resultado.ok) router.refresh()
    })
  }

  return (
    <form onSubmit={enviar} className="form" noValidate data-ndovu-manual aria-busy={pendente}>
      {estado.erro ? (
        <div className="alerta alerta--erro" role="alert">
          {estado.erro}
        </div>
      ) : null}
      {estado.sucesso ? (
        <div className="alerta alerta--ok" role="status">
          {estado.sucesso}
        </div>
      ) : null}
      {children}
      {rodape}
      <button type="submit" className="btn btn--azul" disabled={pendente}>
        {pendente ? 'Enviando…' : rotulo}
      </button>
    </form>
  )
}
