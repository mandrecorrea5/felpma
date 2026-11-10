import 'server-only'
import sharp from 'sharp'
import { LIMITE_ARQUIVO_BYTES, mimetypesAceitos } from './arquivo'

export type ArquivoPreparado =
  | { erro: string; ok: false }
  | {
      buffer: Buffer
      extensao: 'jpg' | 'pdf'
      mimetype: 'application/pdf' | 'image/jpeg'
      ok: true
      tamanho: number
    }

const PDF = Buffer.from('%PDF-')

const ehPdf = (buffer: Buffer): boolean =>
  buffer.length >= PDF.length && buffer.subarray(0, PDF.length).equals(PDF)

/**
 * Prepara o arquivo recebido pelo formulário para gravação.
 *
 * Fotos passam pelo `sharp`: orientação do EXIF aplicada e metadados removidos
 * (GPS, câmera, data). Documento de saúde não pode levar a localização da casa
 * do atleta para o servidor. PDF não é reescrito — o limite e o cabeçalho
 * `%PDF-` são conferidos aqui.
 */
export async function prepararArquivo(
  arquivo: File,
  aceita?: null | string,
): Promise<ArquivoPreparado> {
  const permitidos = mimetypesAceitos(aceita)
  const tipo =
    arquivo.type || (arquivo.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : '')

  if (!permitidos.includes(tipo)) {
    return { erro: 'O tipo do arquivo não é aceito neste campo.', ok: false }
  }

  if (arquivo.size === 0) return { erro: 'O arquivo está vazio.', ok: false }

  if (arquivo.size > LIMITE_ARQUIVO_BYTES) {
    return {
      erro: 'O arquivo deve ter no máximo 2 MB. Reduza o tamanho e tente de novo.',
      ok: false,
    }
  }

  const original = Buffer.from(await arquivo.arrayBuffer())

  if (tipo === 'application/pdf') {
    if (!ehPdf(original)) {
      return { erro: 'O arquivo enviado não é um PDF válido.', ok: false }
    }
    return {
      buffer: original,
      extensao: 'pdf',
      mimetype: 'application/pdf',
      ok: true,
      tamanho: original.length,
    }
  }

  try {
    const limpo = await sharp(original)
      .rotate()
      .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
      .jpeg({ mozjpeg: true, quality: 82 })
      .toBuffer()

    if (limpo.length > LIMITE_ARQUIVO_BYTES) {
      return {
        erro: 'A foto continua acima de 2 MB depois de otimizada. Tire outra foto ou envie um PDF.',
        ok: false,
      }
    }

    return {
      buffer: limpo,
      extensao: 'jpg',
      mimetype: 'image/jpeg',
      ok: true,
      tamanho: limpo.length,
    }
  } catch {
    return { erro: 'Não foi possível ler a imagem. Envie outro arquivo.', ok: false }
  }
}
