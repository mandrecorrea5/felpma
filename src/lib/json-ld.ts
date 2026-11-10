/**
 * Serializa dados para dentro de `<script type="application/ld+json">`.
 *
 * `JSON.stringify` não escapa `<`: um texto vindo do CMS contendo `</script>`
 * fecha a tag e injeta HTML/JS na página pública (XSS armazenado). Trocar os
 * caracteres que o parser HTML trata como especiais por escapes `\uXXXX` mantém
 * o JSON idêntico para quem consome o JSON-LD e torna o conteúdo inerte para o
 * parser.
 *
 * U+2028/U+2029 entram junto porque são quebra de linha em JavaScript e
 * quebravam o script em runtimes antigos.
 */
export const jsonParaScript = (valor: unknown): string =>
  JSON.stringify(valor)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
