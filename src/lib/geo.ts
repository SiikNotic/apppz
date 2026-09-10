// Geocodificación de direcciones — usa Nominatim (OpenStreetMap), no
// Mapbox: Mapbox exige una cuenta con correo "de trabajo" y rechaza
// correos personales (gmail, etc.), lo cual bloqueaba por completo poder
// configurar esto. Nominatim no pide cuenta ni API key.
//
// Política de uso de Nominatim (https://operations.osmfoundation.org/policies/nominatim/):
// máximo ~1 solicitud/segundo y se debe poder identificar la app que
// llama. Desde el navegador no se puede sobreescribir el header
// User-Agent (los navegadores lo bloquean por seguridad), así que la
// identificación real es el header Referer que el navegador ya manda
// solo — suficiente para este volumen (una geocodificación por
// dirección nueva, con el resultado guardado después para no repetirla).
const NOMINATIM_SEARCH_ENDPOINT = 'https://nominatim.openstreetmap.org/search'
const NOMINATIM_REVERSE_ENDPOINT = 'https://nominatim.openstreetmap.org/reverse'

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

/**
 * Convierte una dirección de texto a coordenadas. Devuelve null si la
 * dirección viene vacía o el proveedor no encuentra nada — nunca fabrica
 * una coordenada.
 */
export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const trimmed = query.trim()
  if (!trimmed) return null

  const url = `${NOMINATIM_SEARCH_ENDPOINT}?format=jsonv2&limit=1&q=${encodeURIComponent(trimmed)}`

  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const result = data?.[0]
    if (!result?.lat || !result?.lon) return null
    return { lat: Number(result.lat), lng: Number(result.lon) }
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
  const url = `${NOMINATIM_REVERSE_ENDPOINT}?format=jsonv2&lat=${lat}&lon=${lng}`

  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const addr = data?.address
    if (!addr) return null
    const street = [addr.road, addr.house_number].filter(Boolean).join(' ')
    return {
      street: street || data.display_name || '',
      city: addr.city || addr.town || addr.village || addr.county || '',
      state: addr.state || '',
      zip: addr.postcode || '',
    }
  } catch {
    return null
  }
}
