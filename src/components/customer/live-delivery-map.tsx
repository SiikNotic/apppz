'use client'

// Mapa en vivo de la entrega: pines fijos de restaurante y destino, más
// un marcador de repartidor que se mueve conforme llegan actualizaciones
// de drivers.current_lat/current_lng (ver useDriverLocationSharing en el
// lado del repartidor). La línea punteada entre los tres puntos es una
// línea recta ilustrativa, NO una ruta real por calles — trazar la ruta
// real requeriría una API de enrutamiento aparte (costo/proveedor extra
// que no se justificaba solo para esto).
//
// Se importa siempre vía next/dynamic con ssr:false (ver order/page.tsx)
// porque mapbox-gl necesita `window`, y esta app usa export estático —
// evaluarlo durante el build rompería el prerenderizado.
import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { supabase } from '@/lib/supabase'
import { MAPBOX_TOKEN } from '@/lib/mapbox'
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

export function LiveDeliveryMap({ driverId, restaurant, destination }: LiveDeliveryMapProps) {
  const { t } = useLanguage()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const driverMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const styleLoadedRef = useRef(false)
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
    if (!containerRef.current || mapRef.current || !MAPBOX_TOKEN) return
    mapboxgl.accessToken = MAPBOX_TOKEN
    const initialCenter = destination ?? restaurant ?? { lat: 19.4326, lng: -99.1332 }
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [initialCenter.lng, initialCenter.lat],
      zoom: 13,
    })
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
    map.on('load', () => {
      map.addSource('delivery-route', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} },
      })
      map.addLayer({
        id: 'delivery-route',
        type: 'line',
        source: 'delivery-route',
        paint: { 'line-color': '#f2601c', 'line-width': 3, 'line-dasharray': [2, 2] },
      })
      styleLoadedRef.current = true
    })
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      styleLoadedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo se inicializa una vez
  }, [])

  // Pines fijos: restaurante (recogida) y destino (entrega).
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const markers: mapboxgl.Marker[] = []
    if (restaurant) {
      markers.push(new mapboxgl.Marker({ color: '#f2601c' }).setLngLat([restaurant.lng, restaurant.lat]).addTo(map))
    }
    if (destination) {
      markers.push(new mapboxgl.Marker({ color: '#171310' }).setLngLat([destination.lng, destination.lat]).addTo(map))
    }
    return () => markers.forEach((m) => m.remove())
  }, [restaurant, destination])

  // Marcador móvil del repartidor + línea punteada + encuadre automático.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !driverPos) return

    if (!driverMarkerRef.current) {
      const el = document.createElement('div')
      el.setAttribute('aria-hidden', 'true')
      el.className = 'grid h-9 w-9 place-items-center rounded-full bg-brand-500 text-lg shadow-pop'
      el.textContent = '🛵'
      driverMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([driverPos.lng, driverPos.lat])
        .addTo(map)
    } else {
      driverMarkerRef.current.setLngLat([driverPos.lng, driverPos.lat])
    }

    const points: [number, number][] = [
      restaurant ? ([restaurant.lng, restaurant.lat] as [number, number]) : null,
      [driverPos.lng, driverPos.lat],
      destination ? ([destination.lng, destination.lat] as [number, number]) : null,
    ].filter((p): p is [number, number] => p !== null)

    if (styleLoadedRef.current) {
      const source = map.getSource('delivery-route') as mapboxgl.GeoJSONSource | undefined
      source?.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: points }, properties: {} })
    }

    if (points.length > 1) {
      const bounds = new mapboxgl.LngLatBounds(points[0], points[0])
      points.forEach((p) => bounds.extend(p))
      map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 500 })
    }
  }, [driverPos, restaurant, destination])

  if (!MAPBOX_TOKEN) return null

  return (
    <div className="overflow-hidden rounded-3xl border border-border">
      <div ref={containerRef} className="h-64 w-full" />
      {!driverPos && (
        <p className="bg-card p-3 text-center text-xs text-muted-foreground">{t('deliveryTracking.waitingLocation')}</p>
      )}
    </div>
  )
}
