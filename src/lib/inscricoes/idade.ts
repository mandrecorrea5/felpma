export const idadeEm = (nascimentoISO: string, referencia = new Date()): number => {
  const nascimento = new Date(nascimentoISO)
  if (Number.isNaN(nascimento.getTime())) return 0
  let idade = referencia.getFullYear() - nascimento.getFullYear()
  const mes = referencia.getMonth() - nascimento.getMonth()
  if (mes < 0 || (mes === 0 && referencia.getDate() < nascimento.getDate())) idade--
  return idade
}

/**
 * Idade em 31/12 do ano do evento — a referência usada pelas categorias de base
 * e master. Sem data válida do evento, cai no ano corrente.
 */
export const idadeNoAnoDoEvento = (
  nascimentoISO: string,
  inicioDoEvento?: null | string,
): number => {
  const dataEvento = inicioDoEvento ? new Date(inicioDoEvento) : null
  const ano =
    dataEvento && !Number.isNaN(dataEvento.getTime())
      ? dataEvento.getFullYear()
      : new Date().getFullYear()
  return idadeEm(nascimentoISO, new Date(`${ano}-12-31T12:00:00`))
}

export const ehMenorDeIdade = (nascimentoISO: string, referencia = new Date()): boolean =>
  idadeEm(nascimentoISO, referencia) < 18
