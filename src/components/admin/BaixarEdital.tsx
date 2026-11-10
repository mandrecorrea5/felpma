type Props = {
  id?: number | string
}

/** Atalho no topo da edição: abre o PDF gerado na hora, mesmo antes de publicar. */
export function BaixarEdital({ id }: Props) {
  if (id == null || id === '') return null

  return (
    <a
      href={`/api/editais/${id}/pdf`}
      target="_blank"
      rel="noopener noreferrer"
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
      title="Abrir o PDF gerado no padrão da federação"
    >
      <span aria-hidden="true">↓</span>
      Baixar PDF
    </a>
  )
}
