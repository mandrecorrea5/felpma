import fs from 'node:fs'
import path from 'node:path'
import PDFDocument from 'pdfkit'
import sharp from 'sharp'
import type { ConfiguracoesSite, Media } from '@/payload-types'
import { dataLonga } from '@/lib/format'

/**
 * Geração do PDF do edital no padrão da FELP-MA.
 *
 * O documento de referência da federação tem o cabeçalho com a marca, o texto
 * corrido justificado, as tabelas de categoria/peso e a assinatura no fim — e
 * uma marca d'água grande no centro. Aqui a marca d'água não é desenhada: o
 * fundo fica limpo, próprio para publicação oficial.
 */

export type EditalParaPdf = {
  ano: number
  abertura?: null | string
  categoriasIdade?:
    | null
    | {
        descricao?: null | string
        nome?: null | string
      }[]
  categoriasPeso?:
    | null
    | {
        linhas?:
          | null
          | {
              feminino?: null | string
              masculino?: null | string
            }[]
        titulo?: null | string
      }[]
  cidadeAssinatura?: null | string
  dataEvento?: null | string
  direitosImagem?: null | string
  disposicoes?: null | string
  emailInscricao?: null | string
  endereco?: null | string
  horario?: null | string
  inscricoesAte?: null | string
  inscricoesDe?: null | string
  inscricoesRegras?:
    | null
    | {
        texto?: null | string
      }[]
  inscricoesTexto?: null | string
  local?: null | string
  numero: string
  observacaoTaxas?: null | string
  observacoesFinais?: null | string
  pesagem?: null | string
  regras?: null | string
  requisitos?:
    | null
    | {
        texto?: null | string
      }[]
  taxas?:
    | null
    | {
        categoria?: null | string
        federado?: null | string
        naoFederado?: null | string
      }[]
  titulo: string
}

const A4 = { height: 841.89, width: 595.28 }
const MARGEM = 56
const LARGURA = A4.width - MARGEM * 2
const TOPO_CONTEUDO = 112
const RODAPE = A4.height - 52

const AZUL = '#1C0A96'
const TEXTO = '#14141A'
const CINZA = '#666666'
const LINHA = '#9A9A9A'

const SUBSTITUICOES = /\{([a-zA-Z]+)\}/g

const limpar = (valor?: null | string): string => (valor ?? '').trim()

const paragrafosDe = (texto?: null | string): string[] =>
  limpar(texto)
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean)

const arquivoDoLogo = (config: ConfiguracoesSite | null): null | string => {
  const logo = config?.logo
  if (!logo || typeof logo !== 'object') return null
  const media = logo as Media
  if (!media.filename) return null
  const caminho = path.join(process.cwd(), 'media', media.filename)
  return fs.existsSync(caminho) ? caminho : null
}

const logoEmPng = async (config: ConfiguracoesSite | null): Promise<Buffer | null> => {
  const caminho = arquivoDoLogo(config)
  if (!caminho) return null
  try {
    // O PDFKit só embute PNG/JPEG. Converter também aceita WebP e normaliza o
    // tamanho, sem depender do formato em que a logo foi enviada.
    return await sharp(fs.readFileSync(caminho))
      .resize({ width: 360, withoutEnlargement: true })
      .png()
      .toBuffer()
  } catch {
    return null
  }
}

const dataOuPlaceholder = (valor?: null | string): string =>
  valor ? dataLonga(valor) : '____ de ____________ de ____'

