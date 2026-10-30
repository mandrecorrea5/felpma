/** Estado comum dos formulários da área do atleta (useActionState). */
export type ErroDeCampo = { campo: string; mensagem: string }

export type EstadoFormulario = {
  campos?: Record<string, string>
  erro?: string
  erros?: ErroDeCampo[]
  ok: boolean
  sucesso?: string
}

export const ESTADO_FORMULARIO: EstadoFormulario = { ok: false }
