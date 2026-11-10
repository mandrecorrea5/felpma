import type { Payload } from 'payload'

type Props = {
  payload: Payload
  user?: {
    collection?: null | string
    role?: null | string
  }
}

type Opcao = {
  id: number
  label: string
}

/**
 * Bloco no topo da lista de inscrições: o administrador escolhe o evento e
 * baixa um CSV com todas as inscrições dele — inclusive de mais de um
 * formulário, se o evento tiver versões diferentes.
 *
 * O formulário é HTML puro (GET para o endpoint): o download acontece sem
 * depender de JavaScript do painel.
 */
export async function ExportarInscricoesEvento({ payload, user }: Props) {
  if (user?.collection !== 'users' || user.role !== 'admin') return null

  let opcoes: Opcao[] = []

  try {
    const formularios = await payload.find({
      collection: 'formularios-inscricao',
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: { evento: true, titulo: true },
    })

    const eventoIds = [
      ...new Set(
        formularios.docs
          .map((formulario) =>
            typeof formulario.evento === 'object' ? formulario.evento?.id : formulario.evento,
          )
          .filter((id): id is number => typeof id === 'number'),
      ),
    ]

    if (eventoIds.length === 0) return null

    const eventos = await payload.find({
      collection: 'competicoes',
      where: { id: { in: eventoIds } },
      sort: '-dataInicio',
      depth: 0,
      pagination: false,
      overrideAccess: true,
    })

    const contagens = await Promise.all(
      eventos.docs.map(async (evento) => {
        const { totalDocs } = await payload.count({
          collection: 'inscricoes',
          where: { evento: { equals: evento.id } },
          overrideAccess: true,
        })
        return { evento, totalDocs }
      }),
    )

    opcoes = contagens
      .filter(({ totalDocs }) => totalDocs > 0)
      .map(({ evento, totalDocs }) => {
        const ano = evento.dataInicio ? new Date(evento.dataInicio).getUTCFullYear() : null
        const inscricoes = totalDocs === 1 ? '1 inscrição' : `${totalDocs} inscrições`
        return {
          id: evento.id,
          label: `${evento.nome}${ano ? ` (${ano})` : ''} — ${inscricoes}`,
        }
      })
  } catch {
    // A lista continua funcionando mesmo se a consulta de apoio falhar.
    return null
  }

  if (opcoes.length === 0) return null

  return (
    <section
      style={{
        background: 'var(--theme-elevation-50)',
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: 6,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        marginBottom: 20,
        padding: 16,
      }}
      aria-labelledby="exportar-inscricoes-titulo"
    >
      <div>
        <h2 id="exportar-inscricoes-titulo" style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
          Exportar inscrições
        </h2>
        <p
          style={{
            color: 'var(--theme-elevation-600)',
            fontSize: 13,
            margin: '4px 0 0',
          }}
        >
          Escolha o evento para baixar um CSV com todas as respostas dos atletas. O arquivo inclui
          CPF, telefone, responsável e consentimentos.
        </p>
      </div>

      <form
        method="get"
        action="/api/inscricoes/exportar"
        style={{ alignItems: 'flex-end', display: 'flex', flexWrap: 'wrap', gap: 10 }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 280 }}>
          <label htmlFor="exportar-evento" style={{ fontSize: 12, fontWeight: 600 }}>
            Evento
          </label>
          <select
            id="exportar-evento"
            name="evento"
            required
            style={{
              background: 'var(--theme-elevation-0)',
              border: '1px solid var(--theme-elevation-200)',
              borderRadius: 4,
              color: 'var(--theme-elevation-800)',
              fontSize: 13,
              height: 36,
              padding: '0 10px',
            }}
          >
            {opcoes.map((opcao) => (
              <option key={opcao.id} value={opcao.id}>
                {opcao.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          style={{
            alignItems: 'center',
            background: 'var(--theme-elevation-800)',
            border: 0,
            borderRadius: 4,
            color: 'var(--theme-elevation-0)',
            cursor: 'pointer',
            display: 'inline-flex',
            fontSize: 13,
            fontWeight: 600,
            gap: 8,
            height: 36,
            padding: '0 16px',
          }}
        >
          <span aria-hidden="true">↓</span>
          Exportar CSV
        </button>
      </form>
    </section>
  )
}
