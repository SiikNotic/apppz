import { supabase } from './supabase'
import { periodStart, type HoursPeriod } from './hours'

/**
 * Propinas por conductor en el período dado — 100% de orders.tip_amount de
 * los pedidos que ese conductor entregó de verdad (delivery_assignments
 * con status='delivered'), nunca un cálculo aparte ni con comisión
 * descontada. Es lo que el administrador consulta en Empleados/Conductores
 * y lo que alimenta el resumen de propinas del propio conductor.
 */
export async function fetchTipsByDriver(driverIds: string[], period: HoursPeriod): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (driverIds.length === 0) return map

  const since = periodStart(period)
  const { data } = await supabase
    .from('delivery_assignments')
    .select('driver_id, delivered_at, orders(tip_amount)')
    .eq('status', 'delivered')
    .in('driver_id', driverIds)
    .gte('delivered_at', since.toISOString())

  for (const row of data ?? []) {
    if (!row.driver_id) continue
    const tip = (row as unknown as { orders: { tip_amount: number } | null }).orders?.tip_amount ?? 0
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

  const { data } = await supabase
    .from('delivery_assignments')
    .select('driver_id, orders(tip_amount)')
    .eq('status', 'delivered')
    .in('driver_id', driverIds)

  for (const row of data ?? []) {
    if (!row.driver_id) continue
    const tip = (row as unknown as { orders: { tip_amount: number } | null }).orders?.tip_amount ?? 0
    if (tip <= 0) continue
    map.set(row.driver_id, (map.get(row.driver_id) ?? 0) + tip)
  }
  return map
}
