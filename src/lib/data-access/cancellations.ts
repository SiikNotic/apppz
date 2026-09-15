import { supabase } from '@/lib/supabase'
import type {
  CancellationPreview,
  CancellationReason,
  CreditAccount,
  CreditTransaction,
  OrderCancellation,
  RefundMethod,
} from '@/lib/types'

/**
 * Vista previa de cancelación (Pedido #, monto reembolsable, si se puede
 * cancelar y por qué no si no se puede) — SIEMPRE del servidor, nunca
 * calculada en el cliente. Se llama antes de mostrar el formulario de
 * motivo, y de nuevo antes de la pantalla de confirmación.
 */
export async function getCancellationPreview(orderId: string): Promise<CancellationPreview> {
  const { data, error } = await supabase.rpc('get_cancellation_preview', { p_order_id: orderId })
  if (error) throw error
  return data as unknown as CancellationPreview
}

/** Cancelación por el propio cliente, desde la pantalla de su pedido. */
export async function cancelOrderSelf(
  orderId: string,
  reason: CancellationReason,
  reasonDetail: string | null,
  refundMethod: RefundMethod | null
): Promise<OrderCancellation> {
  const { data, error } = await supabase.rpc('cancel_order_self', {
    p_order_id: orderId,
    p_reason: reason,
    p_reason_detail: reasonDetail || undefined,
    p_refund_method: refundMethod || undefined,
  })
  if (error) throw error
  return data as unknown as OrderCancellation
}

/**
 * Cancelación por soporte/staff (permiso orders.cancel) — único camino
 * donde 'none' (sin reembolso) es una opción válida; nunca se expone al
 * cliente. El monto lo recorta el servidor a lo realmente reembolsable
 * sin importar qué se mande aquí.
 */
export async function cancelOrderStaff(
  orderId: string,
  reason: CancellationReason,
  reasonDetail: string | null,
  refundMethod: RefundMethod,
  refundAmount: number | null
): Promise<OrderCancellation> {
  const { data, error } = await supabase.rpc('cancel_order_staff', {
    p_order_id: orderId,
    p_reason: reason,
    p_reason_detail: reasonDetail || '',
    p_refund_method: refundMethod,
    p_refund_amount: refundAmount ?? undefined,
  })
  if (error) throw error
  return data as unknown as OrderCancellation
}

/**
 * Staff marca un reembolso "a método de pago original" como completado
 * (con una referencia REAL de la reversión — recibo de terminal, folio de
 * transferencia, etc.) o fallido. Permiso orders.refund.
 */
export async function completePaymentRefund(
  cancellationId: string,
  status: 'completed' | 'failed',
  reference: string | null
): Promise<OrderCancellation> {
  const { data, error } = await supabase.rpc('complete_payment_refund', {
    p_cancellation_id: cancellationId,
    p_status: status,
    p_reference: reference || undefined,
  })
  if (error) throw error
  return data as unknown as OrderCancellation
}

export async function fetchOrderCancellation(orderId: string): Promise<OrderCancellation | null> {
  const { data, error } = await supabase.from('order_cancellations').select('*').eq('order_id', orderId).maybeSingle()
  if (error) throw error
  return data
}

export async function fetchOrderCancellationsByOrderIds(
  orderIds: string[]
): Promise<Map<string, OrderCancellation>> {
  const map = new Map<string, OrderCancellation>()
  if (orderIds.length === 0) return map
  const { data, error } = await supabase.from('order_cancellations').select('*').in('order_id', orderIds)
  if (error) throw error
  for (const row of data ?? []) map.set(row.order_id, row)
  return map
}

/** Saldo actual de Pizzeria Credit del cliente — 0 si nunca tuvo una fila
 *  (nunca se le ha reembolsado nada todavía, no es un error). */
export async function fetchCreditBalance(userId: string): Promise<number> {
  const { data, error } = await supabase.from('credit_accounts').select('balance').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data?.balance ?? 0
}

export async function fetchCreditAccount(userId: string): Promise<CreditAccount | null> {
  const { data, error } = await supabase.from('credit_accounts').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data
}

export async function fetchCreditTransactions(userId: string): Promise<CreditTransaction[]> {
  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}
