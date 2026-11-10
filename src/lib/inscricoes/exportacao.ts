import type { Atleta, FormularioInscricao, Inscricao } from '@/payload-types'
import { labelOf, STATUS_INSCRICAO } from '@/lib/constants'
import { decifrar, ehCifrado } from '@/lib/crypto/campos'
import { formatarCpf } from '@/lib/cpf'
import { dataHora } from '@/lib/format'
import type { CampoFormulario } from './validacao'

/**
 * Exportação dos inscritos de um formulário em CSV.
 *
 * O arquivo é pensado para abrir direto no Excel em português: BOM UTF-8,
 * separador `;` e uma coluna por pergunta, na mesma ordem do formulário.
 * Inscrições antigas podem ter perguntas que já não existem na versão atual —
 * elas entram no fim, com o rótulo congelado no snapshot.
 */

type Snapshot = {
  campo: string
  cifrado?: boolean
  exibicao?: null | string
  rotulo: string
  sensivel?: boolean
  tipo: string
  valor: boolean | number | string | string[]
}

type Coluna = { chave: string; titulo: string }

type Linha = Record<string, string>

const FIXAS: Coluna[] = [
  { chave: 'protocolo', titulo: 'Protocolo' },
  { chave: 'status', titulo: 'Situação' },
  { chave: 'enviadaEm', titulo: 'Enviada em' },
  { chave: 'formularioVersao', titulo: 'Versão do formulário' },
  { chave: 'atleta', titulo: 'Atleta' },
  { chave: 'email', titulo: 'E-mail' },
  { chave: 'cpf', titulo: 'CPF' },
  { chave: 'nascimento', titulo: 'Nascimento' },
  { chave: 'telefone', titulo: 'Telefone' },
  { chave: 'cidade', titulo: 'Cidade' },
  { chave: 'uf', titulo: 'UF' },
  { chave: 'idade', titulo: 'Idade na inscrição' },
  { chave: 'menor', titulo: 'Menor de idade' },
  { chave: 'responsavel', titulo: 'Responsável' },
  { chave: 'parentesco', titulo: 'Parentesco' },
  { chave: 'telefoneResponsavel', titulo: 'Telefone do responsável' },
  { chave: 'cpfResponsavel', titulo: 'CPF do responsável' },
  { chave: 'consentimentos', titulo: 'Consentimentos aceitos' },
]

const texto = (valor: unknown): string => {
  if (valor === null || valor === undefined) return ''
  if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não'
  if (Array.isArray(valor)) return valor.map((v) => texto(v)).join(', ')
  return String(valor)
}

const dataBR = (iso?: null | string): string => {
  if (!iso) return ''
  const curta = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (curta) return `${curta[3]}/${curta[2]}/${curta[1]}`
  return (dataHora(iso).split(' ')[0] ?? '').replace(/,$/, '')
}

const decifra = (valor: string): string => {
  if (!ehCifrado(valor)) return valor
  try {
    return decifrar(valor)
  } catch {
    return '[não foi possível decifrar]'
  }
}

const cpfDe = (atleta: null | Atleta): string => {
  if (!atleta?.cpf) return ''
  const claro = decifra(atleta.cpf)
  return claro.length === 11 ? formatarCpf(claro) : claro
}

const comoSnapshot = (respostas: Inscricao['respostas']): Snapshot[] =>
  Array.isArray(respostas)
    ? respostas.filter((r): r is Snapshot => Boolean(r && typeof r === 'object' && 'campo' in r))
    : []

const valorSnapshot = (snapshot: Snapshot): string => {
  if (snapshot.exibicao) return snapshot.exibicao
  if (snapshot.cifrado && typeof snapshot.valor === 'string') {
    const claro = decifra(snapshot.valor)
    try {
      return texto(JSON.parse(claro))
    } catch {
      return claro
    }
  }
  if (snapshot.tipo === 'data') return dataBR(String(snapshot.valor ?? ''))
  return texto(snapshot.valor)
}

/** Escapa uma célula para CSV e evita que o Excel interprete o texto como fórmula. */
export const celulaCsv = (valor: string): string => {
  const perigoso = /^[=+\-@\t\r]/.test(valor)
  const seguro = perigoso ? `'${valor}` : valor
  return `"${seguro.replace(/"/g, '""')}"`
}

