'use client'

import { type FormEvent, type ReactNode, useMemo, useState, useTransition } from 'react'
import type { EstadoFormulario } from '@/lib/atleta/tipos'
import { dataLonga } from '@/lib/format'
import {
  type CampoFormulario,
  camposVisiveis,
  ehSecao,
  type Respostas,
  validarRespostas,
} from '@/lib/inscricoes/validacao'

type ConsentimentoView = {
  identificador: string
  obrigatorio: boolean
  texto: string
}

type Props = {
  acao: (prev: EstadoFormulario, form: FormData) => Promise<EstadoFormulario>
  atleta: {
    cpfMascara: string
    email: string
    idade: number
    menor: boolean
    nascimento: string
    nome: string
  }
  aviso: ReactNode
  evento: { nome: string; prazo: string; slug: string }
  formulario: {
    campos: CampoFormulario[]
    consentimentos: ConsentimentoView[]
    id: string
    titulo: string
    versaoAviso: string
  }
}

const PASSOS = ['Identificação', 'Dados da inscrição', 'Responsável e LGPD', 'Revisão']

const dataDoInput = (valor: string): string => {
  if (/^\d{4}-\d{2}-\d{2}/.test(valor)) return valor.slice(0, 10)
  return ''
}

export function FormularioInscricao({
  acao,
  atleta,
  aviso,
  evento,
  formulario,
}: Props) {
  const campos = formulario.campos
  const [passo, setPasso] = useState(0)
  const [respostas, setRespostas] = useState<Respostas>({})
  const [aceites, setAceites] = useState<Record<string, boolean>>({})
  const [responsavel, setResponsavel] = useState({
    nome: '',
    parentesco: '',
    telefone: '',
    cpf: '',
  })
  const [erros, setErros] = useState<Array<{ campo: string; mensagem: string }>>([])
  const [estado, setEstado] = useState<EstadoFormulario>({ ok: false })
  const [enviando, iniciarTransicao] = useTransition()

  /**
   * Envio manual (sem `action={}`): o React 19 resetaria o formulário depois da
   * action, desmarcando consentimentos e apagando o que a pessoa preencheu quando
   * o servidor devolvesse erro de validação.
   */
  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()

    const falhas = formulario.consentimentos
      .filter((c) => c.obrigatorio && !aceites[c.identificador])
      .map((c) => ({
        campo: `consentimento:${c.identificador}`,
        mensagem: 'É necessário aceitar.',
      }))

    if (falhas.length > 0) {
      setErros(falhas)
      return
    }

    const dados = new FormData(evento.currentTarget)
    iniciarTransicao(async () => {
      setEstado(await acao(estado, dados))
    })
  }

  const visiveis = useMemo(() => camposVisiveis(campos, respostas), [campos, respostas])
  const erroDe = (nome: string) => erros.find((e) => e.campo === nome)?.mensagem
  const visivel = (campo: CampoFormulario): boolean => {
    const regra = campo.mostrarSe
    if (!regra?.campo) return true
    const valor = respostas[regra.campo]
    if (Array.isArray(valor)) return valor.includes(regra.valor ?? '')
    if (typeof valor === 'boolean') return valor === (regra.valor === 'true')
    return String(valor ?? '') === (regra.valor ?? '')
  }

  const definir = (nome: string, valor: boolean | string | string[]) => {
    setRespostas((atual) => ({ ...atual, [nome]: valor }))
    setErros((atual) => atual.filter((e) => e.campo !== nome))
    void formulario
  }

  const validarPasso1 = (): boolean => {
    const resultado = validarRespostas(campos, respostas)
    if (resultado.ok) {
      setErros([])
      return true
    }
    setErros(resultado.erros)
    return false
  }

  const validarPasso2 = (): boolean => {
    const novos: Array<{ campo: string; mensagem: string }> = []

    if (atleta.menor) {
      if (responsavel.nome.trim().length < 5)
        novos.push({ campo: 'responsavelNome', mensagem: 'Informe o nome do responsável.' })
      if (!responsavel.parentesco.trim())
        novos.push({ campo: 'responsavelParentesco', mensagem: 'Informe o parentesco.' })
      if (responsavel.cpf.replace(/\D/g, '').length !== 11)
        novos.push({ campo: 'responsavelCpf', mensagem: 'Informe o CPF do responsável.' })
    }

    for (const c of formulario.consentimentos) {
      if (c.obrigatorio && !aceites[c.identificador]) {
        novos.push({ campo: `consentimento:${c.identificador}`, mensagem: 'É necessário aceitar.' })
      }
    }

    setErros(novos)
    return novos.length === 0
  }

  const avancar = () => {
    if (passo === 1 && !validarPasso1()) return
    if (passo === 2 && !validarPasso2()) return
    setPasso((p) => Math.min(p + 1, PASSOS.length - 1))
  }

  const exibir = (campo: CampoFormulario): string => {
    const valor = respostas[campo.nome ?? '']
    if (valor === undefined || valor === '' || (Array.isArray(valor) && valor.length === 0))
      return '—'
    if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não'
    if (Array.isArray(valor)) {
      return valor
        .map((v) => campo.opcoes?.find((o) => o.valor === v)?.rotulo ?? v)
        .join(', ')
    }
    if (campo.blockType === 'selecao') return campo.opcoes?.find((o) => o.valor === valor)?.rotulo ?? String(valor)
    if (campo.blockType === 'data') return dataDoInput(String(valor)) ? dataLonga(String(valor)) : String(valor)
    return String(valor)
  }

  const erroGeral =
    estado.erro && erros.length === 0 ? (
      <div className="alerta alerta--erro" role="alert">
        {estado.erro}
      </div>
    ) : null

  return (
    <form
      className="form"
      noValidate
      data-ndovu-manual
      aria-busy={enviando}
      onKeyDown={(evento) => {
        // Enter no meio do preenchimento não pode enviar a inscrição: o envio
        // só acontece no último passo, com o botão explícito.
        const alvo = evento.target as HTMLElement
        if (
          evento.key === 'Enter' &&
          passo < PASSOS.length - 1 &&
          alvo.tagName !== 'TEXTAREA'
        ) {
          evento.preventDefault()
        }
      }}
      onSubmit={enviar}
    >
      {erroGeral}

      <input type="hidden" name="evento" value={evento.slug} />
      <input type="hidden" name="formulario" value={formulario.id} />
      <input type="hidden" name="respostas" value={JSON.stringify(respostas)} />
      <input
        type="hidden"
        name="aceitos"
        value={JSON.stringify(Object.keys(aceites).filter((k) => aceites[k]))}
      />
      {/*
        Os blocos de cada passo são desmontados ao avançar. Campos controlados
        por estado (responsável) precisam ir em input oculto, senão o FormData
        chega vazio no servidor.
      */}
      {atleta.menor ? (
        <>
          <input type="hidden" name="responsavelNome" value={responsavel.nome} />
          <input type="hidden" name="responsavelParentesco" value={responsavel.parentesco} />
          <input type="hidden" name="responsavelCpf" value={responsavel.cpf} />
          <input type="hidden" name="responsavelTelefone" value={responsavel.telefone} />
        </>
      ) : null}

      <ol className="inscricao-progresso" aria-label="Etapas da inscrição">
        {PASSOS.map((titulo, indice) => (
          <li
            key={titulo}
            aria-current={indice === passo ? 'step' : undefined}
            data-concluido={indice < passo ? 'true' : undefined}
          >
            <span>{indice + 1}</span>
            {titulo}
          </li>
        ))}
      </ol>

      {passo === 0 ? (
        <section className="inscricao-passo" aria-labelledby="p0">
          <h2 id="p0" className="eyebrow">
            Quem está se inscrevendo
          </h2>
          <div className="card card--pad">
            <ul className="info-list">
              <li>
                <div>
                  <small>Nome</small>
                  {atleta.nome}
                </div>
              </li>
              <li>
                <div>
                  <small>E-mail</small>
                  {atleta.email}
                </div>
              </li>
              <li>
                <div>
                  <small>CPF</small>
                  {atleta.cpfMascara}
                </div>
              </li>
              <li>
                <div>
                  <small>Nascimento</small>
                  {dataLonga(atleta.nascimento)} · {atleta.idade} anos
                </div>
              </li>
            </ul>
            <p className="muted" style={{ fontSize: 14, marginTop: 12 }}>
              Dados incorretos? Atualize em <a href="/area/meus-dados">Meus dados</a>. CPF e data de
              nascimento exigem atendimento da federação.
            </p>
          </div>
        </section>
      ) : null}

      {passo === 1 ? (
        <section className="inscricao-passo" aria-labelledby="p1" aria-live="polite">
          <h2 id="p1" className="eyebrow">
            Dados da inscrição
          </h2>
          {campos
            .filter((campo) => ehSecao(campo) || visivel(campo))
            .map((campo, indice) => {
              if (ehSecao(campo)) {
                return (
                  <div key={`secao-${indice}`} className="inscricao-secao">
                    <h3>{campo.titulo}</h3>
                    {campo.descricao ? <p className="muted">{campo.descricao}</p> : null}
                  </div>
                )
              }

              const nome = campo.nome ?? ''
              const erro = erroDe(nome)
              const id = `campo-${nome}`
              const valor = respostas[nome]

              return (
                <div className="field" key={nome}>
                  {campo.blockType === 'aceite' ? (
                    <label className="check-item" htmlFor={id} style={{ display: 'flex', gap: 10 }}>
                      <input
                        id={id}
                        type="checkbox"
                        checked={valor === true}
                        onChange={(e) => definir(nome, e.target.checked)}
                        aria-invalid={Boolean(erro)}
                        aria-describedby={erro ? `${id}-erro` : undefined}
                      />
                      <span>{campo.texto}</span>
                    </label>
                  ) : (
                    <>
                      <label htmlFor={id}>
                        {campo.rotulo}
                        {campo.obrigatorio ? ' *' : ''}
                      </label>

                      {campo.blockType === 'texto-longo' ? (
                        <textarea
                          id={id}
                          className="textarea"
                          data-ndovu-mask
                          value={String(valor ?? '')}
                          onChange={(e) => definir(nome, e.target.value)}
                          aria-invalid={Boolean(erro)}
                          aria-describedby={erro ? `${id}-erro` : undefined}
                        />
                      ) : campo.blockType === 'selecao' ? (
                        <select
                          id={id}
                          className="select"
                          style={{ width: '100%' }}
                          value={String(valor ?? '')}
                          onChange={(e) => definir(nome, e.target.value)}
                          aria-invalid={Boolean(erro)}
                        >
                          <option value="">Selecione…</option>
                          {(campo.opcoes ?? []).map((o) => (
                            <option key={o.valor} value={o.valor ?? ''}>
                              {o.rotulo}
                            </option>
                          ))}
                        </select>
                      ) : campo.blockType === 'multipla' ? (
                        <fieldset
                          id={id}
                          style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 8 }}
                        >
                          <legend className="sr-only">{campo.rotulo}</legend>
                          {(campo.opcoes ?? []).map((o) => {
                            const lista = Array.isArray(valor) ? valor : []
                            const marcado = lista.includes(o.valor ?? '')
                            return (
                              <label
                                key={o.valor}
                                className="check-item"
                                style={{ display: 'flex', gap: 10 }}
                              >
                                <input
                                  type="checkbox"
                                  checked={marcado}
                                  onChange={(e) =>
                                    definir(
                                      nome,
                                      e.target.checked
                                        ? [...lista, o.valor ?? '']
                                        : lista.filter((v) => v !== o.valor),
                                    )
                                  }
                                />
                                <span>{o.rotulo}</span>
                              </label>
                            )
                          })}
                        </fieldset>
                      ) : (
                        <input
                          id={id}
                          className="input"
                          data-ndovu-mask
                          type={
                            campo.blockType === 'email'
                              ? 'email'
                              : campo.blockType === 'telefone'
                                ? 'tel'
                                : campo.blockType === 'data'
                                  ? 'date'
                                  : campo.blockType === 'numero'
                                    ? 'number'
                                    : 'text'
                          }
                          inputMode={campo.blockType === 'telefone' ? 'tel' : undefined}
                          value={String(valor ?? '')}
                          onChange={(e) => definir(nome, e.target.value)}
                          aria-invalid={Boolean(erro)}
                          aria-describedby={
                            erro ? `${id}-erro` : campo.ajuda ? `${id}-ajuda` : undefined
                          }
                        />
                      )}

                      {campo.ajuda ? (
                        <small id={`${id}-ajuda`} className="muted">
                          {campo.ajuda}
                        </small>
                      ) : null}
                    </>
                  )}

                  {erro ? (
                    <small id={`${id}-erro`} className="campo-erro" role="alert">
                      {erro}
                    </small>
                  ) : null}
                </div>
              )
            })}
        </section>
      ) : null}

      {passo === 2 ? (
        <section className="inscricao-passo" aria-labelledby="p2">
          <h2 id="p2" className="eyebrow">
            {atleta.menor ? 'Responsável e consentimentos' : 'Consentimentos'}
          </h2>

          {atleta.menor ? (
            <div className="alerta alerta--erro" role="note">
              Inscrição de menor de 18 anos: o responsável legal precisa autorizar.
            </div>
          ) : null}

          {atleta.menor ? (
            <div className="card card--pad" style={{ display: 'grid', gap: 18 }}>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="responsavelNome">Nome completo do responsável *</label>
                  <input
                    id="responsavelNome"
                    className="input"
                    data-ndovu-mask
                    value={responsavel.nome}
                    onChange={(e) => setResponsavel({ ...responsavel, nome: e.target.value })}
                    aria-invalid={Boolean(erroDe('responsavelNome'))}
                  />
                </div>
                <div className="field">
                  <label htmlFor="responsavelParentesco">Parentesco *</label>
                  <input
                    id="responsavelParentesco"
                    className="input"
                    value={responsavel.parentesco}
                    onChange={(e) => setResponsavel({ ...responsavel, parentesco: e.target.value })}
                    placeholder="Mãe, pai, tutor…"
                  />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="responsavelCpf">CPF do responsável *</label>
                  <input
                    id="responsavelCpf"
                    className="input"
                    data-ndovu-mask
                    inputMode="numeric"
                    maxLength={14}
                    value={responsavel.cpf}
                    onChange={(e) => setResponsavel({ ...responsavel, cpf: e.target.value })}
                    aria-invalid={Boolean(erroDe('responsavelCpf'))}
                  />
                </div>
                <div className="field">
                  <label htmlFor="responsavelTelefone">Telefone do responsável</label>
                  <input
                    id="responsavelTelefone"
                    type="tel"
                    className="input"
                    data-ndovu-mask
                    value={responsavel.telefone}
                    onChange={(e) => setResponsavel({ ...responsavel, telefone: e.target.value })}
                  />
                </div>
              </div>
              {erroDe('responsavelNome') || erroDe('responsavelCpf') || erroDe('responsavelParentesco') ? (
                <span className="campo-erro" role="alert">
                  {erroDe('responsavelNome') ?? erroDe('responsavelCpf') ?? erroDe('responsavelParentesco')}
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="card card--pad" style={{ display: 'grid', gap: 16 }}>
            <div>{aviso}</div>
            {formulario.consentimentos.map((c) => {
              const chave = `consentimento:${c.identificador}`
              const erro = erroDe(chave)
              return (
                <div key={c.identificador}>
                  <label
                    className="check-item"
                    htmlFor={chave}
                    style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}
                  >
                    <input
                      id={chave}
                      type="checkbox"
                      checked={Boolean(aceites[c.identificador])}
                      onChange={(e) =>
                        setAceites((atual) => ({ ...atual, [c.identificador]: e.target.checked }))
                      }
                      aria-invalid={Boolean(erro)}
                    />
                    <span>
                      {c.texto}
                      {c.obrigatorio ? ' *' : ''}
                    </span>
                  </label>
                  {erro ? (
                    <span className="campo-erro" role="alert">
                      {erro}
                    </span>
                  ) : null}
                </div>
              )
            })}
            <p className="muted" style={{ fontSize: 13 }}>
              Versão do aviso: {formulario.versaoAviso}. Guardamos o texto e a data de cada aceite.
            </p>
          </div>
        </section>
      ) : null}

      {passo === 3 ? (
        <section className="inscricao-passo" aria-labelledby="p3">
          <h2 id="p3" className="eyebrow">
            Confira antes de enviar
          </h2>
          <div className="card card--pad">
            <ul className="info-list">
              {visiveis.map((campo) => (
                <li key={campo.nome}>
                  <div>
                    <small>{campo.rotulo}</small>
                    {exibir(campo)}
                  </div>
                </li>
              ))}
            </ul>
            <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
              Evento: {evento.nome} · {evento.prazo}
            </p>
            <button
              type="button"
              className="btn btn--sm btn--contorno"
              onClick={() => setPasso(1)}
              style={{ marginTop: 12 }}
            >
              Editar respostas
            </button>
          </div>
        </section>
      ) : null}

      <div className="inscricao-acoes">
        {passo > 0 ? (
          <button
            type="button"
            className="btn btn--contorno"
            onClick={() => setPasso((p) => Math.max(0, p - 1))}
            disabled={enviando}
          >
            Voltar
          </button>
        ) : null}

        {passo < PASSOS.length - 1 ? (
          <button key="continuar" type="button" className="btn btn--azul" onClick={avancar}>
            Continuar
          </button>
        ) : (
          <button key="enviar" type="submit" className="btn btn--azul" disabled={enviando}>
            {enviando ? 'Enviando…' : 'Enviar inscrição'}
          </button>
        )}
      </div>

      {estado.erros?.length ? (
        <div className="alerta alerta--erro" role="alert">
          {estado.erro}
        </div>
      ) : null}
    </form>
  )
}
