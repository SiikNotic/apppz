'use client'

// Mapa en vivo de la entrega — la pieza visual central de la pantalla de
// seguimiento. Pines fijos de restaurante y destino, más un marcador de
// repartidor que se mueve conforme llegan actualizaciones de
// drivers.current_lat/current_lng (ver useDriverLocationSharing en el
// lado del repartidor, ya throttleado a ~5s). La línea entre los tres
// puntos es una línea recta ilustrativa, NO una ruta real por calles —
// trazar la ruta real requeriría una API de enrutamiento aparte
// (costo/proveedor extra que no se justificaba solo para esto).
//
// La cámara solo se reencuadra una vez al llegar la primera posición del
// repartidor y de nuevo si cambian los pines de restaurante/destino —
// nunca en cada tick de GPS (mismo criterio que driver-route-map.tsx del
// lado del conductor): reencuadrar cada 5s se sentía nervioso y no aporta
// nada si el cliente ya está mirando el mapa.
//
// Usa Mapbox GL JS (ver src/lib/mapbox.ts para el token/estilo). Se
// importa siempre vía next/dynamic con ssr:false (ver order/page.tsx)
// porque Mapbox GL necesita `window`, y esta app usa export estático —
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
  heightClassName?: string
}

function markerEl(className: string, emoji?: string) {
  const el = document.createElement('div')
  el.className = className
  if (emoji) el.textContent = emoji
  return el
}

const ROUTE_SOURCE_ID = 'live-delivery-route'

export function LiveDeliveryMap({ driverId, restaurant, destination, heightClassName = 'h-72 lg:h-96' }: LiveDeliveryMapProps) {
  const { t } = useLanguage()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const loadedRef = useRef(false)
  const restaurantMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const destinationMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const driverMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const driverPosRef = useRef<LatLng | null>(null)
  const hasFitRef = useRef(false)
  const [driverPos, setDriverPos] = useState<LatLng | null>(null)
  const [mapBroken, setMapBroken] = useState(false)
  // El token puede estar bien pero el navegador no soportar WebGL (o
  // bloquearlo) — mapboxgl.supported() lo detecta antes de intentar
  // crear el mapa, en vez de dejar un canvas en blanco sin explicación.
  const canRenderMap = Boolean(MAPBOX_TOKEN) && mapboxgl.supported() && !mapBroken

  useEffect(() => {
    driverPosRef.current = driverPos
  }, [driverPos])

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

  // Inicializa el mapa una sola vez. mapboxgl.Map lanza una excepción
  // síncrona (no solo un warning) si accessToken viene vacío — sin este
  // guard, un token mal configurado rompía la pantalla entera contra el
  // error boundary genérico en vez de mostrar un aviso claro acá.
  useEffect(() => {
    if (!containerRef.current || mapRef.current || !MAPBOX_TOKEN || !mapboxgl.supported()) return
    const initialCenter = destination ?? restaurant ?? { lat: 19.4326, lng: -99.1332 }
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_STYLE,
      center: [initialCenter.lng, initialCenter.lat],
      zoom: 13,
    })
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
    // Un estilo/token inválido o un fallo de red no lanzan excepción acá
    // — Mapbox lo reporta por este evento. Sin escucharlo, el mapa se
    // queda en un canvas en blanco sin ninguna pista de qué pasó.
    map.on('error', (e) => {
      console.error('[Mapbox]', e.error)
      setMapBroken(true)
    })
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
        paint: { 'line-color': '#ff4433', 'line-width': 3, 'line-dasharray': [2, 2] },
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
          element: markerEl('grid h-9 w-9 place-items-center rounded-full bg-brand-500 text-base shadow-pop ring-2 ring-white', '🏬'),
        })
          .setLngLat([restaurant.lng, restaurant.lat])
          .addTo(map)
      : null
    destinationMarkerRef.current = destination
      ? new mapboxgl.Marker({
          element: markerEl('grid h-9 w-9 place-items-center rounded-full bg-white text-base shadow-pop ring-2 ring-brand-500', '📍'),
        })
          .setLngLat([destination.lng, destination.lat])
          .addTo(map)
      : null
    return () => {
      restaurantMarkerRef.current?.remove()
      destinationMarkerRef.current?.remove()
    }
  }, [restaurant, destination])

  // Redibuja la línea (restaurante → repartidor → destino) — barato, solo
  // actualiza datos de una fuente GeoJSON. Devuelve los puntos usados por
  // si además hace falta reencuadrar la cámara.
  function redrawLine(): [number, number][] {
    const map = mapRef.current
    const pos = driverPosRef.current
    const points: [number, number][] = [
      restaurant ? ([restaurant.lng, restaurant.lat] as [number, number]) : null,
      pos ? ([pos.lng, pos.lat] as [number, number]) : null,
      destination ? ([destination.lng, destination.lat] as [number, number]) : null,
    ].filter((p): p is [number, number] => p !== null)
    function draw() {
      const source = map!.getSource(ROUTE_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined
      source?.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: points } })
    }
    if (map) {
      if (loadedRef.current) draw()
      else map.once('load', draw)
    }
    return points
  }

  function fitToPoints(points: [number, number][]) {
    const map = mapRef.current
    if (!map) return
    if (points.length > 1) {
      const bounds = points.reduce((b, p) => b.extend(p), new mapboxgl.LngLatBounds(points[0], points[0]))
      map.fitBounds(bounds, { padding: 48, maxZoom: 15 })
    } else if (points.length === 1) {
      map.easeTo({ center: points[0], zoom: 14 })
    }
  }

  // Marcador móvil del repartidor — corre en cada actualización de GPS
  // (ya throttleada a ~5s). Solo mueve el pin y redibuja la línea; NUNCA
  // toca la cámara acá (ver nota grande arriba del archivo).
  useEffect(() => {
    const map = mapRef.current
    if (!map || !driverPos) return
    if (!driverMarkerRef.current) {
      driverMarkerRef.current = new mapboxgl.Marker({
        element: markerEl('grid h-9 w-9 place-items-center rounded-full bg-brand-500 text-lg shadow-pop ring-2 ring-white', '🛵'),
      })
        .setLngLat([driverPos.lng, driverPos.lat])
        .addTo(map)
    } else {
      driverMarkerRef.current.setLngLat([driverPos.lng, driverPos.lat])
    }
    redrawLine()
  }, [driverPos])

  // Encuadre inicial — en cuanto se conoce la posición del repartidor por
  // primera vez.
  useEffect(() => {
    if (!driverPos || hasFitRef.current || !mapRef.current) return
    hasFitRef.current = true
    fitToPoints(redrawLine())
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe correr al llegar la primera posición
  }, [driverPos])

  // Reencuadre cuando cambia QUÉ hay que mostrar (restaurante o destino)
  // — no en cada tick de GPS.
  useEffect(() => {
    if (!hasFitRef.current) return
    fitToPoints(redrawLine())
    // eslint-disable-next-line react-hooks/exhaustive-deps -- redrawLine/fitToPoints se recrean cada render, no deben disparar esto
  }, [restaurant, destination])

  if (!canRenderMap) {
    return (
      <div className={`grid w-full place-items-center rounded-2xl border border-border bg-muted p-4 text-center text-xs text-muted-foreground ${heightClassName}`}>
        {t('deliveryTracking.mapNotConfigured')}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border shadow-card">
      <div ref={containerRef} className={`w-full ${heightClassName}`} />
      {!driverPos && (
        <p className="bg-card p-3 text-center text-xs text-muted-foreground">{t('deliveryTracking.waitingLocation')}</p>
      )}
    </div>
  )
}
