import 'server-only'
import type { Payload } from 'payload'
import type { Atleta } from '@/payload-types'
import { emailDisponivel, emailFederacao } from '@/lib/email'
import { emailFederacaoCorrecaoNascimento } from '@/lib/email-templates'
import { dataCurta } from '@/lib/format'
import { registrarAcesso } from '@/lib/lgpd/auditoria'

const baseUrl = (): string =>
  (process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000').replace(/\/+$/, '')

const adminUrl = (id: number | string): string =>
  `${baseUrl()}/admin/collections/atletas/${encodeURIComponent(String(id))}`

type InscricaoParaRevisar = { evento: string; idade?: string; protocolo: string }

/**
 * Registra a correção de data de nascimento feita pelo próprio atleta e, se ele
 * já tiver inscrição enviada, avisa a federação.
 *
 * A inscrição guarda `idadeNaInscricao` no momento do envio — corrigir a conta
 * não reescreve esse retrato. Sem o aviso, uma inscrição feita na categoria
 * errada continuaria esperando confirmação sem ninguém olhar.
 *
 * A trilha de auditoria e o e-mail são best-effort: a data já foi gravada e não
 * pode voltar atrás porque o log ou o Resend falhou.
 */
export async function registrarCorrecaoDeNascimento({
  atleta,
  nova,
  payload,
}: {
  atleta: Atleta
  nova: string
  payload: Payload
}): Promise<{ avisada: boolean; inscricoes: number }> {
  const anterior = atleta.dataNascimento

  registrarAcesso({
    acao: 'alteracao',
    colecao: 'atletas',
    documento: atleta.id,
    detalhe: {
      ator: 'atleta',
      campo: 'dataNascimento',
      de: anterior,
      para: nova,
    },
  })

  const inscricoes: InscricaoParaRevisar[] = []
  let total = 0

  try {
    const encontradas = await payload.find({
      collection: 'inscricoes',
      where: { atleta: { equals: atleta.id } },
      depth: 1,
      limit: 10,
      sort: '-enviadaEm',
      overrideAccess: true,
    })

    total = encontradas.totalDocs
    for (const inscricao of encontradas.docs) {
      inscricoes.push({
        evento:
          typeof inscricao.evento === 'object' && inscricao.evento
            ? inscricao.evento.nome
            : 'Evento',
        ...(inscricao.idadeNaInscricao != null
          ? { idade: `${inscricao.idadeNaInscricao} anos` }
          : {}),
        protocolo: inscricao.protocolo,
      })
    }
  } catch (e) {
    console.error('Falha ao listar inscrições para o aviso de correção de nascimento', e)
  }

  if (total === 0 || !emailDisponivel()) return { avisada: false, inscricoes: total }

  try {
    await payload.sendEmail({
      to: emailFederacao(),
      subject: `Correção de data de nascimento — ${atleta.nome}`,
      html: emailFederacaoCorrecaoNascimento({
        adminUrl: adminUrl(atleta.id),
        anterior: dataCurta(anterior),
        atleta: atleta.nome,
        emailAtleta: atleta.email,
        inscricoes,
        nova: dataCurta(nova),
        total,
      }),
    })
    return { avisada: true, inscricoes: total }
  } catch (e) {
    console.error('Falha ao avisar a federação sobre correção de data de nascimento', e)
    return { avisada: false, inscricoes: total }
  }
}
