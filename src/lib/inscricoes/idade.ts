export const idadeEm = (nascimentoISO: string, referencia = new Date()): number => {
  const nascimento = new Date(nascimentoISO)
  if (Number.isNaN(nascimento.getTime())) return 0
  let idade = referencia.getFullYear() - nascimento.getFullYear()
  const mes = referencia.getMonth() - nascimento.getMonth()
  if (mes < 0 || (mes === 0 && referencia.getDate() < nascimento.getDate())) idade--
  return idade
}

export const ehMenorDeIdade = (nascimentoISO: string, referencia = new Date()): boolean =>
  idadeEm(nascimentoISO, referencia) < 18
