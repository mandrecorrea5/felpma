import 'server-only'
import { expurgarInscricoesVencidas } from './expurgo'

/**
 * Agendador do expurgo dentro do processo do site.
 *
 * O container é um único processo Node de vida longa — não há worker nem cron
 * no serviço `site`. Um intervalo diário aqui resolve sem infra nova. Se o dia
 * chegar a múltiplas réplicas, isto vira job externo: duas réplicas tentando
 * apagar o mesmo lote não corrompem nada (o `delete` é por id), mas é
 * desperdício e a trilha sai duplicada.
 */

const INTERVALO_MS = 24 * 60 * 60 * 1000
const ESPERA_INICIAL_MS = 2 * 60 * 1000

let agendado = false

/** Timer não pode segurar o processo vivo (build, shutdown). */
const semSegurarProcesso = (timer: unknown): void => {
  if (timer && typeof timer === 'object' && 'unref' in timer) {
    ;(timer as { unref: () => void }).unref()
  }
}

export function agendarExpurgo(): void {
  if (agendado) return
  agendado = true

  const executar = async (): Promise<void> => {
    try {
      const resultado = await expurgarInscricoesVencidas()
      if (resultado.inscricoes > 0 || resultado.arquivos > 0) {
        console.info(
          `[lgpd] expurgo: ${resultado.inscricoes} inscrição(ões) e ${resultado.arquivos} arquivo(s) eliminados`,
        )
      }
    } catch (e) {
      // Rejeição não tratada derruba o processo em Node 20.
      console.error('[lgpd] falha no expurgo automático', e)
    }
  }

  // Espera o Payload terminar de inicializar (as migrations rodam no init)
  // antes da primeira passada. Depois, uma vez por dia.
  const inicial = setTimeout(() => {
    void executar()
    semSegurarProcesso(setInterval(() => void executar(), INTERVALO_MS))
  }, ESPERA_INICIAL_MS)
  semSegurarProcesso(inicial)
}