const montaColunas = (
  formularios: Pick<FormularioInscricao, 'campos'>[],
  inscricoes: Inscricao[],
  incluirFormulario: boolean,
): Coluna[] => {
  const colunas = incluirFormulario
    ? [...FIXAS.slice(0, 4), { chave: 'formulario', titulo: 'Formulário' }, ...FIXAS.slice(4)]
    : [...FIXAS]
  const porCampo = new Set<string>()

  for (const formulario of formularios) {
    const atuais = (formulario.campos ?? []) as CampoFormulario[]
    for (const campo of atuais) {
      if (campo.blockType === 'secao') continue
      const chave = campo.nome?.trim()
      if (!chave || porCampo.has(chave)) continue
      porCampo.add(chave)
      colunas.push({ chave: `resposta:${chave}`, titulo: campo.rotulo?.trim() || chave })
    }
  }

  // Perguntas de versões antigas (ou removidas) que ainda existem nos snapshots.
  for (const inscricao of inscricoes) {
    for (const snapshot of comoSnapshot(inscricao.respostas)) {
      if (porCampo.has(snapshot.campo)) continue
      porCampo.add(snapshot.campo)
      colunas.push({
        chave: `resposta:${snapshot.campo}`,
        titulo: snapshot.rotulo || snapshot.campo,
      })
    }
  }

  // Dois campos com o mesmo rótulo ficariam indistinguíveis na planilha.
  const vistos = new Map<string, number>()
  for (const coluna of colunas) {
    const n = (vistos.get(coluna.titulo) ?? 0) + 1
    vistos.set(coluna.titulo, n)
    if (n > 1) coluna.titulo = `${coluna.titulo} (${n})`
  }

  return colunas
}

const linhaDe = (
  inscricao: Inscricao,
  formulariosPorId: Map<string, Pick<FormularioInscricao, 'id' | 'titulo'>>,
): Linha => {
  const atleta = typeof inscricao.atleta === 'object' ? inscricao.atleta : null
  const responsavel = inscricao.responsavel ?? {}
  const formulario =
    typeof inscricao.formulario === 'object'
      ? inscricao.formulario
      : formulariosPorId.get(String(inscricao.formulario))
  const linha: Linha = {
    protocolo: inscricao.protocolo,
    status: labelOf(STATUS_INSCRICAO, inscricao.status),
    enviadaEm: dataHora(inscricao.enviadaEm),
    formularioVersao: String(inscricao.formularioVersao ?? ''),
    formulario: formulario?.titulo ?? '',
    atleta: atleta?.nome ?? texto(inscricao.atleta),
    email: atleta?.email ?? '',
    cpf: cpfDe(atleta),
    nascimento: dataBR(atleta?.dataNascimento),
    telefone: atleta?.telefone ?? '',
    cidade: atleta?.cidade ?? '',
    uf: atleta?.uf ?? '',
    idade: inscricao.idadeNaInscricao != null ? String(inscricao.idadeNaInscricao) : '',
    menor: inscricao.menorDeIdade ? 'Sim' : 'Não',
    responsavel: responsavel.nome ?? '',
    parentesco: responsavel.parentesco ?? '',
    telefoneResponsavel: responsavel.telefone ?? '',
    cpfResponsavel: responsavel.cpf ? formatarCpf(decifra(responsavel.cpf)) : '',
    consentimentos: (inscricao.consentimentos ?? [])
      .filter((c) => c.aceito)
      .map((c) => `${c.identificador ?? '—'} (v${c.versao ?? '—'})`)
      .join(', '),
  }

  for (const snapshot of comoSnapshot(inscricao.respostas)) {
    linha[`resposta:${snapshot.campo}`] = valorSnapshot(snapshot)
  }

  return linha
}

export type CsvInscricoes = { arquivo: string; csv: string; linhas: number }

export type OpcoesExportacao = {
  /** Usado no nome do arquivo; sem ele, usa o título do primeiro formulário. */
  nomeBase?: string
  /** Força a coluna "Formulário"; por padrão só aparece com mais de um formulário. */
  incluirFormulario?: boolean
}

export function gerarCsvInscricoes(
  formularios: FormularioInscricao | FormularioInscricao[],
  inscricoes: Inscricao[],
  opcoes: OpcoesExportacao = {},
): CsvInscricoes {
  const lista = Array.isArray(formularios) ? formularios : [formularios]
  const incluirFormulario = opcoes.incluirFormulario ?? lista.length > 1
  const colunas = montaColunas(lista, inscricoes, incluirFormulario)
  const formulariosPorId = new Map<string, Pick<FormularioInscricao, 'id' | 'titulo'>>(
    lista.map((formulario) => [String(formulario.id), formulario]),
  )
  const linhas = inscricoes.map((inscricao) => linhaDe(inscricao, formulariosPorId))

  const csv = [
    colunas.map((c) => celulaCsv(c.titulo)).join(';'),
    ...linhas.map((linha) => colunas.map((c) => celulaCsv(linha[c.chave] ?? '')).join(';')),
  ].join('\r\n')

  const base = opcoes.nomeBase ?? lista[0]?.titulo ?? 'formulario'
  const slug = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  const hoje = new Date().toISOString().slice(0, 10)
  const idArquivo = opcoes.nomeBase ? '' : `-${lista[0]?.id ?? 'formulario'}`

  return {
    // O BOM faz o Excel reconhecer UTF-8 sem pedir importação manual.
    csv: `\uFEFF${csv}\r\n`,
    arquivo: `inscricoes-${slug || 'formulario'}${idArquivo}-${hoje}.csv`,
    linhas: linhas.length,
  }
}

/** Resposta HTTP padrão de download do CSV, com os headers que o navegador espera. */
export const respostaCsv = ({ csv, arquivo }: CsvInscricoes): Response =>
  new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${arquivo}"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
