'use client'

import { useRowLabel } from '@payloadcms/ui'

type Linha = {
  atleta?: string
  categoriaPeso?: string
  sexo?: string
  colocacao?: number
  total?: number
}

/** Mostra "1º · Fulana · F 59 kg · 180 kg" no lugar de "Linha 01" no painel. */
export const ResultadoRowLabel = () => {
  const { data, rowNumber } = useRowLabel<Linha>()
  if (!data?.atleta) return <span>Atleta {String((rowNumber ?? 0) + 1).padStart(2, '0')}</span>
  const parts = [
    data.colocacao ? `${data.colocacao}º` : null,
    data.atleta,
    [data.sexo, data.categoriaPeso].filter(Boolean).join(' '),
    data.total ? `${data.total} kg` : null,
  ].filter(Boolean)
  return <span>{parts.join(' · ')}</span>
}
