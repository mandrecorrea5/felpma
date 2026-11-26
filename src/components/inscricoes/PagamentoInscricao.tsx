import { BotaoCopiar } from '@/components/BotaoCopiar'

const reais = (valor: number): string =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/**
 * Caixa de pagamento da inscrição.
 *
 * Dá destaque ao que o atleta precisa para pagar: o valor e a chave Pix, com
 * botão de copiar. Só aparece quando há algo para mostrar — evento gratuito sem
 * chave não ganha caixa vazia.
 *
 * Quando a taxa varia por categoria/modalidade (`valorVariaPorModalidade`), o
 * valor único não é exibido: ele vale só para parte dos inscritos e, em
 * destaque, passa a impressão de preço fixo. A tabela de taxas fica nas
 * instruções do formulário, e a escolha da modalidade logo abaixo.
 */
export function PagamentoInscricao({
  pixChave,
  pixTitular,
  valor,
  valorVariaPorModalidade = false,
}: {
  pixChave?: null | string
  pixTitular?: null | string
  valor?: null | number
  valorVariaPorModalidade?: boolean
}) {
  const valorNumerico = Number(valor ?? 0)
  const chave = pixChave?.trim() ?? ''
  const destacarValor = valorNumerico > 0 && !valorVariaPorModalidade
  if (!destacarValor && !valorVariaPorModalidade && !chave) return null

  return (
    <section className="pagamento" aria-labelledby="pagamento-titulo">
      <div className="pagamento__cabecalho">
        <h2 id="pagamento-titulo">Pagamento da inscrição</h2>
        {destacarValor ? <strong>{reais(valorNumerico)}</strong> : null}
      </div>

      {valorVariaPorModalidade ? (
        <p className="pagamento__ajuda" style={{ margin: 0 }}>
          <strong>O valor depende da sua categoria e modalidade.</strong> Confira a tabela de
          taxas nas instruções acima e escolha a opção correspondente em{' '}
          <strong>Situação do atleta</strong>, no formulário.
        </p>
      ) : null}

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
