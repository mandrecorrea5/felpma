/**
 * Upload de arquivo nos formulários de inscrição.
 *
 * Este módulo é puro (roda no cliente e no servidor): limite, tipos aceitos e
 * mensagens. A validação "de verdade" repete tudo no servidor — o `size`/`type`
 * que chegam do navegador são apenas uma dica de interface.
 */

export const LIMITE_ARQUIVO_BYTES = 2 * 1024 * 1024
export const LIMITE_ARQUIVO_MB = 2

export const TIPOS_ARQUIVO = [
  { label: 'PDF', value: 'pdf' },
  { label: 'PDF ou foto (JPG/PNG)', value: 'pdf-imagem' },
  { label: 'Foto (JPG/PNG)', value: 'imagem' },
] as const

export type AceitaArquivo = (typeof TIPOS_ARQUIVO)[number]['value']

const MIMETYPES: Record<AceitaArquivo, string[]> = {
  pdf: ['application/pdf'],
  imagem: ['image/jpeg', 'image/png'],
  'pdf-imagem': ['application/pdf', 'image/jpeg', 'image/png'],
}

/** MIME types que o painel mostra e o servidor aceita para um campo. */
export const mimetypesAceitos = (aceita?: null | string): string[] =>
  MIMETYPES[(aceita as AceitaArquivo) ?? 'pdf-imagem'] ?? MIMETYPES['pdf-imagem']

/** Valor de `accept` do input, para o seletor de arquivos já filtrar. */
export const acceptDoCampo = (aceita?: null | string): string => mimetypesAceitos(aceita).join(',')

export const formatarTamanhoArquivo = (bytes: number): string => {
  if (!bytes) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}

type ArquivoBasico = { name: string; size: number; type: string }

/**
 * Regras do arquivo escolhido. Retorna a mensagem de erro ou `null` se estiver
 * dentro do limite e do tipo permitido.
 */
export const erroDoArquivo = (arquivo: ArquivoBasico, aceita?: null | string): null | string => {
  const permitidos = mimetypesAceitos(aceita)
  // Alguns navegadores mandam `type` vazio para PDFs; nesse caso vale a extensão.
  const tipo =
    arquivo.type || (arquivo.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : '')

  if (!permitidos.includes(tipo)) {
    const descricao =
      aceita === 'pdf'
        ? 'PDF'
        : aceita === 'imagem'
          ? 'uma foto JPG ou PNG'
          : 'um PDF ou uma foto JPG/PNG'
    return `Envie ${descricao}.`
  }

  if (arquivo.size > LIMITE_ARQUIVO_BYTES) {
    return `O arquivo deve ter no máximo ${LIMITE_ARQUIVO_MB} MB.`
  }

  if (arquivo.size === 0) return 'O arquivo está vazio. Escolha outro.'

  return null
}

/**
 * Nome de armazenamento sem acentos/espaços. O protocolo entra no início para
 * o arquivo ser localizável no servidor mesmo sem o banco, e o sufixo evita
 * colisão quando a mesma pessoa envia o mesmo campo duas vezes.
 */
export const nomeArmazenado = (protocolo: string, campo: string, extensao: string): string => {
  const limpo = (valor: string) =>
    valor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()

  const sufixo = Date.now().toString(36)
  return `${limpo(protocolo)}-${limpo(campo)}-${sufixo}.${limpo(extensao)}`
}
