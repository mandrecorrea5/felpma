/** Opções compartilhadas entre o CMS e o site. */

export const TIPOS_COMPETICAO = [
  { label: 'Estadual (FELPMA)', value: 'estadual' },
  { label: 'Regional', value: 'regional' },
  { label: 'Nacional', value: 'nacional' },
  { label: 'Internacional', value: 'internacional' },
  { label: 'Curso / capacitação', value: 'curso' },
  { label: 'Evento', value: 'evento' },
] as const

export type TipoCompeticao = (typeof TIPOS_COMPETICAO)[number]['value']

/** Agrupamento usado nos filtros e nas cores do calendário (legenda do design). */
export const GRUPO_POR_TIPO: Record<TipoCompeticao, 'estadual' | 'nacional' | 'eventos'> = {
  estadual: 'estadual',
  regional: 'nacional',
  nacional: 'nacional',
  internacional: 'nacional',
  curso: 'eventos',
  evento: 'eventos',
}

export const ROTULO_TIPO: Record<TipoCompeticao, string> = {
  estadual: 'Estadual',
  regional: 'Regional',
  nacional: 'Nacional',
  internacional: 'Internacional',
  curso: 'Curso',
  evento: 'Evento',
}

export const STATUS_COMPETICAO = [
  { label: 'Automático (pelas datas)', value: 'auto' },
  { label: 'Inscrições abertas', value: 'inscricoes-abertas' },
  { label: 'Convocação publicada', value: 'convocacao-publicada' },
  { label: 'Em breve', value: 'em-breve' },
  { label: 'Em andamento', value: 'em-andamento' },
  { label: 'Encerrado', value: 'encerrado' },
  { label: 'Adiado', value: 'adiado' },
  { label: 'Cancelado', value: 'cancelado' },
] as const

export const CATEGORIAS_NOTICIA = [
  { label: 'Competições', value: 'competicoes' },
  { label: 'Seleção', value: 'selecao' },
  { label: 'Filiação', value: 'filiacao' },
  { label: 'Arbitragem', value: 'arbitragem' },
  { label: 'Base', value: 'base' },
  { label: 'Institucional', value: 'institucional' },
] as const

export const CATEGORIAS_DOCUMENTO = [
  { label: 'Estatuto e regimentos', value: 'estatuto' },
  { label: 'Regulamentos', value: 'regulamento' },
  { label: 'Formulários', value: 'formulario' },
  { label: 'Atas e assembleias', value: 'ata' },
  { label: 'Editais e notas oficiais', value: 'edital' },
  { label: 'Prestação de contas', value: 'prestacao-contas' },
  { label: 'Convênios e parcerias', value: 'convenio' },
  { label: 'Calendário oficial', value: 'calendario' },
  { label: 'Outros', value: 'outros' },
] as const

/** Categorias que aparecem na página de Transparência. */
export const CATEGORIAS_TRANSPARENCIA = ['prestacao-contas', 'convenio', 'ata', 'estatuto'] as const

export const TAGS_CENTRO = [
  { label: 'Iniciação', value: 'iniciacao' },
  { label: 'Base', value: 'base' },
  { label: 'Alto rendimento', value: 'alto-rendimento' },
  { label: 'Paradesporto', value: 'paradesporto' },
  { label: 'Projeto social', value: 'projeto-social' },
  { label: 'Master', value: 'master' },
] as const

export const CATEGORIAS_IDADE = [
  { label: 'Sub-13', value: 'sub13' },
  { label: 'Sub-15', value: 'sub15' },
  { label: 'Sub-17', value: 'sub17' },
  { label: 'Sub-20', value: 'sub20' },
  { label: 'Sub-23', value: 'sub23' },
  { label: 'Sênior', value: 'senior' },
  { label: 'Master', value: 'master' },
] as const

export const SEXOS = [
  { label: 'Feminino', value: 'F' },
  { label: 'Masculino', value: 'M' },
] as const

export const MOVIMENTOS = [
  { label: 'Arranco', value: 'arranco' },
  { label: 'Arremesso', value: 'arremesso' },
  { label: 'Total', value: 'total' },
] as const

export const GRUPOS_DIRETORIA = [
  { label: 'Diretoria executiva', value: 'diretoria' },
  { label: 'Conselho fiscal', value: 'conselho-fiscal' },
  { label: 'Comissão de arbitragem', value: 'arbitragem' },
  { label: 'Comissão técnica', value: 'tecnica' },
  { label: 'Comissão de atletas', value: 'atletas' },
] as const

export const TIPOS_CONVOCACAO = [
  { label: 'Atletas', value: 'atletas' },
  { label: 'Técnicos', value: 'tecnicos' },
  { label: 'Árbitros', value: 'arbitros' },
] as const

export const labelOf = <T extends readonly { label: string; value: string }[]>(
  options: T,
  value: string | null | undefined,
): string => options.find((o) => o.value === value)?.label ?? value ?? ''
