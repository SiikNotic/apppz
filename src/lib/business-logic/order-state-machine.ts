import type { OrderStatus } from '@/lib/types'

/**
 * Espejo en el cliente de la tabla order_status_transitions +
 * el trigger validate_order_status_transition() en Postgres. Se usa solo
 * para decidir qué botones mostrar habilitados en la UI — la verdad
 * autoritativa es el trigger de base de datos, que rechaza cualquier
 * transición inválida sin importar lo que mande el cliente.
 */
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['out_for_delivery', 'delivered', 'cancelled'],
  out_for_delivery: ['delivered', 'failed'],
  delivered: ['refunded'],
  cancelled: ['refunded'],
  refunded: [],
  failed: ['refunded'],
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false
}

export function nextHappyPathStatus(current: OrderStatus): OrderStatus | null {
  const happyPath: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered']
  const index = happyPath.indexOf(current)
  if (index === -1 || index === happyPath.length - 1) return null
  return happyPath[index + 1]
}

export function isTerminalStatus(status: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[status]?.length === 0 || status === 'delivered'
}
