'use client'

import { useActionState, useEffect, useRef } from 'react'
import { rastreia } from '@/lib/ndovu/client'
import { enviarContato, type EstadoContato } from './actions'

const ASSUNTOS = [
  { value: 'filiacao', label: 'Filiação' },
  { value: 'competicoes', label: 'Competições e convocações' },
  { value: 'imprensa', label: 'Imprensa' },
  { value: 'parcerias', label: 'Patrocínio e parcerias' },
  { value: 'outros', label: 'Outros assuntos' },
]

const ESTADO_INICIAL: EstadoContato = { ok: false }

export function ContatoForm({
  assuntoInicial,
  mensagemInicial,
}: {
  assuntoInicial?: string
  mensagemInicial?: string
}) {
  const [estado, action, enviando] = useActionState<EstadoContato, FormData>(
    enviarContato,
    ESTADO_INICIAL,
  )
  const inicioDoEnvio = useRef<number | null>(null)
  const assunto = useRef<string>('outros')

  // Estado inicial é `{ ok: false }` sem `erro` — a mesma forma de um fracasso.
  // Por isso só se reporta quando há `erro`, `ok` explícito ou `motivo`.
  useEffect(() => {
    const duracaoMs =
      inicioDoEnvio.current === null
        ? undefined
        : Math.round(performance.now() - inicioDoEnvio.current)
    inicioDoEnvio.current = null

    const metadados = { assunto: assunto.current }

    if (estado.erro) {
      // Rejeição de validação: é erro do fluxo (o usuário não conseguiu), mas com
      // código próprio para não se misturar com falha técnica.
      rastreia.erro('contato_rejeitado', {
        code: 'VALIDACAO',
        mensagem: estado.erro,
        feature: 'contato',
        duracaoMs,
        metadados,
      })
      return
    }

    if (!estado.ok) return

    if (estado.motivo === 'spam') {
      // O usuário vê "enviado", mas nada foi gravado. Sem este evento o funil
      // contaria como sucesso um robô que foi barrado.
      rastreia.custom('contato_barrado_como_spam', metadados)
      return
    }

    rastreia.acao('contato_enviado', { feature: 'contato', metadados: { ...metadados, duracaoMs } })
  }, [estado])

  if (estado.ok) {
    return (
      <div className="alerta alerta--ok" role="status">
        <strong>Mensagem enviada.</strong> A federação responderá pelo e-mail informado.
      </div>
    )
  }

  const c = estado.campos
  return (
    <form
      action={action}
      className="form"
      noValidate
      data-ndovu-manual
      onSubmit={(e) => {
        const fd = new FormData(e.currentTarget)
        assunto.current = String(fd.get('assunto') ?? 'outros')
        inicioDoEnvio.current = performance.now()
        // Reporta-se a tentativa sem nenhum campo: nome/e-mail/telefone/mensagem
        // são PII e não saem do navegador.
        rastreia.acao('contato_tentando_enviar', {
          feature: 'contato',
          metadados: { assunto: assunto.current },
        })
      }}
    >
      {estado.erro ? (
        <div className="alerta alerta--erro" role="alert">
          {estado.erro}
        </div>
      ) : null}
      <div className="field-row">
        <div className="field">
          <label htmlFor="nome">Nome</label>
          {/* `data-ndovu-mask` não é decoração: sem `type`, o input cairia no
              else do captureDOM() do SDK e o valor digitado viraria atributo
              no HTML do snapshot, enviado a cada error(). */}
          <input
            id="nome"
            name="nome"
            data-ndovu-mask
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
            data-ndovu-mask
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
            data-ndovu-mask
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
          data-ndovu-mask
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
