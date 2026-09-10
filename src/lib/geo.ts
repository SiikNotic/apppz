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
const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search'

export interface GeocodeResult {
  lat: number
  lng: number
}

/**
 * Convierte una dirección de texto a coordenadas. Devuelve null si la
 * dirección viene vacía o el proveedor no encuentra nada — nunca fabrica
 * una coordenada.
 */
export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const trimmed = query.trim()
  if (!trimmed) return null

  const url = `${NOMINATIM_ENDPOINT}?format=jsonv2&limit=1&q=${encodeURIComponent(trimmed)}`

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
