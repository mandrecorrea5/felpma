/**
 * Curtidas de notícia.
 *
 * O visitante não precisa de conta: cada navegador recebe um identificador
 * aleatório em cookie httpOnly (`felpma-visitante`) e pode curtir/descurtir
 * uma vez por notícia. O cookie não identifica a pessoa — é só a chave de
 * deduplicação, por isso a curtida conta como dado anônimo.
 *
 * O contador exibido fica em `noticias.curtidas` (cache do count real, para a
 * listagem não precisar de uma query por card). A fonte da verdade continua
 * sendo a coleção `curtidas`: cada curtida/descurtida recalcula o campo.
 */

export const COOKIE_VISITANTE = 'felpma-visitante'

/** Um ano. Curto o bastante para não virar rastreio permanente. */
export const SEGUNDOS_COOKIE_VISITANTE = 60 * 60 * 24 * 365

/** UUID v4 tem 36 caracteres; qualquer coisa fora disso é cookie adulterado. */
export const chaveValida = (valor: null | string | undefined): valor is string =>
  Boolean(valor && valor.length >= 16 && valor.length <= 64)

export type ResultadoCurtida =
  | { curtido: boolean; ok: true; total: number }
  | { erro: string; ok: false }