export async function gerarPdfEdital(
  edital: EditalParaPdf,
  config: ConfiguracoesSite | null,
): Promise<Buffer> {
  const logo = await logoEmPng(config)
  const sigla = limpar(config?.sigla) || 'FELP-MA'
  const nomeCompleto =
    limpar(config?.nomeCompleto) || 'Federação de Levantamento de Peso do Maranhão'
  const ano = Number(edital.ano) || new Date().getFullYear()
  const numero = limpar(edital.numero) || '01'
  const titulo = limpar(edital.titulo) || 'COMPETIÇÃO'
  const cidade = limpar(edital.cidadeAssinatura) || 'São Luís'

  const valores: Record<string, string> = {
    ano: String(ano),
    cidade,
    data: dataOuPlaceholder(edital.dataEvento),
    emailInscricao: limpar(edital.emailInscricao) || 'felpmaranhao@gmail.com',
    inscricoesAte: dataOuPlaceholder(edital.inscricoesAte),
    inscricoesDe: dataOuPlaceholder(edital.inscricoesDe),
    local: limpar(edital.local),
    nomeCompleto,
    sigla,
    titulo,
  }

  const trocar = (texto?: null | string): string =>
    limpar(texto).replace(SUBSTITUICOES, (original, chave: string) => valores[chave] ?? original)

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: TOPO_CONTEUDO, bottom: 52, left: MARGEM, right: MARGEM },
    bufferPages: true,
    info: {
      Author: sigla,
      Creator: 'FELP-MA',
      Title: `Edital ${numero}/${ano} — ${titulo}`,
      Subject: 'Edital de competição',
    },
  })

  const chunks: Buffer[] = []
  const finalizado = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  const desenhaCabecalho = () => {
    doc.save()
    if (logo) {
      try {
        doc.image(logo, MARGEM, 30, { fit: [76, 44] })
      } catch {
        // Uma logo corrompida não pode impedir a emissão do edital.
      }
    } else {
      doc
        .rect(MARGEM, 32, 42, 36)
        .fill(AZUL)
        .fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(9)
        .text(sigla.slice(0, 4), MARGEM, 46, { align: 'center', width: 42 })
    }

    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor(CINZA)
      .text(nomeCompleto, MARGEM, 35, { align: 'right', width: LARGURA })
      .text(`Edital ${numero}/${ano}`, MARGEM, 46, { align: 'right', width: LARGURA })

    doc
      .moveTo(MARGEM, 82)
      .lineTo(A4.width - MARGEM, 82)
      .lineWidth(0.8)
      .strokeColor(AZUL)
      .stroke()
    doc.restore()
    doc.x = MARGEM
    doc.y = TOPO_CONTEUDO
  }

  doc.on('pageAdded', desenhaCabecalho)
  desenhaCabecalho()

  // ------------------------------------------------------------- cabeçalho
  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor(TEXTO)
    .text(`Edital ${numero}/${ano} – ${sigla}`, { lineGap: 1 })
  doc.moveDown(0.7)

  const paragrafos = (texto?: null | string) => {
    for (const paragrafo of paragrafosDe(trocar(texto))) {
      doc.x = MARGEM
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor(TEXTO)
        .text(paragrafo, { align: 'justify', lineGap: 2, paragraphGap: 6 })
    }
  }

  const secao = (numeroSecao: number, tituloSecao: string) => {
    doc.moveDown(0.8)
    if (doc.y + 60 > RODAPE) doc.addPage()
    doc.x = MARGEM
    doc
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .fillColor(AZUL)
      .text(`${numeroSecao}. ${tituloSecao}`, { lineGap: 1 })
    doc.moveDown(0.35)
  }

  const item = (letra: string, texto?: null | string) => {
    const conteudo = trocar(texto)
    if (!conteudo) return
    let y = doc.y
    // Evita deixar uma única linha órfã no alto da página seguinte.
    if (y + 52 > RODAPE) {
      doc.addPage()
      y = doc.y
    }
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(TEXTO)
      .text(`${letra}.`, MARGEM + 8, y, { lineBreak: false, width: 16 })
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(TEXTO)
      .text(conteudo, MARGEM + 28, y, {
        align: 'justify',
        lineGap: 2,
        width: LARGURA - 28,
      })
    doc.moveDown(0.3)
  }

  const tabela = (opcoes: {
    cabecalho: string[]
    larguras: number[]
    linhas: string[][]
  }): void => {
    const alturaCabecalho = 18
    const alturaLinha = 18
    const x0 = MARGEM
    const total = opcoes.larguras.reduce((soma, largura) => soma + largura, 0)
    const larguras = opcoes.larguras.map((largura) => (largura / total) * LARGURA)

    const celula = (texto: string, x: number, y: number, largura: number, negrito: boolean) => {
      doc.rect(x, y, largura, alturaLinha).lineWidth(0.5).strokeColor(LINHA).stroke()
      doc
        .font(negrito ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(8.3)
        .fillColor(TEXTO)
        .text(texto, x + 5, y + 5, {
          ellipsis: true,
          height: alturaLinha - 6,
          lineBreak: false,
          width: largura - 10,
        })
    }

    const cabecalho = (y: number) => {
      let x = x0
      doc.rect(x0, y, LARGURA, alturaCabecalho).fill('#F1F1F4')
      opcoes.cabecalho.forEach((tituloColuna, i) => {
        doc.rect(x, y, larguras[i], alturaCabecalho).lineWidth(0.5).strokeColor(LINHA).stroke()
        doc
          .font('Helvetica-Bold')
          .fontSize(8.3)
          .fillColor(TEXTO)
          .text(tituloColuna, x + 5, y + 5, {
            align: 'center',
            height: alturaCabecalho - 6,
            lineBreak: false,
            width: larguras[i] - 10,
          })
        x += larguras[i]
      })
    }

    let y = doc.y
    if (y + alturaCabecalho + alturaLinha > RODAPE) {
      doc.addPage()
      y = doc.y
    }
    cabecalho(y)
    y += alturaCabecalho

    for (const linha of opcoes.linhas) {
      if (y + alturaLinha > RODAPE) {
        doc.addPage()
        y = doc.y
        cabecalho(y)
        y += alturaCabecalho
      }
      let x = x0
      linha.forEach((valor, i) => {
        celula(valor, x, y, larguras[i], false)
        x += larguras[i]
      })
      y += alturaLinha
    }

    doc.y = y + 10
    doc.x = MARGEM
  }

  // ---------------------------------------------------------------- texto
  paragrafos(
    edital.abertura ||
      'A presidente da Federação de Levantamento de Peso do Maranhão (FELP-MA) torna público o edital de convocação para a {titulo}.',
  )

  secao(1, 'Disposições Preliminares')
  paragrafos(
    edital.disposicoes ||
      'O campeonato será regido pelas normas deste edital e executado pela Federação Esportiva de Levantamento de Peso do Estado do Maranhão FELP-MA.',
  )

  secao(2, 'Data, hora e Local')
  const dataLongaTexto = dataOuPlaceholder(edital.dataEvento)
  const horario = limpar(edital.horario)
  const local = limpar(edital.local)
  const endereco = limpar(edital.endereco)
  item(
    'a',
    `As provas serão realizadas dia ${dataLongaTexto}${horario ? `, ${horario}` : ''}${
      local ? `, no ${local}` : ''
    }${endereco ? `, localizado na ${endereco}` : ''}.`,
  )
  item('b', 'Não serão realizadas provas fora do local e horário determinados por este edital.')
  item(
    'c',
    'Atletas que não estiverem presentes no horário da pesagem de sua categoria serão automaticamente desqualificados.',
  )
  item(
    'd',
    'Para pesagem: os atletas deverão apresentar documento com foto, trajando o uniforme oficial de competição (macacão) para realização de sua pesagem.',
  )
  if (limpar(edital.pesagem)) {
    item('e', limpar(edital.pesagem))
  }

  secao(3, 'Requisitos para competição')
  const requisitos = edital.requisitos ?? []
  requisitos.forEach((requisito, i) => {
    item(String.fromCharCode(97 + i), requisito?.texto)
  })

  secao(4, 'Categorias')
  doc.font('Helvetica-Bold').fontSize(10).fillColor(TEXTO).text('a. Idade:')
  doc.moveDown(0.35)
  for (const categoria of edital.categoriasIdade ?? []) {
    const nome = trocar(categoria?.nome)
    const descricao = trocar(categoria?.descricao)
    if (!nome && !descricao) continue
    const y = doc.y
    doc
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .fillColor(TEXTO)
      .text(`${nome}`, MARGEM + 28, y, {
        width: 190,
      })
    doc
      .font('Helvetica')
      .fontSize(9.5)
      .fillColor(TEXTO)
      .text(descricao, MARGEM + 218, y, { width: LARGURA - 218, lineGap: 1 })
    doc.moveDown(0.2)
  }

  doc.moveDown(0.8)
  if (doc.y + 120 > RODAPE) doc.addPage()
  doc.x = MARGEM
  doc.font('Helvetica-Bold').fontSize(10).fillColor(TEXTO).text('b. Peso')
  doc.moveDown(0.5)

  for (const grupo of edital.categoriasPeso ?? []) {
    const tituloGrupo = trocar(grupo?.titulo)
    if (!tituloGrupo && !(grupo?.linhas ?? []).length) continue
    if (tituloGrupo) {
      doc.x = MARGEM
      doc
        .font('Helvetica-Bold')
        .fontSize(8.6)
        .fillColor(TEXTO)
        .text(tituloGrupo, { align: 'center', characterSpacing: 0.2 })
      doc.moveDown(0.3)
    }
    const linhas = (grupo?.linhas ?? []).map((linha) => [
      limpar(linha?.masculino),
      limpar(linha?.feminino),
    ])
    tabela({ cabecalho: ['MASCULINO', 'FEMININO'], larguras: [1, 1], linhas })
    doc.moveDown(0.5)
  }

  secao(5, 'Inscrições')
  paragrafos(edital.inscricoesTexto)

  const taxas = edital.taxas ?? []
  if (taxas.length > 0) {
    tabela({
      cabecalho: ['Categoria de idade', 'Federado', 'Não-Federado'],
      larguras: [1, 0.5, 0.5],
      linhas: taxas.map((taxa) => [
        limpar(taxa?.categoria),
        limpar(taxa?.federado),
        limpar(taxa?.naoFederado),
      ]),
    })
    paragrafos(edital.observacaoTaxas)
  }

  const regrasInscricao = edital.inscricoesRegras ?? []
  regrasInscricao.forEach((regra, i) => {
    // As letras a–d já foram usadas no texto e na tabela de taxas.
    item(String.fromCharCode(101 + i), regra?.texto)
  })

  secao(6, 'Regras')
  paragrafos(
    edital.regras ||
      'Serão utilizadas as regras de competição e pesagem regulamentadas no manual de regras e regulamentos técnicos de competição da International Weightlifting Federation (IWF).',
  )

  secao(7, 'Direitos de imagem')
  paragrafos(
    edital.direitosImagem ||
      'Os participantes do campeonato autorizam, desde o ato de sua inscrição ou participação, a utilização de sua imagem pela FELP-MA.',
  )

  if (limpar(edital.observacoesFinais)) {
    secao(8, 'Disposições finais')
    paragrafos(edital.observacoesFinais)
  }

  // ------------------------------------------------------------ assinatura
  doc.moveDown(1.4)
  if (doc.y + 110 > RODAPE) doc.addPage()
  doc.x = MARGEM
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor(TEXTO)
    .text(`${cidade}, _______ de ________________ de ${ano}`, { align: 'right', width: LARGURA })
  doc.moveDown(2.2)
  const linhaY = doc.y
  doc
    .moveTo(MARGEM + 120, linhaY)
    .lineTo(A4.width - MARGEM - 120, linhaY)
    .lineWidth(0.8)
    .strokeColor(TEXTO)
    .stroke()
  doc
    .font('Helvetica-Bold')
    .fontSize(8.5)
    .fillColor(TEXTO)
    .text('PRESIDENTE FELP-MA', MARGEM + 120, linhaY + 5, {
      align: 'center',
      width: LARGURA - 240,
    })

  // -------------------------------------------------------------- rodapé
  const paginas = doc.bufferedPageRange()
  for (let i = 0; i < paginas.count; i++) {
    doc.switchToPage(i)
    // O rodapé fica abaixo da margem inferior. Sem zerar a margem, o PDFKit
    // entende que o texto não cabe e cria uma página em branco a cada rodapé.
    const margemInferior = doc.page.margins.bottom
    doc.page.margins.bottom = 0
    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor(CINZA)
      .text(
        `Edital ${numero}/${ano} · ${sigla} · Página ${i + 1} de ${paginas.count}`,
        MARGEM,
        A4.height - 38,
        { align: 'center', lineBreak: false, width: LARGURA },
      )
    doc
      .moveTo(MARGEM, A4.height - 46)
      .lineTo(A4.width - MARGEM, A4.height - 46)
      .lineWidth(0.4)
      .strokeColor('#CCCCCC')
      .stroke()
    doc.page.margins.bottom = margemInferior
  }

  doc.end()
  return finalizado
}
