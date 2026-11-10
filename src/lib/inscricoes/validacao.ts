/**
 * Validação das respostas contra o schema do formulário.
 *
 * O CMS não valida o JSON de respostas — quem submete pode mandar qualquer
 * coisa. Esta é a barreira do servidor: tipos, obrigatoriedade, opções válidas,
 * limites e o que está visível (perguntas condicionais).
 */

export type Resposta = boolean | number | string | string[]

export type Respostas = Record<string, Resposta>

export type CampoFormulario = {
  aceita?: null | string
  ajuda?: null | string
  blockType: string
  descricao?: null | string
  max?: null | number
  maxLength?: null | number
  min?: null | number
  minLength?: null | number
  mostrarSe?: null | { campo?: null | string; valor?: null | string }
  nome?: null | string
  obrigatorio?: boolean | null
  filtrarPor?: null | string
  opcoes?: null | {
    grupo?: null | string
    rotulo?: null | string
    valor?: null | string
  }[]
  rotulo?: null | string
  sensivel?: boolean | null
  texto?: null | string
  titulo?: null | string
}

export type ErroCampo = { campo: string; mensagem: string }

/** Referência ao upload privado guardado em `arquivos-inscricao`. */
export type ArquivoSnapshot = {
  id: number | string
  mimetype: string
  nome: string
  tamanho: number
}

export type RespostaSnapshot = {
  arquivo?: ArquivoSnapshot
  campo: string
  exibicao?: string
  rotulo: string
  sensivel: boolean
  tipo: string
  valor: Resposta
}

export type ResultadoValidacao =
  | { erros: ErroCampo[]; ok: false }
  | { ok: true; valores: Respostas }

const vazio = (valor: Resposta | undefined): boolean =>
  valor === undefined ||
  valor === null ||
  valor === '' ||
  (Array.isArray(valor) && valor.length === 0)

const texto = (valor: Resposta | undefined): string =>
  typeof valor === 'string' ? valor.trim() : ''

const dataISO = (valor: string): null | string => {
  const bruto = valor.trim()
  if (!bruto) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(bruto)) return bruto
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(bruto)
  if (!br) return null
  const [, dia, mes, ano] = br
  const data = new Date(`${ano}-${mes}-${dia}T12:00:00Z`)
  if (Number.isNaN(data.getTime())) return null
  if (data.getUTCDate() !== Number(dia) || data.getUTCMonth() + 1 !== Number(mes)) return null
  return `${ano}-${mes}-${dia}`
}

export const ehSecao = (campo: CampoFormulario): boolean => campo.blockType === 'secao'

/** Visibilidade do campo condicional: sem corrente, um nível só. */
export const estaVisivel = (campo: CampoFormulario, respostas: Respostas): boolean => {
  const regra = campo.mostrarSe
  if (!regra?.campo) return true
  const valor = respostas[regra.campo]
  if (Array.isArray(valor)) return valor.includes(regra.valor ?? '')
  if (typeof valor === 'boolean') return valor === (regra.valor === 'true')
  return String(valor ?? '') === (regra.valor ?? '')
}

export const camposVisiveis = (
  campos: CampoFormulario[],
  respostas: Respostas,
): CampoFormulario[] => campos.filter((c) => !ehSecao(c) && estaVisivel(c, respostas))

/**
 * Opções que podem ser escolhidas agora.
 *
 * Um campo com `filtrarPor` só aceita as opções cujo `grupo` seja igual ao
 * grupo da opção escolhida no campo de referência (ex.: categoria de peso
 * filtrada pela categoria de idade). Opções sem grupo continuam sempre
 * visíveis; sem a referência escolhida, as opções com grupo somem — o que
 * impede escolher “Infantil 35 kg” antes de dizer a categoria de idade.
 */
export const opcoesDisponiveis = (
  campo: CampoFormulario,
  campos: CampoFormulario[],
  respostas: Respostas,
): NonNullable<CampoFormulario['opcoes']> => {
  const todas = campo.opcoes ?? []
  const referencia = campo.filtrarPor?.trim()
  if (!referencia) return todas

  const campoDeReferencia = campos.find((c) => c.nome?.trim() === referencia)
  const valorDeReferencia = respostas[referencia]
  const grupoDeReferencia =
    typeof valorDeReferencia === 'string'
      ? campoDeReferencia?.opcoes?.find((o) => o.valor === valorDeReferencia)?.grupo
      : undefined

  return todas.filter(
    (opcao) =>
      !opcao.grupo || (Boolean(grupoDeReferencia) && opcao.grupo === grupoDeReferencia),
  )
}

const rotuloDe = (campo: CampoFormulario, valor: string): string => {
  const opcao = campo.opcoes?.find((o) => o.valor === valor)
  return opcao?.rotulo ?? valor
}

