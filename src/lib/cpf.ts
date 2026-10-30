/** CPF: normalização, validação (dígitos verificadores) e máscara. */

export const normalizarCpf = (valor: string): string => valor.replace(/\D/g, '')

/** Algoritmo oficial dos dois dígitos verificadores. */
export const cpfValido = (valor: string): boolean => {
  const cpf = normalizarCpf(valor)
  if (cpf.length !== 11) return false
  // Rejeita 000.000.000-00, 111.111.111-11 etc. — passam no cálculo, mas não existem.
  if (/^(\d)\1{10}$/.test(cpf)) return false

  const digito = (ate: number): number => {
    let soma = 0
    for (let i = 0; i < ate; i++) soma += Number(cpf[i]) * (ate + 1 - i)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }

  return digito(9) === Number(cpf[9]) && digito(10) === Number(cpf[10])
}

/** `***.***.***-42` — o suficiente para a pessoa reconhecer o próprio CPF. */
export const mascararCpf = (valor: string): string => {
  const cpf = normalizarCpf(valor)
  if (cpf.length !== 11) return '***.***.***-**'
  return `***.***.***-${cpf.slice(-2)}`
}

/** `123.456.789-09` — só para exibição a quem tem permissão de revelar. */
export const formatarCpf = (valor: string): string => {
  const cpf = normalizarCpf(valor)
  if (cpf.length !== 11) return valor
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`
}
