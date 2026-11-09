/** Só aceita caminho interno — evita open redirect no parâmetro `retorno`. */
export const caminhoInterno = (valor?: null | string): string => {
  const v = (valor ?? '').trim()
  if (!v.startsWith('/') || v.startsWith('//') || v.includes('\\')) return '/area'
  return v
}

/**
 * Para onde voltar depois de entrar.
 *
 * Quem clicou em "Preencher" num formulário cai na área do atleta com aquele
 * formulário em destaque. A tela mostra os disponíveis e os já preenchidos, e o
 * botão de continuar fica a um clique — sem exigir que a pessoa reencontre o
 * evento no calendário. Qualquer outro retorno (ex.: uma inscrição) é preservado.
 */
export const destinoPosLogin = (retorno: string): string => {
  const formulario = /^\/inscricoes\/([^/?#]+)\/formulario\/?$/.exec(retorno)
  if (!formulario?.[1]) return retorno
  return `/area?retomar=${encodeURIComponent(formulario[1])}`
}
