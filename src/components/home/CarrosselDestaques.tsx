'use client'

import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'

/**
 * Carrossel do destaque da home.
 *
 * Os slides chegam prontos do servidor (a curadoria e o corte por prazo são
 * feitos lá); aqui só existe a navegação: avançar sozinho, setas e bolinhas.
 *
 * - Para de girar quando o ponteiro está em cima, quando algo recebe foco (quem
 *   navega por teclado consegue ler) e em `prefers-reduced-motion`.
 * - O slide escondido fica `inert`, então o Tab não entra em link fora da tela.
 */
export function CarrosselDestaques({
  rotulos,
  slides,
}: {
  rotulos: string[]
  slides: ReactNode[]
}) {
  const [atual, setAtual] = useState(0)
  const [pausado, setPausado] = useState(false)
  const total = slides.length
  const reduzirMovimento = useRef(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    reduzirMovimento.current = media.matches
    const aoMudar = () => {
      reduzirMovimento.current = media.matches
    }
    media.addEventListener('change', aoMudar)
    return () => media.removeEventListener('change', aoMudar)
  }, [])

  useEffect(() => {
    if (total < 2 || pausado) return
    const id = window.setInterval(() => {
      if (reduzirMovimento.current) return
      setAtual((indice) => (indice + 1) % total)
    }, 7000)
    return () => window.clearInterval(id)
  }, [pausado, total])

  const irPara = useCallback(
    (indice: number) => setAtual(((indice % total) + total) % total),
    [total],
  )

  return (
    <section
      className="hero"
      role="region"
      aria-roledescription="carrossel"
      aria-label="Competições em destaque"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocusCapture={() => setPausado(true)}
      onBlurCapture={() => setPausado(false)}
    >
      <div className="carrossel">
        <div className="carrossel__trilha" style={{ transform: `translateX(-${atual * 100}%)` }}>
          {slides.map((slide, indice) => (
            <div
              key={indice}
              className="carrossel__slide"
              role="group"
              aria-roledescription="slide"
              aria-label={`${indice + 1} de ${total}: ${rotulos[indice] ?? ''}`}
              aria-hidden={indice !== atual}
              inert={indice !== atual}
            >
              {slide}
            </div>
          ))}
        </div>

        {total > 1 ? (
          <div className="container carrossel__barra">
            <div className="carrossel__pontos">
              {slides.map((_, indice) => (
                <button
                  key={indice}
                  type="button"
                  className="carrossel__ponto"
                  aria-label={`Ir para o destaque ${indice + 1}`}
                  aria-current={indice === atual ? 'true' : undefined}
                  onClick={() => irPara(indice)}
                />
              ))}
            </div>
            <div className="carrossel__setas">
              <button
                type="button"
                className="carrossel__seta"
                aria-label="Destaque anterior"
                onClick={() => irPara(atual - 1)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M15 5l-7 7 7 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                className="carrossel__seta"
                aria-label="Próximo destaque"
                onClick={() => irPara(atual + 1)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M9 5l7 7-7 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
