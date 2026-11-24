import type { RespostaSnapshot } from './validacao'

/**
 * Reconhecimento da categoria de peso.
 *
 * A categoria é uma pergunta dinâmica do formulário (bloco "Seleção única"),
 * mas é a informação que organiza a competição: precisa aparecer na lista de
 * inscrições, no CSV e na área do atleta sem depender de abrir o JSON de
 * respostas. O vínculo é feito pelo nome técnico do campo ou, quando o
 * formulário não segue o padrão, pelo rótulo da pergunta.
 */

/** Normaliza nome/rótulo: sem acento, minúsculo e sem pontuação nas pontas. */
const normalizar = (valor: string): string =>
  valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

/** Chave técnica: "Categoria de peso (masculino)" -> "categoria-de-peso-masculino". */
const chave = (valor: string): string =>
  normalizar(valor)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const CAMPOS_PADRAO = new Set([
  'categoria-peso',
  'categoria-de-peso',
  'categoriapeso',
  'categoria-peso-masculino',
  'categoria-peso-feminino',
  'categoria-de-peso-masculino',
  'categoria-de-peso-feminino',
])

/** O campo é a categoria de peso? Aceita `{ nome, rotulo }` de formulário ou snapshot. */
export const ehCategoriaPeso = (campo: {
  campo?: null | string
  nome?: null | string
  rotulo?: null | string
}): boolean => {
  const nome = campo.nome ?? campo.campo ?? ''
  const nomeChave = chave(nome)

  if (
    nomeChave &&
    (CAMPOS_PADRAO.has(nomeChave) ||
      (nomeChave.includes('categoria') && nomeChave.includes('peso')))
  ) {
    return true
  }

  // Só o rótulo "Categoria de peso" — "Peso" sozinho costuma ser peso corporal.
  const rotulo = normalizar(campo.rotulo ?? '')
  return rotulo.includes('categoria de peso')
}

/** Valor legível de um snapshot, sem expor dado cifrado ou sensível. */
const valorLegivel = (resposta: RespostaSnapshot): null | string => {
  if (resposta.sensivel) return null

  const exibicao = typeof resposta.exibicao === 'string' ? resposta.exibicao.trim() : ''
  if (exibicao) return exibicao

  // Sem `exibicao`, um valor cifrado não pode virar texto solto no painel.
  if (resposta.cifrado) return null

  const valor = resposta.valor
  if (Array.isArray(valor)) {
    const lista = valor.map((item) => String(item).trim()).filter(Boolean)
    return lista.length > 0 ? lista.join(', ') : null
  }
  if (valor === null || valor === undefined) return null

  const texto = String(valor).trim()
  return texto || null
}

const comoLista = (respostas: unknown): RespostaSnapshot[] => {
  if (Array.isArray(respostas)) {
    return respostas.filter((item): item is RespostaSnapshot =>
      Boolean(item && typeof item === 'object' && 'campo' in item),
    )
  }

  // O JSON pode chegar como string em integrações antigas.
  if (typeof respostas === 'string' && respostas.trim().startsWith('[')) {
    try {
      return comoLista(JSON.parse(respostas))
    } catch {
      return []
    }
  }

  return []
}

/**
 * Extrai a categoria de peso do snapshot de respostas.
 *
 * Primeiro procura pelo nome técnico (o vínculo estável); só depois aceita o
 * rótulo, para não confundir uma pergunta livre sobre "peso" com a categoria.
 */
export const categoriaPesoDeRespostas = (respostas: unknown): null | string => {
  const lista = comoLista(respostas)
  if (lista.length === 0) return null

  const porNome = lista.find((resposta) => ehCategoriaPeso({ campo: resposta.campo }))
  const alvo = porNome ?? lista.find((resposta) => ehCategoriaPeso({ rotulo: resposta.rotulo }))

  return alvo ? valorLegivel(alvo) : null
}

/** Categoria gravada na inscrição ou, para registros antigos, derivada do snapshot. */
export const categoriaPesoDaInscricao = (inscricao: {
  categoriaPeso?: null | string
  respostas?: unknown
}): null | string => {
  const gravada = typeof inscricao.categoriaPeso === 'string' ? inscricao.categoriaPeso.trim() : ''
  return gravada || categoriaPesoDeRespostas(inscricao.respostas)
}

/** Categorias de idade são perguntadas à parte da categoria de peso. */
const CAMPOS_IDADE = new Set([
  'categoria-idade',
  'categoria-de-idade',
  'categoriaidade',
  'categoria-idade-masculino',
  'categoria-idade-feminino',
])

const ehCategoriaIdade = (campo: {
  campo?: null | string
  nome?: null | string
  rotulo?: null | string
}): boolean => {
  const nome = campo.nome ?? campo.campo ?? ''
  const chaveNome = chave(nome)

  if (
    chaveNome &&
    (CAMPOS_IDADE.has(chaveNome) ||
      (chaveNome.includes('categoria') && chaveNome.includes('idade')))
  ) {
    return true
  }

  return normalizar(campo.rotulo ?? '').includes('categoria de idade')
}

/**
 * Extrai a categoria de idade do snapshot de respostas.
 *
 * É o que diferencia "Sub-17" de "Sub-20" quando o mesmo atleta se inscreve em
 * mais de uma faixa etária no mesmo evento.
 */
export const categoriaIdadeDeRespostas = (respostas: unknown): null | string => {
  const lista = comoLista(respostas)
  if (lista.length === 0) return null

  const porNome = lista.find((resposta) => ehCategoriaIdade({ campo: resposta.campo }))
  const alvo = porNome ?? lista.find((resposta) => ehCategoriaIdade({ rotulo: resposta.rotulo }))

  return alvo ? valorLegivel(alvo) : null
}

/**
 * Peso (kg) contido no rótulo da categoria — "Sub-17 – 61 kg", "+110 kg",
 * "Sub-20, Adulto e Master — 81 kg". O rótulo é o que a federação mantém no
 * painel; comparar o número evita que a mesma pessoa se inscreva em 61 kg numa
 * faixa e 67 kg na outra (ela pesa uma vez só).
 */
export const pesoDaCategoria = (texto: null | string | undefined): null | number => {
  if (!texto) return null
  const encontrado = texto.match(/(\d{1,3}(?:[.,]\d+)?)\s*kg/i)
  if (!encontrado) return null
  const peso = Number(encontrado[1].replace(',', '.'))
  return Number.isFinite(peso) ? peso : null
}

/** Compara faixas escritas de jeitos diferentes ("Sub-17", "sub17", "Sub 17"). */
export const mesmaCategoria = (a: null | string | undefined, b: null | string | undefined): boolean =>
  Boolean(a && b) && chave(String(a)) === chave(String(b))
