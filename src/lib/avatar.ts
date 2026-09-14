// Lógica pura de fotos de perfil (validación de archivo + matemática del
// recorte) — separada del componente de UI (avatar-upload.tsx) para que
// se pueda probar sin DOM/canvas, igual que el resto de business-logic/.
// La subida real (Supabase Storage) y el dibujo en <canvas> sí necesitan
// el navegador y viven en el componente.

export const MAX_AVATAR_FILE_BYTES = 8 * 1024 * 1024 // 8MB del archivo ORIGINAL, antes de recomprimir
export const ACCEPTED_AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const
export const AVATAR_OUTPUT_SIZE = 512 // lado del cuadrado final subido, siempre el mismo

export type AvatarFileError = 'invalid-type' | 'too-large'

/** null = archivo válido para intentar procesar. */
export function validateAvatarFile(file: File): AvatarFileError | null {
  if (!ACCEPTED_AVATAR_TYPES.includes(file.type as (typeof ACCEPTED_AVATAR_TYPES)[number])) {
    return 'invalid-type'
  }
  if (file.size > MAX_AVATAR_FILE_BYTES) {
    return 'too-large'
  }
  return null
}

export function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value))
}

/**
 * Rectángulo (en píxeles de la imagen ORIGINAL) que hay que recortar para
 * que el resultado sea idéntico a lo que se ve en la vista previa, que usa
 * CSS `object-fit: cover` + `object-position: {positionXPercent}%
 * {positionYPercent}%` dentro de un marco cuadrado de `frameSize` px.
 *
 * Deducción: con cover, la imagen se escala por
 * `scale = max(frameSize/naturalWidth, frameSize/naturalHeight)` (para
 * cubrir el marco sin dejar bordes) y se centra según object-position:
 * en X%=0 el borde izquierdo de la imagen escalada coincide con el marco,
 * en X%=100 el borde derecho coincide, y en el medio se interpola. El
 * offset visible en el marco es entonces
 * `offset = (imagenEscalada - frameSize) * (percent/100)`, y dividiendo
 * por `scale` se vuelve a coordenadas de la imagen original.
 */
export function computeCoverCropRect(
  naturalWidth: number,
  naturalHeight: number,
  frameSize: number,
  positionXPercent: number,
  positionYPercent: number
): { sx: number; sy: number; sWidth: number; sHeight: number } {
  const scale = Math.max(frameSize / naturalWidth, frameSize / naturalHeight)
  const displayedWidth = naturalWidth * scale
  const displayedHeight = naturalHeight * scale

  const offsetX = (displayedWidth - frameSize) * (clampPercent(positionXPercent) / 100)
  const offsetY = (displayedHeight - frameSize) * (clampPercent(positionYPercent) / 100)

  return {
    sx: offsetX / scale,
    sy: offsetY / scale,
    sWidth: frameSize / scale,
    sHeight: frameSize / scale,
  }
}

/** Ruta fija por usuario (siempre el mismo nombre/extensión, ver
 *  avatar-upload.tsx: el recorte siempre se recomprime a JPEG) — subir de
 *  nuevo pisa el archivo anterior en vez de acumular uno por cada cambio
 *  de foto, y "quitar" borra exactamente esta ruta. */
export function avatarStoragePath(userId: string): string {
  return `${userId}/avatar.jpg`
}
