import 'server-only'
import { redirect } from 'next/navigation'
import type { Atleta } from '@/payload-types'
import { atletaAtual } from './sessao'

/** Exige sessão de atleta; manda para o login guardando para onde voltar. */
export async function exigirAtleta(retorno = '/area'): Promise<Atleta> {
  const atleta = await atletaAtual()
  if (!atleta) redirect(`/area/entrar?retorno=${encodeURIComponent(retorno)}`)
  return atleta
}
