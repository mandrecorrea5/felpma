import { BotaoCopiar } from '@/components/BotaoCopiar'

const reais = (valor: number): string =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/**
 * Caixa de pagamento da inscrição.
 *
 * Dá destaque ao que o atleta precisa para pagar: o valor e a chave Pix, com
 * botão de copiar. Só aparece quando há algo para mostrar — evento gratuito sem
 * chave não ganha caixa vazia.
 */
export function PagamentoInscricao({
  pixChave,
  pixTitular,
  valor,
}: {
  pixChave?: null | string
  pixTitular?: null | string
  valor?: null | number
}) {
  const valorNumerico = Number(valor ?? 0)
  const chave = pixChave?.trim() ?? ''
  if (!(valorNumerico > 0) && !chave) return null

  return (
    <section className="pagamento" aria-labelledby="pagamento-titulo">
      <div className="pagamento__cabecalho">
        <h2 id="pagamento-titulo">Pagamento da inscrição</h2>
        {valorNumerico > 0 ? <strong>{reais(valorNumerico)}</strong> : null}
      </div>

      {chave ? (
        <>
          <p className="pagamento__rotulo">Chave Pix</p>
          <div className="pagamento__chave">
            <span id="pix-chave-valor">{chave}</span>
            <BotaoCopiar texto={chave} rotulo="Copiar chave" />
          </div>
          {pixTitular?.trim() ? (
            <p className="pagamento__titular">Titular: {pixTitular.trim()}</p>
          ) : null}
        </>
      ) : null}

      <p className="pagamento__ajuda">
        Faça o Pix e anexe o comprovante ao final da inscrição. Se preferir pagar depois, dá para
        enviar em <strong>Área do atleta › Comprovantes</strong> — um comprovante só vale por todas
        as suas inscrições nesta competição.
      </p>
    </section>
  )
}
