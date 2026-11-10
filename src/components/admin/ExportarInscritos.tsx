import type { Payload } from 'payload'

type Props = {
  id?: number | string
  payload: Payload
  user?: {
    collection?: null | string
    role?: null | string
  }
}

/**
 * Atalho no topo do formulário de inscrição: baixa um CSV com os inscritos e
 * todas as respostas daquela versão (inclusive as de versões anteriores).
 *
 * Só aparece para administradores — editores de conteúdo não exportam dados
 * pessoais em massa.
 */
export async function ExportarInscritos({ id, payload, user }: Props) {
  if (id == null || id === '') return null
  if (user?.collection !== 'users' || user.role !== 'admin') return null

  const { totalDocs } = await payload.count({
    collection: 'inscricoes',
    where: { formulario: { equals: id } },
    overrideAccess: true,
  })

  if (totalDocs === 0) {
    return (
      <span style={{ alignSelf: 'center', color: 'var(--theme-elevation-500)', fontSize: 13 }}>
        Nenhuma inscrição recebida ainda
      </span>
    )
  }

  return (
    <a
      href={`/api/formularios-inscricao/${id}/exportar`}
      style={{
        alignItems: 'center',
        alignSelf: 'center',
        background: 'var(--theme-elevation-100)',
        border: '1px solid var(--theme-elevation-200)',
        borderRadius: 4,
        color: 'var(--theme-elevation-800)',
        display: 'inline-flex',
        fontSize: 13,
        fontWeight: 600,
        gap: 8,
        height: 32,
        padding: '0 12px',
        textDecoration: 'none',
      }}
      title="Baixar CSV com os dados de todos os inscritos neste formulário"
    >
      <span aria-hidden="true">↓</span>
      Exportar inscritos ({totalDocs})
    </a>
  )
}
