/**
 * Constantes compartilhadas entre o cliente (GA4) e o servidor (Server Actions).
 *
 * Fica separado de `ga.ts` porque aquele módulo é `'use client'`: um arquivo
 * `'use server'` que importasse um valor dele receberia uma referência de
 * cliente, não o valor. Aqui não há `window`, então os dois lados podem ler.
 */

/** Cookie de vida curta que a action de login deixa para o evento `login`. */
export const COOKIE_LOGIN = 'felpma_entrou'
