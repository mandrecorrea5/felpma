'use client'

import { useState } from 'react'
import { Icon } from './Icon'

export type PerfilFiliacao = {
  nome: string
  descricao?: string | null
  anuidade?: number | null
  linkInscricao?: string | null
  documentos: string[]
  formulario?: { url: string; titulo: string } | null
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function FiliacaoPerfis({
  perfis,
  inicial = 0,
}: {
  perfis: PerfilFiliacao[]
  inicial?: number
}) {
  const [sel, setSel] = useState(Math.min(Math.max(inicial, 0), perfis.length - 1))
  const atual = perfis[sel]
  if (!atual) return null

  return (
    <>
      <div className="filiacao-perfis">
        <h2 className="eyebrow" style={{ marginBottom: 18 }}>
          1 · Qual é o seu perfil?
        </h2>
        <div role="group" aria-label="Perfil de filiação" className="perfis">
          {perfis.map((p, i) => (
            <button
              key={p.nome}
              type="button"
              className="perfil"
              aria-pressed={i === sel}
              aria-controls="docs-perfil"
              onClick={() => setSel(i)}
            >
              <strong>{p.nome}</strong>
              {p.descricao ? <span>{p.descricao}</span> : null}
            </button>
          ))}
        </div>
      </div>

      <div id="docs-perfil" className="docs-box" aria-live="polite">
        <h2 className="eyebrow">2 · Documentos para {atual.nome}</h2>
        {atual.documentos.length ? (
          atual.documentos.map((d) => (
            <div key={d} className="check-item">
              <i aria-hidden="true">
                <Icon name="check" size={16} strokeWidth={2.6} />
              </i>
              <span>{d}</span>
            </div>
          ))
        ) : (
          <p className="muted">A lista de documentos será publicada em breve.</p>
        )}
        {atual.formulario ? (
          <a href={atual.formulario.url} className="link-seta" target="_blank" rel="noopener">
            <Icon name="download" size={16} />
            {atual.formulario.titulo}
          </a>
        ) : null}
        <div className="anuidade">
          <div>
            <small>Anuidade</small>
            <strong>
              {typeof atual.anuidade === 'number' ? brl(atual.anuidade) : 'Consulte a federação'}
            </strong>
          </div>
          {atual.linkInscricao ? (
            <a href={atual.linkInscricao} className="btn btn--vermelho">
              Iniciar filiação de {atual.nome}
            </a>
          ) : (
            <a
              href={`/contato?assunto=filiacao&perfil=${encodeURIComponent(atual.nome)}`}
              className="btn btn--vermelho"
            >
              Solicitar filiação de {atual.nome}
            </a>
          )}
        </div>
      </div>
    </>
  )
}
