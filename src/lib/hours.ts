import { supabase } from './supabase'

export type HoursPeriod = 'day' | 'week' | 'month' | 'year'

/** Inicio del período (hora local) — semana empieza en lunes. */
export function periodStart(period: HoursPeriod, now: Date = new Date()): Date {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  if (period === 'day') return d
  if (period === 'week') {
    const day = d.getDay() // 0 = domingo
    const diffToMonday = day === 0 ? 6 : day - 1
    d.setDate(d.getDate() - diffToMonday)
    return d
  }
  if (period === 'month') {
    d.setDate(1)
    return d
  }
  d.setMonth(0, 1)
  return d
}

interface ShiftRow {
  clock_in_at: string
  clock_out_at: string | null
}

function sumHours(shifts: ShiftRow[], since: Date, now: Date): number {
  let totalMs = 0
  for (const shift of shifts) {
    const start = new Date(shift.clock_in_at)
    const end = shift.clock_out_at ? new Date(shift.clock_out_at) : now
    const effectiveStart = start < since ? since : start
    if (end > effectiveStart) totalMs += end.getTime() - effectiveStart.getTime()
  }
  return totalMs / 3_600_000
}

/**
 * Horas trabajadas por usuario en el período dado, a partir de datos reales
 * de fichaje — nunca inventadas. Los conductores fichan en driver_shifts
 * (ya existía, ver /company/driver); el resto del personal en staff_shifts
 * (nueva). Un turno todavía abierto (clock_out_at null) cuenta hasta ahora
 * mismo, para que "horas trabajadas hoy" sea correcto mientras alguien
 * sigue en turno.
 */
export async function fetchHoursByUser(
  driverIds: string[],
  otherStaffIds: string[],
  period: HoursPeriod
): Promise<Map<string, number>> {
  const now = new Date()
  const since = periodStart(period, now)
  const result = new Map<string, number>()

  const queries: PromiseLike<void>[] = []

  if (driverIds.length > 0) {
    queries.push(
      supabase
        .from('driver_shifts')
        .select('driver_id, clock_in_at, clock_out_at')
        .in('driver_id', driverIds)
        .or(`clock_out_at.is.null,clock_out_at.gte.${since.toISOString()}`)
        .then(({ data }) => {
          const byUser = new Map<string, ShiftRow[]>()
          for (const row of data ?? []) {
            const list = byUser.get(row.driver_id) ?? []
            list.push({ clock_in_at: row.clock_in_at, clock_out_at: row.clock_out_at })
            byUser.set(row.driver_id, list)
          }
          for (const [userId, shifts] of byUser) result.set(userId, sumHours(shifts, since, now))
        })
    )
  }

  if (otherStaffIds.length > 0) {
    queries.push(
      supabase
        .from('staff_shifts')
        .select('user_id, clock_in_at, clock_out_at')
        .in('user_id', otherStaffIds)
        .or(`clock_out_at.is.null,clock_out_at.gte.${since.toISOString()}`)
        .then(({ data }) => {
          const byUser = new Map<string, ShiftRow[]>()
          for (const row of data ?? []) {
            const list = byUser.get(row.user_id) ?? []
            list.push({ clock_in_at: row.clock_in_at, clock_out_at: row.clock_out_at })
            byUser.set(row.user_id, list)
          }
          for (const [userId, shifts] of byUser) result.set(userId, sumHours(shifts, since, now))
        })
    )
  }

  await Promise.all(queries)
  return result
}
