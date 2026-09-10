// Geocodificación de direcciones — Mapbox Geocoding API v6, con el
// mismo token público del mapa (ver src/lib/mapbox.ts). Antes usaba
// Nominatim (OpenStreetMap) porque Mapbox rechazaba cuentas con correo
// personal; ese bloqueo ya no aplica con la cuenta actual del cliente.
import { MAPBOX_TOKEN } from './mapbox'

const FORWARD_ENDPOINT = 'https://api.mapbox.com/search/geocode/v6/forward'
const REVERSE_ENDPOINT = 'https://api.mapbox.com/search/geocode/v6/reverse'

export interface GeocodeResult {
  lat: number
  lng: number
}

export interface ReverseGeocodeResult {
  street: string
  city: string
  state: string
  zip: string
}

interface MapboxContext {
  address?: { name?: string; address_number?: string; street_name?: string }
  street?: { name?: string }
  postcode?: { name?: string }
  place?: { name?: string }
  district?: { name?: string }
  region?: { name?: string }
}

interface MapboxFeature {
  geometry?: { coordinates?: [number, number] }
  properties?: { name?: string; context?: MapboxContext }
}

/**
 * Convierte una dirección de texto a coordenadas. Devuelve null si la
 * dirección viene vacía o el proveedor no encuentra nada — nunca fabrica
 * una coordenada.
 */
export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const trimmed = query.trim()
  if (!trimmed) return null

  const url = `${FORWARD_ENDPOINT}?q=${encodeURIComponent(trimmed)}&limit=1&access_token=${MAPBOX_TOKEN}`

  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const feature: MapboxFeature | undefined = data?.features?.[0]
    const coords = feature?.geometry?.coordinates
    if (!coords) return null
    const [lng, lat] = coords
    return { lat, lng }
  } catch {
    return null
  }
}

/**
 * Convierte un punto del mapa a una dirección aproximada (calle, ciudad,
 * estado, código postal) para prellenar el formulario cuando el cliente
 * elige su ubicación tocando el mapa en vez de escribir la dirección a
 * mano. Es un punto de partida editable, no un dato final — el cliente
 * siempre puede corregir cualquier campo antes de guardar.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  const url = `${REVERSE_ENDPOINT}?longitude=${lng}&latitude=${lat}&access_token=${MAPBOX_TOKEN}`

  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const feature: MapboxFeature | undefined = data?.features?.[0]
    const ctx = feature?.properties?.context
    if (!ctx) return null
    const street =
      ctx.address?.name ||
      [ctx.address?.address_number, ctx.address?.street_name || ctx.street?.name].filter(Boolean).join(' ') ||
      feature?.properties?.name ||
      ''
    return {
      street,
      city: ctx.place?.name || ctx.district?.name || '',
      state: ctx.region?.name || '',
      zip: ctx.postcode?.name || '',
    }
  } catch {
    return null
  }
}
