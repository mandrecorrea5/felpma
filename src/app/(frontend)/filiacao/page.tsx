import type { Metadata } from 'next'
import { FiliacaoPerfis, type PerfilFiliacao } from '@/components/FiliacaoPerfis'
import { PageHero } from '@/components/ui'
import { slugify } from '@/fields/slug'
import { isDocumento } from '@/lib/format'
import { getPayloadClient } from '@/lib/payload'

export const metadata: Metadata = {
  title: 'Filiação e renovação',
  description:
    'Filiação de atletas, técnicos, árbitros e clubes: documentos necessários, anuidade e como funciona.',
}

type Props = { searchParams: Promise<{ perfil?: string }> }

export default async function FiliacaoPage({ searchParams }: Props) {
  const { perfil } = await searchParams
  const payload = await getPayloadClient()
  const f = await payload.findGlobal({ slug: 'filiacao', depth: 1 })

  const perfis: PerfilFiliacao[] = (f.perfis ?? []).map((p) => ({
    nome: p.nome,
    descricao: p.descricao,
    anuidade: p.anuidade,
    linkInscricao: p.linkInscricao,
    documentos: (p.documentos ?? []).map((d) => d.item),
    formulario:
      isDocumento(p.formulario) && p.formulario.url
        ? { url: p.formulario.url, titulo: p.formulario.titulo }
        : null,
  }))

  // ?perfil= aceita índice (links da home) ou nome (ex.: "clube")
  let inicial = 0
  if (perfil) {
    const n = Number(perfil)
    inicial = Number.isInteger(n)
      ? n
      : Math.max(
          0,
          perfis.findIndex((p) => slugify(p.nome).startsWith(slugify(perfil))),
        )
  }

  const passos = f.passos ?? []

  return (
    <>
      <PageHero
        titulo="Filiação e renovação"
        intro={f.introducao}
        crumbs={[{ label: 'Filiação' }]}
      />

      {perfis.length ? (
        <FiliacaoWrapper
          perfis={perfis}
          inicial={inicial}
          passos={passos}
          linkRenovacao={f.linkRenovacao}
        />
      ) : (
        <div className="container section">
          <p className="muted">As informações de filiação serão publicadas em breve.</p>
        </div>
      )}

      {f.faq?.length ? (
        <section
          className="container"
          style={{ paddingTop: 8, paddingBottom: 72 }}
          aria-labelledby="faq"
        >
          <h2 id="faq" style={{ fontWeight: 900, fontSize: 28, marginBottom: 16 }}>
            Dúvidas frequentes
          </h2>
          <div className="faq">
            {f.faq.map((q) => (
              <details key={q.id ?? q.pergunta}>
                <summary>{q.pergunta}</summary>
                <p>{q.resposta}</p>
              </details>
            ))}
          </div>
        </section>
      ) : null}
    </>
  )
}

/** Perfis (client) + coluna "Como funciona" lado a lado, como no design. */
function FiliacaoWrapper({
  perfis,
  inicial,
  passos,
  linkRenovacao,
}: {
  perfis: PerfilFiliacao[]
  inicial: number
  passos: { titulo: string; texto?: string | null; id?: string | null }[]
  linkRenovacao?: string | null
}) {
  return (
    <div className="container filiacao-grid">
      <FiliacaoPerfis perfis={perfis} inicial={inicial} />
      {passos.length ? (
        <aside className="passos" aria-labelledby="como">
          <h2 id="como">Como funciona</h2>
          <ol>
            {passos.map((p) => (
              <li key={p.id ?? p.titulo}>
                <div>
                  <strong>{p.titulo}</strong>
                  {p.texto ? <span>{p.texto}</span> : null}
                </div>
              </li>
            ))}
          </ol>
          {linkRenovacao ? (
            <a href={linkRenovacao} className="btn btn--fantasma">
              Já sou filiado — renovar
            </a>
          ) : null}
        </aside>
      ) : null}
    </div>
  )
}
