import type { Centro } from '@/payload-types'
import type { PontoMapa } from '@/components/CentrosMap'

export const pontosDosCentros = (centros: Centro[]): PontoMapa[] =>
  centros
    .filter((c) => typeof c.latitude === 'number' && typeof c.longitude === 'number')
    .map((c) => ({
      id: c.id,
      nome: c.nome,
      cidade: c.cidade,
      endereco: c.endereco,
      lat: c.latitude!,
      lng: c.longitude!,
      href: c.slug ? `/centros/${c.slug}` : undefined,
    }))
