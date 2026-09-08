// Recordar el último pedido en localStorage es lo que permite que un
// cliente cierre la pestaña/app y, al volver a abrirla, siga viendo cómo
// va su pedido sin tener que buscar el link — funciona incluso para
// invitados sin cuenta, porque no depende de la sesión de Supabase.
const KEY = 'nero_last_order_id'

export function saveLastOrderId(orderId: string) {
  try {
    localStorage.setItem(KEY, orderId)
  } catch {
    // Almacenamiento no disponible (privado/bloqueado) — no es crítico.
  }
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
}
