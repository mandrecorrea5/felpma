'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { COOKIE_LOGIN } from '@/lib/analytics/constantes'
import { eventoGA, type ParametrosGA } from '@/lib/analytics/ga'

type Props = {
  /** Chave de deduplicação: recarregar a página não conta a conversão de novo. */
  chave: string
  nome: string
  parametros?: ParametrosGA
}

/**
 * Dispara um evento GA4 uma vez por sessão, ao montar.
 *
 * Serve para as conversões que terminam em `redirect()` de Server Action: o
 * formulário nunca vê a resposta de sucesso, então o sinal que sobra é a query
 * de retorno (`?criada=1`, `?ativada=1`, `?enviada=1`). Um F5 nessa página
 * reenviaria o evento — daí o `sessionStorage`, que o GA4 não tem.
 */
export function EventoGA({ chave, nome, parametros = {} }: Props) {
  // Objeto inline muda de identidade a cada render: a dependência é o JSON.
  const dados = JSON.stringify(parametros)

  useEffect(() => {
    const id = `felpma:ga:${chave}`
    let jaContado = false
    try {
      jaContado = window.sessionStorage.getItem(id) === '1'
    } catch {
      // Sem sessionStorage ainda vale disparar; o pior caso é contar duas vezes.
    }
    if (jaContado) return

    // Sem consentimento o evento é descartado — e a chave NÃO é gravada, senão
    // uma conversão perdida antes do aceite nunca mais seria contada.
    if (!eventoGA(nome, JSON.parse(dados) as ParametrosGA)) return

    try {
      window.sessionStorage.setItem(id, '1')
    } catch {
      // idem
    }
  }, [chave, nome, dados])

  return null
}

/**
 * Evento `login` do GA4.
 *
 * A action de login redireciona, então o formulário não recebe um "ok". Ela
 * deixa o cookie de vida curta `felpma_entrou`; aqui ele é lido uma única vez,
 * apagado e convertido em evento — sem poluir a URL com `?entrou=1`.
 */
export function LoginGA() {
  const pathname = usePathname()

  useEffect(() => {
    const temCookie = document.cookie.split('; ').includes(`${COOKIE_LOGIN}=1`)
    if (!temCookie) return
    document.cookie = `${COOKIE_LOGIN}=; Path=/; Max-Age=0; SameSite=Lax`
    eventoGA('login', { method: 'email' })
  }, [pathname])

  return null
}
