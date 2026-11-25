'use client'

import { useState } from 'react'

/**
 * Botão de copiar a chave Pix.
 *
 * `navigator.clipboard` exige contexto seguro (HTTPS ou localhost). Se falhar,
 * o texto seleciona a chave no campo para a pessoa copiar à mão — melhor que
 * um botão que não faz nada.
 */
export function BotaoCopiar({ texto, rotulo = 'Copiar' }: { texto: string; rotulo?: string }) {
  const [copiado, setCopiado] = useState(false)
  const [falhou, setFalhou] = useState(false)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setFalhou(false)
      window.setTimeout(() => setCopiado(false), 2500)
    } catch {
      setFalhou(true)
      const campo = document.getElementById('pix-chave-valor') as HTMLElement | null
      if (campo) {
        const selecao = window.getSelection()
        const faixa = document.createRange()
        faixa.selectNodeContents(campo)
        selecao?.removeAllRanges()
        selecao?.addRange(faixa)
      }
    }
  }

  return (
    <span className="copiar">
      <button type="button" className="btn btn--sm btn--contorno" onClick={copiar}>
        {copiado ? 'Copiado!' : rotulo}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {copiado ? 'Chave Pix copiada.' : ''}
      </span>
      {falhou ? (
        <span className="muted" style={{ fontSize: 13 }}>
          Selecione a chave e copie manualmente.
        </span>
      ) : null}
    </span>
  )
}
