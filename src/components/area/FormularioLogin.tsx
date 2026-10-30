'use client'

import Link from 'next/link'
import { type FormEvent, useEffect, useState, useTransition } from 'react'
import type { EstadoFormulario } from '@/lib/atleta/tipos'

/** Login controlado: em erro, o e-mail digitado continua na tela. */
export function FormularioLogin({
  acao,
  recuperacaoDisponivel,
  retorno,
}: {
  acao: (prev: EstadoFormulario, form: FormData) => Promise<EstadoFormulario>
  recuperacaoDisponivel: boolean
  retorno: string
}) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [estado, setEstado] = useState<EstadoFormulario>({ ok: false })
  const [pendente, iniciarTransicao] = useTransition()

  // Sem `action={...}` para o React não resetar o formulário no erro.
  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    const dados = new FormData(evento.currentTarget)
    iniciarTransicao(async () => {
      setEstado(await acao(estado, dados))
    })
  }

  const erroDe = (campo: string) => estado.erros?.find((e) => e.campo === campo)?.mensagem

  useEffect(() => {
    const primeiro = estado.erros?.[0]?.campo
    if (!primeiro) return
    document.getElementById(primeiro)?.focus({ preventScroll: true })
  }, [estado])

  return (
    <form onSubmit={enviar} className="form" noValidate data-ndovu-manual aria-busy={pendente}>
      {estado.erro ? (
        <div className="alerta alerta--erro" role="alert">
          {estado.erro}
        </div>
      ) : null}

      <input type="hidden" name="retorno" value={retorno} />

      <div className="field">
        <label htmlFor="email">E-mail</label>
        <input
          id="email"
          name="email"
          type="email"
          className="input"
          data-ndovu-mask
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(erroDe('email'))}
          aria-describedby={erroDe('email') ? 'email-erro' : undefined}
        />
        {erroDe('email') ? (
          <small id="email-erro" className="campo-erro" role="alert">
            {erroDe('email')}
          </small>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="senha">Senha</label>
        <input
          id="senha"
          name="senha"
          type="password"
          className="input"
          data-ndovu-mask
          autoComplete="current-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          aria-invalid={Boolean(erroDe('senha'))}
          aria-describedby={erroDe('senha') ? 'senha-erro' : undefined}
        />
        {erroDe('senha') ? (
          <small id="senha-erro" className="campo-erro" role="alert">
            {erroDe('senha')}
          </small>
        ) : null}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        {recuperacaoDisponivel ? (
          <Link href="/area/recuperar-senha" style={{ fontSize: 14 }}>
            Esqueci minha senha
          </Link>
        ) : (
          <span className="muted" style={{ fontSize: 14 }}>
            Recuperação de senha indisponível no momento
          </span>
        )}
        <Link href="/area/criar-conta" style={{ fontSize: 14 }}>
          Criar conta
        </Link>
      </div>

      <button type="submit" className="btn btn--azul" disabled={pendente}>
        {pendente ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  )
}
