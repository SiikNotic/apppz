// Justo después de cada deploy a GitHub Pages, el CDN puede tardar un
// minuto o dos en propagar todos los archivos nuevos a todos sus nodos —
// si alguien carga la app en esa ventana, el navegador puede pedir un
// chunk de JS (código dividido por ruta/componente, ej. los mapas de
// Mapbox que se cargan con next/dynamic) que ese nodo todavía no tiene, y
// React lo reporta como un error de render normal, cayendo en el error
// boundary de turno con un mensaje que no explica nada de esto. No es un
// bug de la app — es refrescar y ya.
export function isChunkLoadError(error: Error): boolean {
  return (
    error.name === 'ChunkLoadError' ||
    /Loading chunk [\w.-]+ failed/i.test(error.message) ||
    /Failed to fetch dynamically imported module/i.test(error.message) ||
    /Importing a module script failed/i.test(error.message)
  )
}

const RELOAD_AT_KEY = 'chunk-error-reload-at'
const COOLDOWN_MS = 10_000

/**
 * Si el error parece ser justo esto, recarga la página sola una vez —
 * nunca en loop: si ya recargó hace menos de COOLDOWN_MS, se rinde y deja
 * que se muestre el error real (evita recargar sin fin si la causa fuera
 * otra). Devuelve true si disparó la recarga (el que llama no debería
 * pintar la tarjeta de error en ese caso, para no mostrarla un instante
 * antes de que la página se vaya).
 */
export function reloadOnceIfChunkError(error: Error): boolean {
  if (typeof window === 'undefined' || !isChunkLoadError(error)) return false
  const lastRaw = window.sessionStorage.getItem(RELOAD_AT_KEY)
  const last = lastRaw ? Number(lastRaw) : 0
  if (Date.now() - last < COOLDOWN_MS) return false
  window.sessionStorage.setItem(RELOAD_AT_KEY, String(Date.now()))
  window.location.reload()
  return true
}
