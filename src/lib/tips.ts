import { supabase } from './supabase'
import { periodStart, type HoursPeriod } from './hours'

/**
 * Propinas por conductor en el período dado — 100% de orders.tip_amount de
 * los pedidos que ese conductor entregó de verdad (delivery_assignments
 * con status='delivered'), nunca un cálculo aparte ni con comisión
 * descontada. Es lo que el administrador consulta en Empleados/Conductores
 * y lo que alimenta el resumen de propinas del propio conductor.
 *
 * Requiere el FK delivery_assignments.order_id -> orders.id para que
 * PostgREST pueda resolver el embed `orders(tip_amount)` de abajo — sin él
 * (como pasaba antes de la migración add_delivery_assignments_order_id_fkey)
 * esta consulta fallaba entera en el servidor y devolvía siempre $0.00 sin
 * ningún error visible, sin importar cuántos pedidos con propina hubiera.
 * `error` ahora se registra en vez de ignorarse para que ese tipo de falla
 * nunca vuelva a quedar invisible.
 */
export async function fetchTipsByDriver(driverIds: string[], period: HoursPeriod): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (driverIds.length === 0) return map

  const since = periodStart(period)
  const { data, error } = await supabase
    .from('delivery_assignments')
    .select('driver_id, delivered_at, orders(tip_amount)')
    .eq('status', 'delivered')
    .in('driver_id', driverIds)
    .gte('delivered_at', since.toISOString())

  if (error) {
    console.error('fetchTipsByDriver:', error.message)
    return map
  }

  for (const row of data ?? []) {
    if (!row.driver_id) continue
    const tip = row.orders?.tip_amount ?? 0
    if (tip <= 0) continue
    map.set(row.driver_id, (map.get(row.driver_id) ?? 0) + tip)
  }
  return map
}

/** Total histórico de propinas por conductor — para el listado de
 *  Conductores, donde no hay selector de período. */
export async function fetchAllTimeTipsByDriver(driverIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (driverIds.length === 0) return map

  const { data, error } = await supabase
    .from('delivery_assignments')
    .select('driver_id, orders(tip_amount)')
    .eq('status', 'delivered')
    .in('driver_id', driverIds)

  if (error) {
    console.error('fetchAllTimeTipsByDriver:', error.message)
    return map
  }

  for (const row of data ?? []) {
    if (!row.driver_id) continue
    const tip = row.orders?.tip_amount ?? 0
    if (tip <= 0) continue
    map.set(row.driver_id, (map.get(row.driver_id) ?? 0) + tip)
  }
  return map
}
