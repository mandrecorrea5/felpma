import type { Centro } from '@/payload-types'
import type { PontoMapa } from '@/components/CentrosMap'

// Última barreira antes do Leaflet: um centro com coordenada impossível fica de
// fora do mapa em vez de travar a página inteira.
const coordenadaNoMundo = (lat: number, lng: number) =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180

export const pontosDosCentros = (centros: Centro[]): PontoMapa[] =>
  centros
    .filter(
      (c) =>
        typeof c.latitude === 'number' &&
        typeof c.longitude === 'number' &&
        coordenadaNoMundo(c.latitude, c.longitude),
    )
    .map((c) => ({
      id: c.id,
      nome: c.nome,
      cidade: c.cidade,
      endereco: c.endereco,
      lat: c.latitude!,
      lng: c.longitude!,
      href: c.slug ? `/centros/${c.slug}` : undefined,
    }))
