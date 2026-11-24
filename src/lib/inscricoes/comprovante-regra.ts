import type { ArquivoInscricao } from '@/payload-types'
import { CAMPO_COMPROVANTE, STATUS_COM_PENDENCIA } from '@/lib/constants'

/**
 * Regra de comprovante de pagamento compartilhada entre o site e o painel.
 *
 * Este módulo é puro de propósito: a coleção `inscricoes` (configuração do
 * Payload) e as páginas da área do atleta precisam da mesma definição sem criar
 * ciclo com `getPayloadClient`.
 */

/** A situação da inscrição ainda admite cobrança de comprovante? */
export const statusTemPendenciaDeComprovante = (status: string): boolean =>
  (STATUS_COM_PENDENCIA as readonly string[]).includes(status)

/**
 * O arquivo é um comprovante de pagamento?
 *
 * O envio feito pela área do atleta usa o campo técnico fixo. O upload feito
 * dentro do formulário da inscrição pode ter sido criado pelo painel com outro
 * nome técnico; nesse caso vale o rótulo ("Comprovante de pagamento", "Comprovante
 * da taxa"). Exigir "comprovante" + ("pagamento" ou "taxa") evita casar com
 * "comprovante de experiência" ou "comprovante de residência", que não são
 * pagamento.
 */
export const ehComprovantePagamento = (
  arquivo: Pick<ArquivoInscricao, 'campo' | 'rotulo'>,
): boolean => {
  if (arquivo.campo === CAMPO_COMPROVANTE) return true
  const texto = `${arquivo.campo ?? ''} ${arquivo.rotulo ?? ''}`.toLowerCase()
  return texto.includes('comprovante') && (texto.includes('pagamento') || texto.includes('taxa'))
}
