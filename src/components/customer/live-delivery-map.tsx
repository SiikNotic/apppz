'use client'

// Mapa en vivo de la entrega: pines fijos de restaurante y destino, más
// un marcador de repartidor que se mueve conforme llegan actualizaciones
// de drivers.current_lat/current_lng (ver useDriverLocationSharing en el
// lado del repartidor). La línea punteada entre los tres puntos es una
// línea recta ilustrativa, NO una ruta real por calles — trazar la ruta
// real requeriría una API de enrutamiento aparte (costo/proveedor extra
// que no se justificaba solo para esto).
//
// Usa Leaflet + tiles de OpenStreetMap — no Mapbox: Mapbox exige una
// cuenta con correo "de trabajo" (rechaza correos personales), lo cual
// bloqueaba poder configurar esto. Leaflet/OSM no piden cuenta ni token.
// Se importa siempre vía next/dynamic con ssr:false (ver order/page.tsx)
// porque Leaflet necesita `window`, y esta app usa export estático —
// evaluarlo durante el build rompería el prerenderizado.
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/contexts/LanguageContext'

interface LatLng {
  lat: number
  lng: number
}

interface LiveDeliveryMapProps {
  driverId: string
  restaurant: LatLng | null
  destination: LatLng | null
}

function dotIcon(className: string, emoji?: string) {
  return L.divIcon({
    className: 'border-0 bg-transparent',
    html: `<div class="${className}">${emoji ?? ''}</div>`,
    iconSize: emoji ? [36, 36] : [16, 16],
    iconAnchor: emoji ? [18, 18] : [8, 8],
  })
}

const RESTAURANT_ICON = dotIcon('grid h-4 w-4 place-items-center rounded-full bg-brand-500 ring-2 ring-white shadow-pop')
const DESTINATION_ICON = dotIcon('grid h-4 w-4 place-items-center rounded-full bg-ink-900 ring-2 ring-white shadow-pop')
const DRIVER_ICON = dotIcon('grid h-9 w-9 place-items-center rounded-full bg-brand-500 text-lg shadow-pop', '🛵')

export function LiveDeliveryMap({ driverId, restaurant, destination }: LiveDeliveryMapProps) {
  const { t } = useLanguage()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const driverMarkerRef = useRef<L.Marker | null>(null)
  const routeLineRef = useRef<L.Polyline | null>(null)
  const [driverPos, setDriverPos] = useState<LatLng | null>(null)

  // Posición inicial (última conocida en la DB) + suscripción en vivo.
  useEffect(() => {
    let active = true
    supabase
      .from('drivers')
      .select('current_lat, current_lng')
      .eq('user_id', driverId)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data?.current_lat != null && data?.current_lng != null) {
          setDriverPos({ lat: data.current_lat, lng: data.current_lng })
        }
      })

    const channel = supabase
      .channel(`driver-location-${driverId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'drivers', filter: `user_id=eq.${driverId}` },
        (payload) => {
          const row = payload.new as { current_lat: number | null; current_lng: number | null }
          if (row.current_lat != null && row.current_lng != null) {
            setDriverPos({ lat: row.current_lat, lng: row.current_lng })
          }
        }
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [driverId])

  // Inicializa el mapa una sola vez.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const initialCenter = destination ?? restaurant ?? { lat: 19.4326, lng: -99.1332 }
    const map = L.map(containerRef.current, { zoomControl: true }).setView([initialCenter.lat, initialCenter.lng], 13)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo se inicializa una vez
  }, [])

  // Pines fijos: restaurante (recogida) y destino (entrega).
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const markers: L.Marker[] = []
    if (restaurant) markers.push(L.marker([restaurant.lat, restaurant.lng], { icon: RESTAURANT_ICON }).addTo(map))
    if (destination) markers.push(L.marker([destination.lat, destination.lng], { icon: DESTINATION_ICON }).addTo(map))
    return () => markers.forEach((m) => m.remove())
  }, [restaurant, destination])

  // Marcador móvil del repartidor + línea punteada + encuadre automático.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !driverPos) return

    if (!driverMarkerRef.current) {
      driverMarkerRef.current = L.marker([driverPos.lat, driverPos.lng], { icon: DRIVER_ICON }).addTo(map)
    } else {
      driverMarkerRef.current.setLatLng([driverPos.lat, driverPos.lng])
    }

    const points: [number, number][] = [
      restaurant ? ([restaurant.lat, restaurant.lng] as [number, number]) : null,
      [driverPos.lat, driverPos.lng],
      destination ? ([destination.lat, destination.lng] as [number, number]) : null,
    ].filter((p): p is [number, number] => p !== null)

    if (routeLineRef.current) {
      routeLineRef.current.setLatLngs(points)
    } else {
      routeLineRef.current = L.polyline(points, { color: '#f2601c', weight: 3, dashArray: '6 6' }).addTo(map)
    }

    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15 })
    }
  }, [driverPos, restaurant, destination])

  return (
    <div className="overflow-hidden rounded-3xl border border-border">
      <div ref={containerRef} className="h-64 w-full" />
      {!driverPos && (
        <p className="bg-card p-3 text-center text-xs text-muted-foreground">{t('deliveryTracking.waitingLocation')}</p>
      )}
    </div>
  )
}
