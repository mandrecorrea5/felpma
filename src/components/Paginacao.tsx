import Link from 'next/link'

/** Paginação simples por query string, preservando os outros filtros. */
export function Paginacao({
  pagina,
  total,
  base,
  params,
}: {
  pagina: number
  total: number
  base: string
  params?: Record<string, string | undefined>
}) {
  if (total <= 1) return null
  const href = (p: number) => {
    const sp = new URLSearchParams()
    Object.entries(params ?? {}).forEach(([k, v]) => v && sp.set(k, v))
    if (p > 1) sp.set('pagina', String(p))
    const qs = sp.toString()
    return qs ? `${base}?${qs}` : base
  }
  return (
    <nav
      aria-label="Paginação"
      className="pills"
      style={{ justifyContent: 'center', marginTop: 16 }}
    >
      {pagina > 1 ? (
        <Link href={href(pagina - 1)} className="pill" rel="prev">
          Anterior
        </Link>
      ) : null}
      {Array.from({ length: total }, (_, i) => i + 1).map((p) => (
        <Link
          key={p}
          href={href(p)}
          className="pill"
          aria-current={p === pagina ? 'true' : undefined}
          aria-label={`Página ${p}`}
        >
          {p}
        </Link>
      ))}
      {pagina < total ? (
        <Link href={href(pagina + 1)} className="pill" rel="next">
          Próxima
        </Link>
      ) : null}
    </nav>
  )
}

export const paginaDe = (v?: string) => Math.max(1, Number.parseInt(v ?? '1', 10) || 1)
