/**
 * Texto padrão do edital de competição da FELP-MA.
 *
 * Os campos do painel começam preenchidos com este conteúdo (o mesmo do edital
 * de referência da federação) e podem ser ajustados a cada competição. Os
 * placeholders `{ano}`, `{titulo}`, `{data}`, `{local}`, `{cidade}`,
 * `{inscricoesDe}`, `{inscricoesAte}` e `{emailInscricao}` são trocados na
 * geração do PDF.
 */

export const ABERTURA_PADRAO =
  'A presidente da Federação de Levantamento de Peso do Maranhão (FELP-MA) torna público o edital de convocação para a {titulo}.'

export const DISPOSICOES_PADRAO =
  'O campeonato será regido pelas normas deste edital e executado pela Federação Esportiva de Levantamento de Peso do Estado do Maranhão FELP-MA.'

export const REQUISITOS_PADRAO = [
  {
    texto:
      'Os atletas devem enquadrar-se em uma das CATEGORIA DE PESO definidas no tópico 4 ("categorias") deste edital.',
  },
  {
    texto:
      'Os atletas devem enquadrar-se em uma das CATEGORIA DE IDADE definidas no tópico 4 ("categorias") deste edital.',
  },
  {
    texto:
      'A PREMIAÇÃO GERAL (melhores atletas da competição masculino e feminino) será contabilizada com os resultados dos atletas inscritos nas CATEGORIAS DE IDADE ADULTO.',
  },
  {
    texto:
      'Para os atletas SUB-17, SUB-20 e Master que desejarem participar da premiação de melhor atleta da competição, deverão realizar a inscrição em 2 categorias: a categoria oficial (de acordo com a data de nascimento) e a categoria adicional (adulto).',
  },
  { texto: 'Atestado médico de aptidão física emitido até 90 dias antes do evento.' },
  {
    texto:
      'Em caso de atletas menores de idade é necessária a apresentação de autorização escrita do(s) responsável(is) para competição.',
  },
]

export const CATEGORIAS_IDADE_PADRAO = [
  { nome: 'Infantil', descricao: 'até 12 anos completos no ano de {ano}' },
  {
    nome: 'Juvenil (Sub 17)',
    descricao: 'a partir de 13 até 17 anos completos no ano de {ano}',
  },
  {
    nome: 'Junior (Sub 20)',
    descricao: 'a partir de 15 até 20 anos completos no ano de {ano}',
  },
  {
    nome: 'Sênior (Adulto)',
    descricao: 'a partir de 16 anos completos no ano de {ano}',
  },
  {
    nome: 'Master 30+',
    descricao: 'a partir de 30 anos até 39 anos completos em {ano}',
  },
  {
    nome: 'Master 40+',
    descricao: 'a partir de 40 anos até 49 anos completos em {ano}',
  },
  {
    nome: 'Master 50+',
    descricao: 'a partir de 50 anos até 59 anos completos em {ano}',
  },
  { nome: 'Master 60+', descricao: 'a partir de 60 anos completos em {ano}' },
]

export const CATEGORIAS_PESO_PADRAO = [
  {
    titulo: 'CATEGORIAS DE PESO INFANTIL (SUB-12)',
    linhas: [
      { masculino: '35 kg', feminino: '35 kg' },
      { masculino: '40 kg', feminino: '40 kg' },
      { masculino: '+40 kg', feminino: '+40 kg' },
    ],
  },
  {
    titulo: 'CATEGORIAS DE PESO JUVENIL (SUB-17), JUNIOR (SUB-20), SENIOR (ADULTO) E MASTER',
    linhas: [
      { masculino: '56 kg', feminino: '44 kg' },
      { masculino: '60 kg', feminino: '48 kg' },
      { masculino: '65 kg', feminino: '53 kg' },
      { masculino: '71 kg', feminino: '58 kg' },
      { masculino: '79 kg', feminino: '63 kg' },
      { masculino: '88 kg', feminino: '69 kg' },
      { masculino: '98 kg', feminino: '77 kg' },
      { masculino: '110 kg', feminino: '86 kg' },
      { masculino: '+110 kg', feminino: '+86 kg' },
    ],
  },
]

export const INSCRICOES_TEXTO_PADRAO = `As inscrições devem ser realizadas no período de {inscricoesDe} a {inscricoesAte}.

As inscrições serão feitas pelos atletas e/ou treinadores.

Atletas federados e não federados devem inscrever-se com a Federação de Levantamento de Peso do Maranhão por meio do formulário eletrônico, efetuar o pagamento da inscrição e enviar o comprovante de pagamento descrevendo no e-mail o NOME COMPLETO DO ATLETA, a CATEGORIA DE IDADE e o PESO DA INSCRIÇÃO para o e-mail {emailInscricao}.

Todas as inscrições realizadas por este método só serão dadas como válidas após o envio do e-mail de confirmação por parte da comissão de inscrições.

O valor da taxa de inscrição será de:`

export const INSCRICOES_REGRAS_PADRAO = [
  {
    texto:
      'Alterações nos pesos iniciais de inscrição podem ser feitas somente até o prazo final das inscrições. Não é permitida a alteração de categorias de peso.',
  },
  {
    texto:
      'Inscrições realizadas por outros meios que não sejam o indicado neste edital serão desconsideradas, bem como aquelas que não preencham os requisitos aqui informados (ausência de dados pessoais, fora de data etc.).',
  },
  {
    texto:
      'Não haverá devolução de valores de inscrição no caso de irregularidades na mesma ou desistência do atleta.',
  },
]

export const TAXAS_PADRAO = [
  { categoria: 'Infantil e juvenil*', federado: 'R$ 100,00', naoFederado: 'R$ 200,00' },
  { categoria: 'Junior, adulto e master', federado: 'R$ 100,00', naoFederado: 'R$ 200,00' },
  { categoria: 'TREINADOR', federado: 'R$ 100,00', naoFederado: 'R$ 100,00' },
]

export const OBSERVACAO_TAXAS_PADRAO =
  '*atletas de projetos sociais, mesmo não federados, terão como taxa de inscrição o valor de R$ 100,00, pagos por transferência para a conta bancária disponibilizada no formulário e anexado no formulário de inscrição.'

export const REGRAS_PADRAO =
  'Serão utilizadas as regras de competição e pesagem regulamentadas no manual de regras e regulamentos técnicos de competição da International Weightlifting Federation (IWF).'

export const DIREITOS_IMAGEM_PADRAO =
  'Os participantes do campeonato autorizam, desde o ato de sua inscrição ou participação, a utilização de sua imagem pela FELP-MA.'
