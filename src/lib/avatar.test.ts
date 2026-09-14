import { describe, it, expect } from 'vitest'
import { validateAvatarFile, clampPercent, computeCoverCropRect, avatarStoragePath } from './avatar'

function fakeFile(type: string, sizeBytes: number): File {
  return { type, size: sizeBytes } as File
}

describe('validateAvatarFile', () => {
  it('acepta jpeg/png/webp dentro del límite de tamaño', () => {
    expect(validateAvatarFile(fakeFile('image/jpeg', 1024))).toBeNull()
    expect(validateAvatarFile(fakeFile('image/png', 1024))).toBeNull()
    expect(validateAvatarFile(fakeFile('image/webp', 1024))).toBeNull()
  })

  it('rechaza formatos no soportados (gif, pdf, svg)', () => {
    expect(validateAvatarFile(fakeFile('image/gif', 1024))).toBe('invalid-type')
    expect(validateAvatarFile(fakeFile('application/pdf', 1024))).toBe('invalid-type')
    expect(validateAvatarFile(fakeFile('image/svg+xml', 1024))).toBe('invalid-type')
  })

  it('rechaza archivos más pesados que el límite', () => {
    expect(validateAvatarFile(fakeFile('image/jpeg', 9 * 1024 * 1024))).toBe('too-large')
  })
})

describe('clampPercent', () => {
  it('deja pasar valores dentro de 0-100', () => {
    expect(clampPercent(50)).toBe(50)
  })
  it('recorta valores fuera de rango', () => {
    expect(clampPercent(-10)).toBe(0)
    expect(clampPercent(150)).toBe(100)
  })
})

describe('computeCoverCropRect', () => {
  it('imagen cuadrada + marco cuadrado + posición centrada = recorte completo', () => {
    const rect = computeCoverCropRect(400, 400, 200, 50, 50)
    expect(rect).toEqual({ sx: 0, sy: 0, sWidth: 400, sHeight: 400 })
  })

  it('imagen más ancha que alta: en el centro recorta una franja del ancho de altura=naturalHeight', () => {
    // 800x400 en un marco de 200x200: scale = max(200/800, 200/400) = 0.5
    // -> imagen mostrada 400x200, sobra 200px de ancho a repartir según el %.
    const centered = computeCoverCropRect(800, 400, 200, 50, 50)
    expect(centered.sWidth).toBeCloseTo(400) // 200 / 0.5
    expect(centered.sHeight).toBeCloseTo(400)
    expect(centered.sx).toBeCloseTo(200) // (400-200)*0.5 / 0.5 = 200 → centrado en la franja de 800
    expect(centered.sy).toBeCloseTo(0)
  })

  it('positionX=0 ancla el recorte al borde izquierdo de la imagen', () => {
    const left = computeCoverCropRect(800, 400, 200, 0, 50)
    expect(left.sx).toBeCloseTo(0)
  })

  it('positionX=100 ancla el recorte al borde derecho de la imagen', () => {
    const right = computeCoverCropRect(800, 400, 200, 100, 50)
    // ancho mostrado 400, marco 200 -> sobran 200 en pantalla -> /scale(0.5) = 400 de sobra en la imagen original (800-400)
    expect(right.sx).toBeCloseTo(400)
  })

  it('nunca deja que sWidth/sHeight superen las dimensiones naturales', () => {
    const rect = computeCoverCropRect(1000, 600, 300, 20, 80)
    expect(rect.sWidth).toBeLessThanOrEqual(1000)
    expect(rect.sHeight).toBeLessThanOrEqual(600)
    expect(rect.sx + rect.sWidth).toBeLessThanOrEqual(1000 + 0.001)
    expect(rect.sy + rect.sHeight).toBeLessThanOrEqual(600 + 0.001)
  })
})

describe('avatarStoragePath', () => {
  it('siempre la misma ruta por usuario (para pisar, no acumular)', () => {
    const id = '1c47c76c-ab53-4687-9e9a-6bb22b60b190'
    expect(avatarStoragePath(id)).toBe(`${id}/avatar.jpg`)
    expect(avatarStoragePath(id)).toBe(avatarStoragePath(id))
  })
})
