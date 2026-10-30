import Link from 'next/link'
import { getPayloadClient } from '@/lib/payload'

/**
 * Atalho no menu do painel para a fila de aprovação.
 *
 * A "área" é a própria lista de contas filtrada por `status = pendente`: o
 * administrador vê quem se cadastrou, abre a conta e muda a situação para
 * "Ativa". Contador no link evita que a fila passe despercebida.
 */
export async function LinkPendentes() {
  let total = 0

  try {
    const payload = await getPayloadClient()
    const resultado = await payload.count({
      collection: 'atletas',
      where: { status: { equals: 'pendente' } },
      overrideAccess: true,
    })
    total = resultado.totalDocs
  } catch {
    // Em telas onde o banco ainda não está pronto, o link aparece sem contador.
  }

  return (
    <Link
      href="/admin/collections/atletas?where[status][equals]=pendente"
      style={{
        alignItems: 'center',
        color: 'var(--theme-elevation-800)',
        display: 'flex',
        fontSize: '0.875rem',
        gap: 8,
        justifyContent: 'space-between',
        padding: '8px 16px',
        textDecoration: 'none',
      }}
    >
      <span>Cadastros pendentes</span>
      {total > 0 ? (
        <span
          style={{
            background: 'var(--theme-error-500, #d7000f)',
            borderRadius: 999,
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
            lineHeight: 1,
            padding: '4px 7px',
          }}
        >
          {total}
        </span>
      ) : null}
    </Link>
  )
}
