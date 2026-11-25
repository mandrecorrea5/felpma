import type { Atleta } from '@/payload-types'
import { idadeNoAnoDoEvento } from './idade'
import { type CampoFormulario, ehSecao, type Resposta, type Respostas } from './validacao'

/**
 * Aproveitamento dos dados da conta do atleta no formulário de inscrição.
 *
 * O atleta não pode criar outra conta: nome, e-mail, CPF, nascimento, telefone,
 * cidade, UF e sexo já foram informados no cadastro. Em vez de pedir tudo de
 * novo, o formulário nasce com esses campos preenchidos — e todos eles ficam
 * travados: a inscrição não é lugar de editar o cadastro. O servidor sobrescreve
 * cada um com o dado da conta, senão bastaria alterar o sexo no navegador para
 * entrar na categoria errada (ou trocar o telefone por um número que não é do
 * atleta). A correção é feita em **Meus dados**.
 */

type TipoDado = 'cidade' | 'email' | 'idade' | 'nascimento' | 'nome' | 'sexo' | 'telefone' | 'uf'

type DadoDoCadastro = { bloqueado: boolean; valor: Resposta }

const normalizar = (valor: string): string =>
  valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const chave = (valor: string): string =>
  normalizar(valor)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const POR_NOME: Record<string, TipoDado> = {
  nome: 'nome',
  'nome-completo': 'nome',
  email: 'email',
  'e-mail': 'email',
  telefone: 'telefone',
  celular: 'telefone',
  whatsapp: 'telefone',
  'telefone-atleta': 'telefone',
  'telefone-whatsapp': 'telefone',
  cidade: 'cidade',
  uf: 'uf',
  sexo: 'sexo',
  nascimento: 'nascimento',
  'data-nascimento': 'nascimento',
  'data-de-nascimento': 'nascimento',
  idade: 'idade',
}

/** Rótulo só quando ele é inequívoco — evita pegar "Nome do treinador". */
const POR_ROTULO: Record<string, TipoDado> = {
  nome: 'nome',
  'nome completo': 'nome',
  'e-mail': 'email',
  email: 'email',
  sexo: 'sexo',
  idade: 'idade',
  'data de nascimento': 'nascimento',
}

/**
 * Palavras que identificam o dado quando o rótulo diz explicitamente "do
 * atleta" ("Telefone / WhatsApp do atleta", "Nome completo do atleta"). Sem
 * isso, o campo continuaria editável e o servidor não o sobrescreveria.
 */
const POR_PALAVRA: Array<[RegExp, TipoDado]> = [
  [/\be-?mail\b/, 'email'],
  [/\bnascimento\b/, 'nascimento'],
  [/\bnome\b/, 'nome'],
  [/\b(telefone|celular|whatsapp)\b/, 'telefone'],
  [/\bsexo\b/, 'sexo'],
  [/\bidade\b/, 'idade'],
  [/\bcidade\b/, 'cidade'],
  [/\buf\b/, 'uf'],
]

const tipoDoCampo = (campo: CampoFormulario): null | TipoDado => {
  const rotulo = normalizar(campo.rotulo ?? '').replace(/\s+/g, ' ')
  // "Nome do treinador", "telefone do responsável" e afins não são dados do
  // atleta titular, mesmo que o nome técnico seja genérico.
  if (/\b(clube|equipe|academia|treinador|tecnico|responsavel)\b/.test(rotulo)) return null

  const nome = chave(campo.nome ?? '')
  if (nome) {
    // "telefone-do-atleta", "nome_atleta": o sufixo diz de quem é o dado.
    const semAtleta = nome.replace(/^atleta-/, '').replace(/-(de-|do-|da-)?atleta$/, '')
    for (const candidato of [nome, semAtleta]) {
      if (candidato && POR_NOME[candidato]) return POR_NOME[candidato]
    }
  }

  if (POR_ROTULO[rotulo]) return POR_ROTULO[rotulo]

  // Só cai na palavra-chave quando o rótulo nomeia o atleta — senão "Categoria
  // de idade" e "Nome do clube" virariam dado da conta.
  if (!/\batleta\b/.test(rotulo)) return null
  return POR_PALAVRA.find(([padrao]) => padrao.test(rotulo))?.[1] ?? null
}

