export const NAV_PRINCIPAL = [
  { href: '/noticias', label: 'Notícias' },
  { href: '/calendario', label: 'Calendário' },
  { href: '/eventos', label: 'Eventos' },
  { href: '/convocacoes', label: 'Convocações' },
  { href: '/resultados', label: 'Resultados' },
  { href: '/centros', label: 'Centros de Treinamento' },
  { href: '/federacao', label: 'A Federação' },
] as const

export const NAV_TOPO = [
  { href: '/transparencia', label: 'Transparência' },
  { href: '/documentos', label: 'Documentos' },
  { href: '/contato', label: 'Contato' },
] as const

export const isAtivo = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(href + '/')
