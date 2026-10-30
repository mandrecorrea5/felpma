/** Só aceita caminho interno — evita open redirect no parâmetro `retorno`. */
export const caminhoInterno = (valor?: null | string): string => {
  const v = (valor ?? '').trim()
  if (!v.startsWith('/') || v.startsWith('//') || v.includes('\\')) return '/area'
  return v
}
