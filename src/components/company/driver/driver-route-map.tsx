'use client'

// Mapa de ruta del conductor — su propia posición, el punto de recogida
// (restaurant.lat/lng en Configuración) y cada parada de su cola,
// numeradas en el mismo orden que la lista "Siguientes" de la página
// (1 = entrega actual, 2, 3… = cola). Sin precio ni zona de reparto: esta
// app no tiene ese concepto en el esquema — solo lo real: dónde está él,
// dónde recoge, y a dónde va en orden.
//
// La línea entre puntos es recta e ilustrativa, no una ruta real por
// calles (mismo alcance que LiveDeliveryMap del lado del cliente — trazar
// una ruta real necesitaría una API de enrutamiento aparte).
import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useLanguage } from '@/contexts/LanguageContext'
import { MAPBOX_TOKEN, MAPBOX_STYLE } from '@/lib/mapbox'

mapboxgl.accessToken = MAPBOX_TOKEN

interface LatLng {
  lat: number
  lng: number
}

export interface RouteStop extends LatLng {
  id: string
  sequence: number
}

interface DriverRouteMapProps {
  driverPos: LatLng | null
  pickup: LatLng | null
  pickupLabel: string
  stops: RouteStop[]
  heightClassName?: string
}

function markerEl(className: string, content?: string) {
  const el = document.createElement('div')
  el.className = className
  if (content) el.textContent = content
  return el
}

const ROUTE_SOURCE_ID = 'driver-route'

export function DriverRouteMap({ driverPos, pickup, pickupLabel, stops, heightClassName = 'h-64' }: DriverRouteMapProps) {
  const { t } = useLanguage()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const loadedRef = useRef(false)
  const driverMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const pickupMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const stopMarkersRef = useRef<mapboxgl.Marker[]>([])
  const [mapBroken, setMapBroken] = useState(false)
  const canRenderMap = Boolean(MAPBOX_TOKEN) && mapboxgl.supported() && !mapBroken

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !MAPBOX_TOKEN || !mapboxgl.supported()) return
    const initialCenter = driverPos ?? pickup ?? { lat: 19.4326, lng: -99.1332 }
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_STYLE,
      center: [initialCenter.lng, initialCenter.lat],
      zoom: 13,
    })
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
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

  // Pin de recogida — fijo, no cambia con la cola.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    pickupMarkerRef.current?.remove()
    pickupMarkerRef.current = pickup
      ? new mapboxgl.Marker({
          element: markerEl('grid h-9 w-9 place-items-center rounded-full bg-ink-900 text-base shadow-pop ring-2 ring-white', '🏬'),
        })
          .setLngLat([pickup.lng, pickup.lat])
          .setPopup(new mapboxgl.Popup({ offset: 16, closeButton: false }).setText(pickupLabel))
          .addTo(map)
      : null
    return () => {
      pickupMarkerRef.current?.remove()
    }
  }, [pickup, pickupLabel])

  // Paradas numeradas — se reconstruyen cuando cambia la cola.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    stopMarkersRef.current.forEach((m) => m.remove())
    stopMarkersRef.current = stops.map((stop) =>
      new mapboxgl.Marker({
        element: markerEl(
          'grid h-8 w-8 place-items-center rounded-full bg-white text-sm font-extrabold text-ink-900 shadow-pop ring-2 ring-brand-500',
          String(stop.sequence)
        ),
      })
        .setLngLat([stop.lng, stop.lat])
        .addTo(map)
    )
    return () => {
      stopMarkersRef.current.forEach((m) => m.remove())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stops ya viene recalculado por identidad en cada cambio real
  }, [stops])

  // Marcador del propio conductor + línea de ruta (él → recogida →
  // paradas en orden) + encuadre automático a todos los puntos visibles.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (driverPos) {
      if (!driverMarkerRef.current) {
        driverMarkerRef.current = new mapboxgl.Marker({
          element: markerEl('grid h-9 w-9 place-items-center rounded-full bg-brand-500 text-lg shadow-pop ring-2 ring-white', '🛵'),
        })
          .setLngLat([driverPos.lng, driverPos.lat])
          .addTo(map)
      } else {
        driverMarkerRef.current.setLngLat([driverPos.lng, driverPos.lat])
      }
    } else {
      driverMarkerRef.current?.remove()
      driverMarkerRef.current = null
    }

    const points: [number, number][] = [
      driverPos ? ([driverPos.lng, driverPos.lat] as [number, number]) : null,
      pickup ? ([pickup.lng, pickup.lat] as [number, number]) : null,
      ...stops.map((s) => [s.lng, s.lat] as [number, number]),
    ].filter((p): p is [number, number] => p !== null)

    function draw() {
      const source = map!.getSource(ROUTE_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined
      source?.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: points } })
    }
    if (loadedRef.current) draw()
    else map.once('load', draw)

    if (points.length > 1) {
      const bounds = points.reduce((b, p) => b.extend(p), new mapboxgl.LngLatBounds(points[0], points[0]))
      map.fitBounds(bounds, { padding: 48, maxZoom: 15 })
    } else if (points.length === 1) {
      map.easeTo({ center: points[0], zoom: 14 })
    }
  }, [driverPos, pickup, stops])

  if (!canRenderMap) {
    return (
      <div className={`grid w-full place-items-center bg-muted p-4 text-center text-xs text-muted-foreground ${heightClassName}`}>
        {t('deliveryTracking.mapNotConfigured')}
      </div>
    )
  }

  return <div ref={containerRef} className={`w-full ${heightClassName}`} />
}