const opcaoDeSexo = (campo: CampoFormulario, sexo: 'F' | 'M'): null | string => {
  const masculino = sexo === 'M'
  const alvo = masculino ? 'masculino' : 'feminino'
  const opcao = campo.opcoes?.find((o) => {
    const valor = normalizar(o.valor ?? '')
    const rotulo = normalizar(o.rotulo ?? '')
    return (
      valor === sexo.toLowerCase() ||
      valor === alvo ||
      rotulo === sexo.toLowerCase() ||
      rotulo.includes(alvo)
    )
  })
  return opcao?.valor ?? null
}

const valorDoCadastro = (
  campo: CampoFormulario,
  atleta: Atleta,
  inicioDoEvento?: null | string,
): DadoDoCadastro | null => {
  const tipo = tipoDoCampo(campo)
  if (!tipo) return null

  switch (tipo) {
    case 'nome':
      return atleta.nome ? { bloqueado: true, valor: atleta.nome } : null

    case 'email':
      return atleta.email ? { bloqueado: true, valor: atleta.email } : null

    case 'telefone':
      return atleta.telefone ? { bloqueado: true, valor: atleta.telefone } : null

    case 'cidade':
      return atleta.cidade ? { bloqueado: true, valor: atleta.cidade } : null

    case 'uf':
      return atleta.uf ? { bloqueado: true, valor: atleta.uf } : null

    case 'sexo': {
      if (!atleta.sexo) return null
      // Em seleção, o valor precisa ser o da opção do formulário (M/F ou
      // "masculino"/"feminino"); sem correspondência, deixa o atleta escolher.
      if (campo.blockType === 'selecao') {
        const valor = opcaoDeSexo(campo, atleta.sexo)
        return valor ? { bloqueado: true, valor } : null
      }
      return { bloqueado: true, valor: atleta.sexo }
    }

    case 'nascimento': {
      const iso = atleta.dataNascimento?.slice(0, 10)
      return iso ? { bloqueado: true, valor: iso } : null
    }

    case 'idade':
      return { bloqueado: true, valor: idadeNoAnoDoEvento(atleta.dataNascimento, inicioDoEvento) }

    default:
      return null
  }
}

/**
 * Respostas iniciais do formulário. Só preenche campo ainda vazio, para não
 * sobrescrever algo que a pessoa já tinha digitado.
 */
export const dadosIniciaisDoCadastro = (
  campos: CampoFormulario[],
  atleta: Atleta,
  inicioDoEvento?: null | string,
  respostasAtuais: Respostas = {},
): { bloqueados: string[]; respostas: Respostas } => {
  const respostas: Respostas = { ...respostasAtuais }
  const bloqueados: string[] = []

  for (const campo of campos) {
    if (ehSecao(campo)) continue
    const nome = campo.nome?.trim()
    if (!nome) continue

    const atual = respostas[nome]
    if (atual !== undefined && atual !== null && atual !== '') continue

    const dado = valorDoCadastro(campo, atleta, inicioDoEvento)
    if (!dado) continue

    respostas[nome] = dado.valor
    if (dado.bloqueado) bloqueados.push(nome)
  }

  return { bloqueados, respostas }
}

/**
 * Versão autoritativa usada na server action: sobrescreve os campos travados
 * com o dado da conta, mesmo que o corpo da requisição traga outro valor.
 */
export const aplicarDadosDoCadastro = (
  campos: CampoFormulario[],
  respostas: Respostas,
  atleta: Atleta,
  inicioDoEvento?: null | string,
): Respostas => {
  const final: Respostas = { ...respostas }

  for (const campo of campos) {
    if (ehSecao(campo)) continue
    const nome = campo.nome?.trim()
    if (!nome) continue

    const dado = valorDoCadastro(campo, atleta, inicioDoEvento)
    if (dado?.bloqueado) final[nome] = dado.valor
  }

  return final
}

/** Traduz a resposta de sexo para M/F (aceita valor ou rótulo da opção). */
export const sexoDaResposta = (
  campos: CampoFormulario[],
  respostas: Respostas,
): 'F' | 'M' | null => {
  const campo = campos.find((c) => tipoDoCampo(c) === 'sexo' && c.nome)
  if (!campo?.nome) return null

  const bruto = respostas[campo.nome]
  if (bruto === undefined || bruto === null) return null

  const valor = normalizar(String(bruto))
  if (valor === 'm' || valor === 'masculino') return 'M'
  if (valor === 'f' || valor === 'feminino') return 'F'

  const opcao = campo.opcoes?.find((o) => o.valor === bruto)
  const rotulo = normalizar(opcao?.rotulo ?? '')
  if (rotulo.includes('masculino')) return 'M'
  if (rotulo.includes('feminino')) return 'F'

  return null
}
