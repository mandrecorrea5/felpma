'use client'

import { useRef, useState, useTransition } from 'react'
import type { ResultadoCurtida } from '@/lib/noticias/curtidas'
import { Icon } from './Icon'

/**
 * Coração de curtir com contador.
 *
 * O estado é otimista: o coração e o número mudam no clique e voltam se o
 * servidor recusar. A ação real mora na server action — o componente não conhece
 * cookie nem banco.
 */
export function BotaoCurtir({
  acao,
  curtidoInicial,
  noticiaId,
  totalInicial,
}: {
  acao: (noticiaId: number) => Promise<ResultadoCurtida>
  curtidoInicial: boolean
  noticiaId: number
  totalInicial: number
}) {
  const [curtido, setCurtido] = useState(curtidoInicial)
  const [total, setTotal] = useState(totalInicial)
  const [erro, setErro] = useState('')
  const [pendente, iniciarTransicao] = useTransition()
  // `pendente` só liga depois do render; dois cliques no mesmo tick passariam
  // pela checagem e mandariam duas requisições. O ref fecha essa janela.
  const emVoo = useRef(false)

  const alternar = () => {
    if (emVoo.current) return
    emVoo.current = true
    const proximo = !curtido
    const anterior = { curtido, total }

    setCurtido(proximo)
    setTotal((atual) => Math.max(0, atual + (proximo ? 1 : -1)))
    setErro('')

    iniciarTransicao(async () => {
      try {
        const resultado = await acao(noticiaId)
        if (!resultado.ok) {
          setCurtido(anterior.curtido)
          setTotal(anterior.total)
          setErro(resultado.erro)
          return
        }
        setCurtido(resultado.curtido)
        setTotal(resultado.total)
      } catch {
        // Rede caiu ou a action falhou antes de responder: volta ao estado anterior.
        setCurtido(anterior.curtido)
        setTotal(anterior.total)
        setErro('Não foi possível registrar sua curtida agora. Tente de novo.')
      } finally {
        emVoo.current = false
      }
    })
  }

  return (
    <div className="curtir">
      <button
        type="button"
        className="curtir__btn"
        aria-label={curtido ? 'Remover minha curtida' : 'Curtir esta notícia'}
        aria-pressed={curtido}
        disabled={pendente}
        onClick={alternar}
      >
        <Icon name="coracao" size={18} />
        <span className="curtir__num">{total}</span>
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {total === 1 ? '1 curtida' : `${total} curtidas`}
      </span>
      {erro ? (
        <span className="campo-erro" role="alert">
          {erro}
        </span>
      ) : null}
    </div>
  )
}
