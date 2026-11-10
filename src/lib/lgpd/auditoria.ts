import type { CollectionConfig, PayloadRequest } from 'payload'
import { pseudonimizar } from '@/lib/crypto/campos'

/**
 * Trilha de auditoria de acesso a dado pessoal (LGPD art. 46, §2º).
 *
 * Sem `import 'server-only'` de propósito: este módulo é importado pela config
 * da coleção `Atletas`, e a CLI do Payload (`migrate:create`, `payload run`)
 * roda fora do runtime do Next — ali o marcador `server-only` lança e quebra
 * a geração de migrations. O módulo só usa `console` e o hash de campos, sem
 * segredo que justifique a barreira de build.
 *
 * O dado sensível já está cifrado no banco, mas cifra não responde "quem abriu
 * o atestado do atleta X na terça". A resposta sai daqui: uma linha JSON por
 * acesso do painel, no stdout do container — que o promtail já coleta e manda
 * para o Loki. Consultável por `audit="acesso_dado_pessoal"`.
 *
 * Por que log e não tabela: o schema deste projeto é aplicado por migrations em
 * produção (`push: false`). Criar coleção nova exigiria migration gerada contra
 * um banco atualizado, e hoje o Postgres de dev não existe nesta máquina —
 * gerar às cegas é como se quebra uma subida. Log estruturado entrega a trilha
 * sem esse risco; trocar por tabela depois é um passo separado e seguro.
 */

type Acao = 'alteracao' | 'exclusao' | 'expurgo' | 'leitura'

type Evento = {
  acao: Acao
  colecao: string
  detalhe?: Record<string, unknown>
  documento?: number | string
  ipHash?: string
  usuario?: number | string
}

/** Nunca lança: auditoria não pode derrubar a operação que ela observa. */
export function registrarAcesso(evento: Evento): void {
  try {
    console.info(
      JSON.stringify({
        audit: 'acesso_dado_pessoal',
        em: new Date().toISOString(),
        ...evento,
      }),
    )
  } catch {
    // console indisponível — perder a linha é melhor do que perder a operação.
  }
}

/** IP pseudonimizado, no mesmo formato usado na prova de consentimento. */
const ipDaRequisicao = (req: PayloadRequest): string | undefined => {
  try {
    const headers = (req as { headers?: Headers }).headers
    const encaminhado = headers?.get('x-forwarded-for')
    const ip = encaminhado?.split(',')[0]?.trim() || headers?.get('x-real-ip') || ''
    return ip ? pseudonimizar(ip) : undefined
  } catch {
    // Sem LGPD_HASH_SALT em produção `pseudonimizar` lança; a trilha continua,
    // só sem o campo de origem.
    return undefined
  }
}

type EntradaDoHook = {
  args?: { id?: number | string }
  operation?: string
  req: PayloadRequest
  result?: unknown
}

/**
 * O tipo do hook não é exportado por `payload`; este alias pega a forma exata
 * que `CollectionConfig.hooks.afterOperation` espera.
 */
type HookDeOperacao = NonNullable<
  NonNullable<CollectionConfig['hooks']>['afterOperation']
>[number]

/**
 * Hook de `afterOperation` para coleções com dado pessoal.
 *
 * Só registra sessão do PAINEL (`collection === 'users'`). Leitura do próprio
 * atleta e chamadas internas com `overrideAccess` (sem `req.user`) ficam de
 * fora de propósito: a trilha é sobre operador acessando dado de terceiro.
 */
export const auditarAcesso = (colecao: string): HookDeOperacao => {
  const hook = async (entrada: EntradaDoHook) => {
    const usuario = entrada.req.user as
      | { collection?: string; id?: number | string }
      | null
      | undefined

    if (usuario?.collection !== 'users') return entrada.result

    const operacao = entrada.operation ?? ''
    const acao: Acao =
      operacao === 'read'
        ? 'leitura'
        : operacao === 'delete'
          ? 'exclusao'
          : operacao === 'update'
            ? 'alteracao'
            : 'alteracao'

    const id = entrada.args?.id
    const ipHash = ipDaRequisicao(entrada.req)
    const total =
      entrada.result && typeof entrada.result === 'object' && 'totalDocs' in entrada.result
        ? Number((entrada.result as { totalDocs: number }).totalDocs)
        : undefined

    registrarAcesso({
      acao,
      colecao,
      ...(id != null ? { documento: id } : {}),
      ...(total != null ? { detalhe: { registros: total } } : {}),
      ...(ipHash ? { ipHash } : {}),
      ...(usuario.id != null ? { usuario: usuario.id } : {}),
    })

    return entrada.result
  }

  return hook as unknown as HookDeOperacao
}
