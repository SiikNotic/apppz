// Helper mínimo para Mapbox — usado por la tarjeta "Ubicación del
// restaurante" (Configuración) y por el seguimiento en vivo del cliente.
//
// El token es público a propósito (NEXT_PUBLIC_*): los tokens públicos de
// Mapbox están pensados para vivir en el bundle del navegador, igual que
// el anon key de Supabase — no es un secreto que proteger.
export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

export interface GeocodeResult {
  lat: number
  lng: number
}

/**
 * Convierte una dirección de texto a coordenadas vía la API de
 * geocodificación de Mapbox. Devuelve null si no hay token configurado,
 * la dirección viene vacía, o el proveedor no encuentra nada — nunca
 * fabrica una coordenada.
 */
export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const trimmed = query.trim()
  if (!MAPBOX_TOKEN || !trimmed) return null

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmed)}.json?limit=1&access_token=${MAPBOX_TOKEN}`

  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const center = data?.features?.[0]?.center as [number, number] | undefined
    if (!center) return null
    const [lng, lat] = center
    return { lat, lng }
  } catch {
    return null
  }
}
