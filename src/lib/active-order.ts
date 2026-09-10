// Recordar el último pedido en localStorage es lo que permite que un
// cliente cierre la pestaña/app y, al volver a abrirla, siga viendo cómo
// va su pedido sin tener que buscar el link — funciona incluso para
// invitados sin cuenta, porque no depende de la sesión de Supabase.
const KEY = 'nero_last_order_id'

// Evento propio en `window`: el evento nativo `storage` del navegador solo
// dispara en OTRAS pestañas, nunca en la que hizo el cambio — sin esto,
// ActiveOrderBanner (que ya está montado en el layout compartido) no se
// enteraba de un pedido nuevo recién creado ni de un logout hasta que la
// página se recargaba sola.
const CHANGE_EVENT = 'nero:active-order-changed'

function notifyChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function onActiveOrderChanged(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(CHANGE_EVENT, handler)
  return () => window.removeEventListener(CHANGE_EVENT, handler)
}

export function saveLastOrderId(orderId: string) {
  try {
    localStorage.setItem(KEY, orderId)
  } catch {
    // Almacenamiento no disponible (privado/bloqueado) — no es crítico.
  }
  notifyChanged()
}

export function getLastOrderId(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function clearLastOrderId() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // no-op
  }
  notifyChanged()
}
