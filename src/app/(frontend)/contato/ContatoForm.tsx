'use client'

import { useActionState } from 'react'
import { enviarContato, type EstadoContato } from './actions'

const ASSUNTOS = [
  { value: 'filiacao', label: 'Filiação' },
  { value: 'competicoes', label: 'Competições e convocações' },
  { value: 'imprensa', label: 'Imprensa' },
  { value: 'parcerias', label: 'Patrocínio e parcerias' },
  { value: 'outros', label: 'Outros assuntos' },
]

export function ContatoForm({
  assuntoInicial,
  mensagemInicial,
}: {
  assuntoInicial?: string
  mensagemInicial?: string
}) {
  const [estado, action, enviando] = useActionState<EstadoContato, FormData>(enviarContato, {
    ok: false,
  })

  if (estado.ok) {
    return (
      <div className="alerta alerta--ok" role="status">
        <strong>Mensagem enviada.</strong> A federação responderá pelo e-mail informado.
      </div>
    )
  }

  const c = estado.campos
  return (
    <form action={action} className="form" noValidate>
      {estado.erro ? (
        <div className="alerta alerta--erro" role="alert">
          {estado.erro}
        </div>
      ) : null}
      <div className="field-row">
        <div className="field">
          <label htmlFor="nome">Nome</label>
          <input
            id="nome"
            name="nome"
            className="input"
            required
            autoComplete="name"
            defaultValue={c?.nome}
          />
        </div>
        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            name="email"
            type="email"
            className="input"
            required
            autoComplete="email"
            defaultValue={c?.email}
          />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="telefone">Telefone (opcional)</label>
          <input
            id="telefone"
            name="telefone"
            type="tel"
            className="input"
            autoComplete="tel"
            defaultValue={c?.telefone}
          />
        </div>
        <div className="field">
          <label htmlFor="assunto">Assunto</label>
          <select
            id="assunto"
            name="assunto"
            className="select"
            style={{ width: '100%' }}
            defaultValue={c?.assunto ?? assuntoInicial ?? 'outros'}
          >
            {ASSUNTOS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="mensagem">Mensagem</label>
        <textarea
          id="mensagem"
          name="mensagem"
          className="textarea"
          required
          defaultValue={c?.mensagem ?? mensagemInicial}
        />
      </div>
      <div className="hp" aria-hidden="true">
        <label htmlFor="site">Não preencha</label>
        <input id="site" name="site" tabIndex={-1} autoComplete="off" />
      </div>
      <input
        type="hidden"
        name="t"
        defaultValue=""
        ref={(el) => {
          // Marca quando o formulário apareceu na tela (anti-spam no servidor).
          if (el && !el.value) el.value = String(Date.now())
        }}
      />
      <p className="muted" style={{ fontSize: 13 }}>
        Seus dados são usados apenas para responder a esta mensagem.
      </p>
      <button
        type="submit"
        className="btn btn--azul"
        disabled={enviando}
        style={{ alignSelf: 'flex-start' }}
      >
        {enviando ? 'Enviando…' : 'Enviar mensagem'}
      </button>
    </form>
  )
}
