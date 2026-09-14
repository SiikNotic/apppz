// Ruta real por calles — Mapbox Directions API, el mismo proveedor y el
// mismo token público que ya usa el resto del mapa (geocoding en geo.ts,
// renderizado en mapbox.ts) — no se agrega ningún proveedor nuevo. Antes
// DriverRouteMap y LiveDeliveryMap dibujaban una LineString recta entre
// los puntos ("línea recta ilustrativa"); esto reemplaza esa línea por
// la geometría real que Mapbox calcula siguiendo calles/vueltas/
// intersecciones.
//
// No importa geo.ts a propósito, aunque ahí ya existe la misma fórmula de
// Haversine (distanceKm): geo.ts importa el cliente de Supabase, que
// lanza si faltan las env vars — arrastrarlo acá volvería este módulo
// imposible de testear sin esas variables (mismo motivo por el que
// avatar.ts mantiene su lógica pura separada del componente que sí toca
// Supabase). Se duplica la fórmula, no el módulo entero.

export interface LatLng {
  lat: number
  lng: number
}

export interface RoadRoute {
  /** [lng, lat] en el mismo orden que Mapbox las devuelve — listas para
   *  usar directo como coordinates de un GeoJSON LineString, sin decodificar
   *  nada más: se pide con geometries=geojson a propósito (en vez de
   *  polyline/polyline6) para no depender de una librería extra solo para
   *  decodificar una polilínea. */
  coordinates: [number, number][]
  distanceMeters: number
  durationSeconds: number
}

const DIRECTIONS_ENDPOINT = 'https://api.mapbox.com/directions/v5/mapbox/driving'

/**
 * Ruta real entre 2+ puntos, en el orden dado (Mapbox no reordena
 * waypoints salvo que se lo pidas explícitamente, y acá nunca se pide).
 * Devuelve null si el proveedor no encuentra una ruta o la petición
 * falla — nunca fabrica una geometría de reemplazo; quien llama decide
 * cómo mostrar "ruta no disponible" en vez de inventar una línea acá.
 */
export async function fetchRoadRoute(points: LatLng[], token: string): Promise<RoadRoute | null> {
  if (points.length < 2 || !token) return null
  const coordsParam = points.map((p) => `${p.lng},${p.lat}`).join(';')
  const url = `${DIRECTIONS_ENDPOINT}/${coordsParam}?geometries=geojson&overview=full&access_token=${token}`

  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const route = data?.routes?.[0]
    const coordinates = route?.geometry?.coordinates
    if (!Array.isArray(coordinates) || coordinates.length < 2) return null
    return {
      coordinates: coordinates as [number, number][],
      distanceMeters: typeof route.distance === 'number' ? route.distance : 0,
      durationSeconds: typeof route.duration === 'number' ? route.duration : 0,
    }
  } catch {
    return null
  }
}

/** Haversine en metros — misma fórmula que distanceKm (geo.ts), duplicada
 *  a propósito (ver nota de imports arriba) para no arrastrar el cliente
 *  de Supabase a un módulo que debe poder importarse sin esas env vars. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6_371_000
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/**
 * Distancia mínima de un punto a cualquier vértice de una polilínea —
 * aproximación barata de "qué tan lejos está de la ruta trazada" (sin
 * proyectar sobre cada segmento) para detectar un desvío real. Con la
 * densidad de vértices que devuelve Mapbox con overview=full (un punto
 * cada pocos metros en calles reales) alcanza para este propósito: no es
 * geometría exacta de "distancia a una línea", es "qué tan cerca pasó el
 * conductor de algún punto por el que la ruta sí pasa".
 */
export function distanceToRouteMeters(point: LatLng, coordinates: [number, number][]): number {
  let min = Infinity
  for (const [lng, lat] of coordinates) {
    const d = distanceMeters(point, { lat, lng })
    if (d < min) min = d
  }
  return min
}
