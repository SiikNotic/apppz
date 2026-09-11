import { supabase } from './supabase'
import type { Address, DeliveryAssignment, Order } from './types'

export type AssignmentWithOrder = DeliveryAssignment & { order: Order; address: Address | null }

export const ACTIVE_STATUSES = ['assigned', 'en_route'] as const
export const CLOSED_STATUSES = ['delivered', 'failed'] as const

/**
 * Entregas de un conductor con su pedido y dirección ya resueltos —
 * compartido entre /company/driver (cola activa) y
 * /company/driver/earnings (historial para el desglose de propinas), para
 * no mantener dos copias de la misma consulta.
 */
export async function fetchAssignmentsWithOrders(
  statuses: readonly DeliveryAssignment['status'][],
  driverId: string
): Promise<AssignmentWithOrder[]> {
  const { data: assignments } = await supabase
    .from('delivery_assignments')
    .select('*')
    .eq('driver_id', driverId)
    .in('status', statuses)
    .order('assigned_at', { ascending: false })

  const rows = assignments ?? []
  if (rows.length === 0) return []

  const orderIds = rows.map((a) => a.order_id)
  const { data: orders } = await supabase.from('orders').select('*').in('id', orderIds)
  const ordersById = new Map((orders ?? []).map((o) => [o.id, o]))

  const addressIds = (orders ?? []).map((o) => o.address_id).filter((id): id is string => !!id)
  const { data: addresses } =
    addressIds.length > 0
      ? await supabase.from('addresses').select('*').in('id', addressIds)
      : { data: [] }
  const addressesById = new Map((addresses ?? []).map((a) => [a.id, a]))

  return rows
    .map((a) => {
      const order = ordersById.get(a.order_id) as Order
      return { ...a, order, address: order?.address_id ? (addressesById.get(order.address_id) ?? null) : null }
    })
    .filter((a) => !!a.order)
    // Orden de la cola: preferencia manual del conductor (route_order) si
    // la hay, si no por cuándo se le asignó. No es una optimización de
    // ruta por distancia real — este proyecto no guarda coordenadas de
    // las direcciones todavía (el campo lat/lng de `addresses` existe
    // pero nada lo llena hoy), así que "más cercano" no se puede calcular
    // de verdad sin antes agregar geocoding. Ver nota en el chat.
    .sort((a, b) => {
      if (a.route_order != null && b.route_order != null) return a.route_order - b.route_order
      if (a.route_order != null) return -1
      if (b.route_order != null) return 1
      return new Date(a.assigned_at).getTime() - new Date(b.assigned_at).getTime()
    })
}