export function validarRespostas(
  campos: CampoFormulario[],
  respostas: Respostas,
): ResultadoValidacao {
  const erros: ErroCampo[] = []
  const valores: Respostas = {}

  for (const campo of camposVisiveis(campos, respostas)) {
    const nome = campo.nome?.trim()
    if (!nome) continue
    const rotulo = campo.rotulo?.trim() || nome
    const bruto = respostas[nome]
    const obrigatorio = Boolean(campo.obrigatorio)

    if (campo.blockType === 'aceite') {
      if (obrigatorio && bruto !== true) {
        erros.push({ campo: nome, mensagem: 'É necessário marcar esta declaração.' })
      }
      if (bruto === true) valores[nome] = true
      continue
    }

    if (vazio(bruto)) {
      if (obrigatorio) erros.push({ campo: nome, mensagem: `Responda: ${rotulo}.` })
      continue
    }

    switch (campo.blockType) {
      case 'texto':
      case 'texto-longo': {
        const valor = texto(bruto)
        if (campo.minLength && valor.length < campo.minLength) {
          erros.push({
            campo: nome,
            mensagem: `Use pelo menos ${campo.minLength} caracteres em "${rotulo}".`,
          })
          break
        }
        if (campo.maxLength && valor.length > campo.maxLength) {
          erros.push({
            campo: nome,
            mensagem: `Use no máximo ${campo.maxLength} caracteres em "${rotulo}".`,
          })
          break
        }
        valores[nome] = valor
        break
      }

      case 'email': {
        const valor = texto(bruto).toLowerCase()
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) {
          erros.push({ campo: nome, mensagem: 'Informe um e-mail válido.' })
          break
        }
        valores[nome] = valor
        break
      }

      case 'telefone': {
        const digitos = texto(bruto).replace(/\D/g, '')
        if (digitos.length < 10 || digitos.length > 11) {
          erros.push({ campo: nome, mensagem: 'Informe o telefone com DDD.' })
          break
        }
        valores[nome] = digitos
        break
      }

      case 'data': {
        const iso = dataISO(String(bruto))
        if (!iso) {
          erros.push({ campo: nome, mensagem: 'Informe uma data válida (dd/mm/aaaa).' })
          break
        }
        valores[nome] = iso
        break
      }

      case 'arquivo': {
        // O nome só serve de rastro para a revisão; o arquivo em si é conferido
        // e gravado na server action (`arquivo-servidor.ts`).
        valores[nome] = texto(bruto)
        break
      }

      case 'numero': {
        const numero = Number(String(bruto).replace(',', '.'))
        if (!Number.isFinite(numero)) {
          erros.push({ campo: nome, mensagem: 'Informe um número válido.' })
          break
        }
        if (campo.min != null && numero < campo.min) {
          erros.push({ campo: nome, mensagem: `O valor mínimo é ${campo.min}.` })
          break
        }
        if (campo.max != null && numero > campo.max) {
          erros.push({ campo: nome, mensagem: `O valor máximo é ${campo.max}.` })
          break
        }
        valores[nome] = numero
        break
      }

      case 'selecao': {
        const valor = texto(bruto)
        const existe = opcoesDisponiveis(campo, campos, respostas).some((o) => o.valor === valor)
        if (!existe) {
          erros.push({
            campo: nome,
            mensagem: campo.filtrarPor
              ? 'Escolha uma opção compatível com as respostas anteriores.'
              : 'Escolha uma das opções.',
          })
          break
        }
        valores[nome] = valor
        break
      }

      case 'multipla': {
        const lista = (Array.isArray(bruto) ? bruto : [bruto])
          .map((v) => texto(v))
          .filter(Boolean)
        const validos = new Set(
          opcoesDisponiveis(campo, campos, respostas).map((o) => o.valor),
        )
        if (lista.some((v) => !validos.has(v))) {
          erros.push({
            campo: nome,
            mensagem: 'Uma das opções escolhidas não está disponível para as respostas anteriores.',
          })
          break
        }
        valores[nome] = lista
        break
      }

      default:
        break
    }
  }

  return erros.length > 0 ? { ok: false, erros } : { ok: true, valores }
}

/** Snapshot imutável do que foi perguntado e respondido (vai para `inscricoes.respostas`). */
export function montarSnapshot(
  campos: CampoFormulario[],
  respostas: Respostas,
): RespostaSnapshot[] {
  return camposVisiveis(campos, respostas)
    .filter((c) => {
      if (!c.nome) return false
      const valor = respostas[c.nome]
      // Resposta opcional em branco não vira registro nem é cifrada à toa.
      if (c.obrigatorio) return true
      return !(valor === undefined || valor === '' || valor === false || (Array.isArray(valor) && valor.length === 0))
    })
    .map((campo) => {
      const nome = campo.nome as string
      const valor = respostas[nome]
      const rotuloDeclaracao =
        campo.blockType === 'aceite' && campo.texto
          ? campo.texto.length > 90
            ? `${campo.texto.slice(0, 87)}…`
            : campo.texto
          : undefined
      const snapshot: RespostaSnapshot = {
        campo: nome,
        rotulo: campo.rotulo ?? rotuloDeclaracao ?? nome,
        tipo: campo.blockType,
        valor: valor ?? '',
        sensivel: Boolean(campo.sensivel),
      }

      if (typeof valor === 'string' && (campo.blockType === 'selecao' || campo.blockType === 'multipla')) {
        snapshot.exibicao = rotuloDe(campo, valor)
      }
      if (Array.isArray(valor) && campo.blockType === 'multipla') {
        snapshot.exibicao = valor.map((v) => rotuloDe(campo, v)).join(', ')
      }

      return snapshot
    })
}
