import { supabase } from './supabase'
import type { StoreStatus } from './types'

/**
 * Estado real de la tienda — calculado en el servidor (is_store_open /
 * get_store_status) a partir del horario semanal, cierres puntuales y la
 * anulación manual. Nunca se debe inferir el estado solo del reloj del
 * navegador: la zona horaria y el horario configurado viven en la base de
 * datos, y create_order() ya rechaza pedidos nuevos si esto da cerrado —
 * esto es solo para que la interfaz lo refleje antes de intentarlo.
 */
export async function fetchStoreStatus(): Promise<StoreStatus | null> {
  const { data, error } = await supabase.rpc('get_store_status')
  if (error) return null
  return data as unknown as StoreStatus
}
