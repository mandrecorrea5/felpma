'use client'

import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'

export type PontoMapa = {
  id: number | string
  nome: string
  cidade: string
  endereco?: string | null
  lat: number
  lng: number
  href?: string
}

// Centro aproximado do Maranhão
const CENTRO_MA: [number, number] = [-5.2, -45.0]

/** Mapa dos CTs com OpenStreetMap (sem chave de API). */
export function CentrosMap({
  pontos,
  className = 'mapa',
  zoomUnico = 14,
}: {
  pontos: PontoMapa[]
  className?: string
  zoomUnico?: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let map: import('leaflet').Map | undefined
    let cancelled = false
    ;(async () => {
      const L = (await import('leaflet')).default
      if (cancelled || !ref.current) return
      map = L.map(ref.current, { scrollWheelZoom: false, attributionControl: true })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map)

      const icon = L.divIcon({
        className: '',
        html: '<div class="mapa-pin"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      })
      const esc = (s: string) =>
        s.replace(
          /[&<>"']/g,
          (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
        )

      const markers = pontos.map((p) =>
        L.marker([p.lat, p.lng], { icon, title: p.nome, alt: p.nome })
          .addTo(map!)
          .bindPopup(
            `<strong>${esc(p.nome)}</strong>${p.endereco ? esc(p.endereco) + '<br>' : ''}${esc(p.cidade)}${
              p.href ? `<br><a href="${p.href}">Ver detalhes</a>` : ''
            }`,
          ),
      )

      if (markers.length === 1) map.setView([pontos[0].lat, pontos[0].lng], zoomUnico)
      else if (markers.length > 1)
        map.fitBounds(L.featureGroup(markers).getBounds(), { padding: [32, 32], maxZoom: 13 })
      else map.setView(CENTRO_MA, 6)
    })()
    return () => {
      cancelled = true
      map?.remove()
    }
  }, [pontos, zoomUnico])

  return (
    <div className={className}>
      <div
        ref={ref}
        style={{ position: 'absolute', inset: 0 }}
        role="region"
        aria-label="Mapa dos centros de treinamento"
      />
      {pontos.length === 0 ? (
        <div className="mapa__vazio">
          Os CTs aparecem no mapa quando têm latitude e longitude cadastradas.
        </div>
      ) : null}
    </div>
  )
}
