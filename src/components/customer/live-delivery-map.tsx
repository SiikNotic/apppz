'use client'

// Mapa en vivo de la entrega: pines fijos de restaurante y destino, más
// un marcador de repartidor que se mueve conforme llegan actualizaciones
// de drivers.current_lat/current_lng (ver useDriverLocationSharing en el
// lado del repartidor). La línea punteada entre los tres puntos es una
// línea recta ilustrativa, NO una ruta real por calles — trazar la ruta
// real requeriría una API de enrutamiento aparte (costo/proveedor extra
// que no se justificaba solo para esto).
//
// Usa Mapbox GL JS (ver src/lib/mapbox.ts para el token). Se importa
// siempre vía next/dynamic con ssr:false (ver order/page.tsx) porque
// Mapbox GL necesita `window`, y esta app usa export estático —
// evaluarlo durante el build rompería el prerenderizado.
import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/contexts/LanguageContext'
import { MAPBOX_TOKEN, MAPBOX_STYLE } from '@/lib/mapbox'

mapboxgl.accessToken = MAPBOX_TOKEN

interface LatLng {
  lat: number
  lng: number
}

interface LiveDeliveryMapProps {
  driverId: string
  restaurant: LatLng | null
  destination: LatLng | null
}

function markerEl(className: string, emoji?: string) {
  const el = document.createElement('div')
  el.className = className
  if (emoji) el.textContent = emoji
  return el
}

const ROUTE_SOURCE_ID = 'live-delivery-route'

export function LiveDeliveryMap({ driverId, restaurant, destination }: LiveDeliveryMapProps) {
  const { t } = useLanguage()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const loadedRef = useRef(false)
  const restaurantMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const destinationMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const driverMarkerRef = useRef<mapboxgl.Marker | null>(null)
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
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_STYLE,
      center: [initialCenter.lng, initialCenter.lat],
      zoom: 13,
    })
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
    map.on('load', () => {
      loadedRef.current = true
      map.addSource(ROUTE_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } },
      })
      map.addLayer({
        id: ROUTE_SOURCE_ID,
        type: 'line',
        source: ROUTE_SOURCE_ID,
        paint: { 'line-color': '#f2601c', 'line-width': 3, 'line-dasharray': [2, 2] },
      })
    })
    mapRef.current = map

    return () => {
      loadedRef.current = false
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo se inicializa una vez
  }, [])

  // Pines fijos: restaurante (recogida) y destino (entrega).
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    restaurantMarkerRef.current?.remove()
    destinationMarkerRef.current?.remove()
    restaurantMarkerRef.current = restaurant
      ? new mapboxgl.Marker({
          element: markerEl('grid h-4 w-4 place-items-center rounded-full bg-brand-500 ring-2 ring-white shadow-pop'),
        })
          .setLngLat([restaurant.lng, restaurant.lat])
          .addTo(map)
      : null
    destinationMarkerRef.current = destination
      ? new mapboxgl.Marker({
          element: markerEl('grid h-4 w-4 place-items-center rounded-full bg-ink-900 ring-2 ring-white shadow-pop'),
        })
          .setLngLat([destination.lng, destination.lat])
          .addTo(map)
      : null
    return () => {
      restaurantMarkerRef.current?.remove()
      destinationMarkerRef.current?.remove()
    }
  }, [restaurant, destination])

  // Marcador móvil del repartidor + línea punteada + encuadre automático.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !driverPos) return

    if (!driverMarkerRef.current) {
      driverMarkerRef.current = new mapboxgl.Marker({
        element: markerEl('grid h-9 w-9 place-items-center rounded-full bg-brand-500 text-lg shadow-pop', '🛵'),
      })
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

    function drawRoute() {
      // map ya se validó no-null arriba — TS no propaga ese narrowing
      // dentro de una función anidada, de ahí el non-null assertion.
      const source = map!.getSource(ROUTE_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined
      source?.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: points } })
    }
    if (loadedRef.current) drawRoute()
    else map.once('load', drawRoute)

    if (points.length > 1) {
      const bounds = points.reduce(
        (b, p) => b.extend(p),
        new mapboxgl.LngLatBounds(points[0], points[0])
      )
      map.fitBounds(bounds, { padding: 40, maxZoom: 15 })
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
