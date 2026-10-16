'use client'

import type { SelectHTMLAttributes } from 'react'

/** Select que envia o formulário ao mudar. Sem JavaScript, o botão "Aplicar" ao lado continua funcionando. */
export function AutoSubmitSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />
}
