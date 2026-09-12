// Geocodificación de direcciones — Mapbox Geocoding API v6, con el
// mismo token público del mapa (ver src/lib/mapbox.ts). Antes usaba
// Nominatim (OpenStreetMap) porque Mapbox rechazaba cuentas con correo
// personal; ese bloqueo ya no aplica con la cuenta actual del cliente.
import { supabase } from './supabase'
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
 * Coordenadas del punto de entrega de un pedido: usa addresses.lat/lng si
 * ya se calcularon antes, si no geocodifica el texto guardado en el
 * pedido y lo persiste en la dirección para no repetir la llamada la
 * próxima vez que alguien necesite este mismo punto — el cliente
 * rastreando su pedido (order/page.tsx) o el conductor viendo su ruta
 * (DriverRouteMap) comparten esta misma resolución, antes vivía
 * duplicada solo en order/page.tsx.
 */
export async function resolveDeliveryLocation(order: {
  address_id: string | null
  address: string | null
}): Promise<GeocodeResult | null> {
  if (order.address_id) {
    const { data: addr } = await supabase.from('addresses').select('*').eq('id', order.address_id).maybeSingle()
    if (addr?.lat != null && addr?.lng != null) return { lat: addr.lat, lng: addr.lng }
    const geocoded = await geocodeAddress(order.address || '')
    // Si quien llama es un conductor (no el dueño de la dirección), RLS no
    // deja escribir aquí (solo el cliente dueño o un RPC pueden) — el
    // update simplemente no afecta filas, sin error. El valor geocodificado
    // se devuelve igual, solo no queda cacheado para la próxima vez.
    if (geocoded && addr) {
      await supabase.from('addresses').update({ lat: geocoded.lat, lng: geocoded.lng }).eq('id', addr.id)
    }
    return geocoded
  }
  if (order.address) return geocodeAddress(order.address)
  return null
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
