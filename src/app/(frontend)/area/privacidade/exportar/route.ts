import { NextResponse } from 'next/server'
import { decifrar, ehCifrado } from '@/lib/crypto/campos'
import { atletaAtual } from '@/lib/atleta/sessao'
import { inscricoesDoAtleta } from '@/lib/inscricoes/consultas'

export const dynamic = 'force-dynamic'

/** Portabilidade (LGPD art. 18, V): exporta os dados do próprio titular em JSON. */
export async function GET() {
  const atleta = await atletaAtual()
  if (!atleta) {
    return NextResponse.json({ erro: 'Entre na sua conta para exportar.' }, { status: 401 })
  }

  const inscricoes = await inscricoesDoAtleta(atleta.id)

  const dados = {
    formato: 'felpma.dados.v1',
    geradoEm: new Date().toISOString(),
    conta: {
      nome: atleta.nome,
      email: atleta.email,
      cpf: atleta.cpfMascara ?? null,
      dataNascimento: atleta.dataNascimento,
      telefone: atleta.telefone ?? null,
      cidade: atleta.cidade ?? null,
      uf: atleta.uf ?? null,
      criadaEm: atleta.createdAt,
      aceitePrivacidade: atleta.aceitePrivacidade ?? null,
    },
    inscricoes: inscricoes.map((i) => {
      const evento = typeof i.evento === 'object' ? i.evento : null
      const formulario = typeof i.formulario === 'object' ? i.formulario : null
      return {
        protocolo: i.protocolo,
        evento: evento?.nome ?? null,
        formulario: formulario?.titulo ?? null,
        formularioVersao: i.formularioVersao,
        status: i.status,
        enviadaEm: i.enviadaEm,
        respostas: Array.isArray(i.respostas)
          ? i.respostas.map((r) => {
              const item = r as Record<string, unknown>
              // Portabilidade é para o titular: os valores sensíveis saem legíveis aqui.
              if (item.cifrado && typeof item.valor === 'string' && ehCifrado(item.valor)) {
                try {
                  return { ...item, cifrado: false, valor: JSON.parse(decifrar(item.valor)) }
                } catch {
                  return item
                }
              }
              return item
            })
          : i.respostas,
        responsavel: i.responsavel
          ? {
              ...i.responsavel,
              cpf:
                typeof i.responsavel.cpf === 'string' && ehCifrado(i.responsavel.cpf)
                  ? decifrar(i.responsavel.cpf)
                  : i.responsavel.cpf,
            }
          : null,
        consentimentos: (i.consentimentos ?? []).map((c) => ({
          identificador: c.identificador,
          texto: c.texto,
          versao: c.versao,
          obrigatorio: c.obrigatorio,
          aceito: c.aceito,
          aceitoEm: c.aceitoEm,
          revogadoEm: (c as { revogadoEm?: null | string }).revogadoEm ?? null,
        })),
      }
    }),
  }

  return new NextResponse(JSON.stringify(dados, null, 2), {
    headers: {
      'cache-control': 'no-store',
      'content-disposition': 'attachment; filename="felpma-meus-dados.json"',
      'content-type': 'application/json; charset=utf-8',
    },
  })
}
