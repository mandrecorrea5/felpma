'use client'

import Link from 'next/link'
import { type FormEvent, useEffect, useState, useTransition } from 'react'
import type { EstadoFormulario } from '@/lib/atleta/tipos'

/**
 * Cadastro controlado.
 *
 * Inputs controlados por estado são obrigatórios aqui: o React 19 reseta campos
 * não controlados depois que a server action responde — era o que apagava tudo
 * quando a validação falhava. Com estado, o que a pessoa digitou permanece e o
 * erro aparece embaixo do campo certo.
 */

type Valores = {
  aceite: boolean
  cidade: string
  cpf: string
  email: string
  nascimento: string
  nome: string
  senha: string
  telefone: string
  uf: string
}

const INICIAL: Valores = {
  aceite: false,
  cidade: '',
  cpf: '',
  email: '',
  nascimento: '',
  nome: '',
  senha: '',
  telefone: '',
  uf: 'MA',
}

const formatarCpf = (valor: string): string => {
  const d = valor.replace(/\D/g, '').slice(0, 11)
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
}

const formatarTelefone = (valor: string): string => {
  const d = valor.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
  return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
}

export function FormularioCadastro({
  acao,
}: {
  acao: (prev: EstadoFormulario, form: FormData) => Promise<EstadoFormulario>
}) {
  const [valores, setValores] = useState<Valores>(INICIAL)
  const [estado, setEstado] = useState<EstadoFormulario>({ ok: false })
  const [pendente, iniciarTransicao] = useTransition()

  /**
   * Envio manual em transição, em vez de `action={...}`: o React 19 reseta o
   * formulário depois da action, e isso desmarcava o checkbox e podia limpar
   * campos controlados. Aqui nada é resetado — o estado é a fonte da verdade.
   */
  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    const dados = new FormData(evento.currentTarget)
    iniciarTransicao(async () => {
      setEstado(await acao(estado, dados))
    })
  }

  const erroDe = (campo: string) => estado.erros?.find((e) => e.campo === campo)?.mensagem
  const definir = <K extends keyof Valores>(campo: K, valor: Valores[K]) =>
    setValores((atual) => ({ ...atual, [campo]: valor }))

  // Leva o foco ao primeiro campo com problema, sem perder o que foi digitado.
  useEffect(() => {
    const primeiro = estado.erros?.[0]?.campo
    if (!primeiro) return
    const el = document.getElementById(primeiro)
    el?.focus({ preventScroll: true })
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [estado])

  const campoErro = (id: string, ajudaId?: string) => {
    const erro = erroDe(id)
    return {
      'aria-describedby': erro ? `${id}-erro` : ajudaId,
      'aria-invalid': Boolean(erro),
      erro,
    }
  }

  return (
    <form onSubmit={enviar} className="form" noValidate data-ndovu-manual aria-busy={pendente}>
      {estado.erros?.length ? (
        <div className="alerta alerta--erro erro-resumo" role="alert" aria-live="assertive">
          <strong>
            Confira {estado.erros.length} {estado.erros.length === 1 ? 'campo' : 'campos'}:
          </strong>
          <ul>
            {estado.erros.map((e) => (
              <li key={e.campo}>
                <a href={`#${e.campo}`}>{e.mensagem}</a>
              </li>
            ))}
          </ul>
        </div>
      ) : estado.erro ? (
        <div className="alerta alerta--erro" role="alert">
          {estado.erro}
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="nome">Nome completo *</label>
        <input
          id="nome"
          name="nome"
          className="input"
          data-ndovu-mask
          autoComplete="name"
          value={valores.nome}
          onChange={(e) => definir('nome', e.target.value)}
          {...campoErro('nome')}
        />
        {erroDe('nome') ? (
          <small id="nome-erro" className="campo-erro" role="alert">
            {erroDe('nome')}
          </small>
        ) : null}
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="email">E-mail *</label>
          <input
            id="email"
            name="email"
            type="email"
            className="input"
            data-ndovu-mask
            autoComplete="email"
            value={valores.email}
            onChange={(e) => definir('email', e.target.value)}
            {...campoErro('email')}
          />
          {erroDe('email') ? (
            <small id="email-erro" className="campo-erro" role="alert">
              {erroDe('email')}
            </small>
          ) : null}
        </div>
        <div className="field">
          <label htmlFor="telefone">Telefone (WhatsApp)</label>
          <input
            id="telefone"
            name="telefone"
            type="tel"
            className="input"
            data-ndovu-mask
            autoComplete="tel"
            placeholder="(98) 90000-0000"
            value={valores.telefone}
            onChange={(e) => definir('telefone', formatarTelefone(e.target.value))}
          />
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="cpf">CPF *</label>
          <input
            id="cpf"
            name="cpf"
            className="input"
            data-ndovu-mask
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={valores.cpf}
            onChange={(e) => definir('cpf', formatarCpf(e.target.value))}
            {...campoErro('cpf')}
          />
          {erroDe('cpf') ? (
            <small id="cpf-erro" className="campo-erro" role="alert">
              {erroDe('cpf')}
            </small>
          ) : null}
        </div>
        <div className="field">
          <label htmlFor="nascimento">Data de nascimento *</label>
          <input
            id="nascimento"
            name="nascimento"
            type="date"
            className="input"
            data-ndovu-mask
            value={valores.nascimento}
            onChange={(e) => definir('nascimento', e.target.value)}
            {...campoErro('nascimento')}
          />
          {erroDe('nascimento') ? (
            <small id="nascimento-erro" className="campo-erro" role="alert">
              {erroDe('nascimento')}
            </small>
          ) : null}
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="cidade">Cidade</label>
          <input
            id="cidade"
            name="cidade"
            className="input"
            autoComplete="address-level2"
            value={valores.cidade}
            onChange={(e) => definir('cidade', e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="uf">UF</label>
          <input
            id="uf"
            name="uf"
            className="input"
            maxLength={2}
            autoComplete="address-level1"
            value={valores.uf}
            onChange={(e) => definir('uf', e.target.value.toUpperCase())}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="senha">Senha *</label>
        <input
          id="senha"
          name="senha"
          type="password"
          className="input"
          data-ndovu-mask
          autoComplete="new-password"
          value={valores.senha}
          onChange={(e) => definir('senha', e.target.value)}
          {...campoErro('senha', 'senha-ajuda')}
        />
        {erroDe('senha') ? (
          <small id="senha-erro" className="campo-erro" role="alert">
            {erroDe('senha')}
          </small>
        ) : (
          <small id="senha-ajuda" className="muted">
            Mínimo de 10 caracteres, com letras e números.
          </small>
        )}
      </div>

      <div className="field">
        <label
          className="check-item"
          htmlFor="aceite"
          style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}
        >
          <input
            id="aceite"
            name="aceite"
            type="checkbox"
            checked={valores.aceite}
            onChange={(e) => definir('aceite', e.target.checked)}
            aria-invalid={Boolean(erroDe('aceite'))}
            aria-describedby={erroDe('aceite') ? 'aceite-erro' : undefined}
          />
          <span>
            Li e aceito o{' '}
            <Link href="/institucional/politica-de-privacidade" target="_blank">
              aviso de privacidade
            </Link>
            . Seus dados são usados para a sua inscrição e para o contato da federação. *
          </span>
        </label>
        {erroDe('aceite') ? (
          <small id="aceite-erro" className="campo-erro" role="alert">
            {erroDe('aceite')}
          </small>
        ) : null}
      </div>

      <button type="submit" className="btn btn--azul" disabled={pendente}>
        {pendente ? 'Criando conta…' : 'Criar conta'}
      </button>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
        Depois de criar a conta, enviamos um e-mail com o link de ativação. Só é possível entrar
        depois de clicar nele.
      </p>
    </form>
  )
}
