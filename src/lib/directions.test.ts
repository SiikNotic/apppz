import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchRoadRoute, distanceMeters, distanceToRouteMeters } from './directions'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('distanceMeters', () => {
  it('es 0 para el mismo punto', () => {
    expect(distanceMeters({ lat: 19.4326, lng: -99.1332 }, { lat: 19.4326, lng: -99.1332 })).toBe(0)
  })

  it('da ~111km por cada grado de latitud (aprox. esperado de Haversine)', () => {
    const d = distanceMeters({ lat: 19.0, lng: -99.0 }, { lat: 20.0, lng: -99.0 })
    expect(d).toBeGreaterThan(110_000)
    expect(d).toBeLessThan(112_000)
  })
})

describe('distanceToRouteMeters', () => {
  it('es 0 cuando el punto coincide con un vértice de la ruta', () => {
    const coords: [number, number][] = [
      [-99.1332, 19.4326],
      [-99.13, 19.43],
    ]
    expect(distanceToRouteMeters({ lat: 19.4326, lng: -99.1332 }, coords)).toBe(0)
  })

  it('devuelve la distancia mínima al vértice más cercano, no al primero', () => {
    const coords: [number, number][] = [
      [-99.2, 19.5], // lejos
      [-99.1332, 19.4326], // exacto
    ]
    expect(distanceToRouteMeters({ lat: 19.4326, lng: -99.1332 }, coords)).toBe(0)
  })

  it('Infinity para una ruta vacía', () => {
    expect(distanceToRouteMeters({ lat: 19.4326, lng: -99.1332 }, [])).toBe(Infinity)
  })
})

describe('fetchRoadRoute', () => {
  const origin = { lat: 19.4326, lng: -99.1332 }
  const destination = { lat: 19.44, lng: -99.14 }

  it('null si hay menos de 2 puntos o falta el token', async () => {
    expect(await fetchRoadRoute([origin], 'token')).toBeNull()
    expect(await fetchRoadRoute([origin, destination], '')).toBeNull()
  })

  it('devuelve coordinates/distance/duration de la primera ruta de la respuesta', async () => {
    const coords = [
      [-99.1332, 19.4326],
      [-99.135, 19.435],
      [-99.14, 19.44],
    ]
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          routes: [{ geometry: { coordinates: coords }, distance: 1500, duration: 240 }],
        }),
      })
    )

    const result = await fetchRoadRoute([origin, destination], 'pk.test')
    expect(result).toEqual({ coordinates: coords, distanceMeters: 1500, durationSeconds: 240 })
  })

  it('null si la respuesta HTTP no es ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    expect(await fetchRoadRoute([origin, destination], 'pk.test')).toBeNull()
  })

  it('null si la respuesta no trae rutas ni geometría válida', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ routes: [] }) })
    )
    expect(await fetchRoadRoute([origin, destination], 'pk.test')).toBeNull()
  })

  it('null si fetch lanza (red caída, etc.) — nunca fabrica una geometría de reemplazo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    expect(await fetchRoadRoute([origin, destination], 'pk.test')).toBeNull()
  })
})
