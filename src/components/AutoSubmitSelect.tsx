'use client'

import type { SelectHTMLAttributes } from 'react'
import { rastreia, type FuncaoApp } from '@/lib/ndovu/client'

/** Select que envia o formulário ao mudar. Sem JavaScript, o botão "Aplicar" ao lado continua funcionando. */
export function AutoSubmitSelect({
  feature,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { feature?: FuncaoApp }) {
  return (
    <select
      {...props}
      onChange={(e) => {
        // Sai antes do requestSubmit: a submissão muda de página e este contexto
        // morreria se fosse reportado depois.
        rastreia.acao('filtro_aplicado', {
          feature,
          metadados: { campo: props.name, valor: e.currentTarget.value || 'todos' },
        })
        e.currentTarget.form?.requestSubmit()
      }}
    />
  )
}
