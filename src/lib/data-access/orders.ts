import { supabase } from '@/lib/supabase'
import type { Order, OrderItem, OrderItemTopping } from '@/lib/types'
import type { Json } from '@/lib/database.types'

export interface CartRpcItem {
  menu_item_id: string
  size_id?: string | null
  crust_id?: string | null
  sauce_id?: string | null
  topping_ids?: string[]
  quantity: number
}

export interface CartPricingResult {
  items: {
    menu_item_id: string
    item_name: string
    size_name: string | null
    crust_name: string | null
    sauce_name: string | null
    toppings: { id: string; name: string; price: number; free: boolean }[]
    quantity: number
    unit_price: number
    subtotal: number
  }[]
  subtotal: number
  discount: number
  delivery_fee: number
  tax: number
  total: number
  promotion_id: string | null
  promotion_code: string | null
}

/**
 * Recalcula el precio del carrito en el servidor (Postgres RPC). Esta es
 * la ÚNICA cifra confiable — cualquier total mostrado antes de llamar esto
 * es solo una estimación visual del cliente.
 */
export async function calculateCartPrice(
  cart: CartRpcItem[],
  orderType: 'delivery' | 'pickup',
  promoCode?: string,
  customerId?: string
): Promise<CartPricingResult> {
  const { data, error } = await supabase.rpc('calculate_cart_price', {
    p_cart: cart as unknown as Json,
    p_order_type: orderType,
    p_promo_code: promoCode || undefined,
    p_customer_id: customerId,
  })
  if (error) throw error
  return data as unknown as CartPricingResult
}

export interface CreateOrderInput {
  cart: CartRpcItem[]
  orderType: 'delivery' | 'pickup'
  customerName: string
  phone: string
  addressId: string | null
  addressText: string | null
  paymentMethod: string
  notes: string | null
  idempotencyKey: string
  promoCode?: string
}

/**
 * Crea el pedido de forma idempotente y con precio recalculado en
 * servidor. Es el único camino soportado para checkout.
 */
export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const { data, error } = await supabase.rpc('create_order', {
    p_cart: input.cart as unknown as Json,
    p_order_type: input.orderType,
    p_customer_name: input.customerName,
    p_phone: input.phone,
    p_address_id: input.addressId as unknown as string,
    p_address_text: input.addressText as unknown as string,
    p_payment_method: input.paymentMethod,
    p_notes: input.notes as unknown as string,
    p_idempotency_key: input.idempotencyKey,
    p_promo_code: input.promoCode || undefined,
  })
  if (error) throw error
  return data as unknown as Order
}

/**
 * Trae un pedido puntual por id — funciona con o sin sesión (seguimiento
 * de pedido para invitados). Usa get_order_tracking() en vez de un select
 * directo: la tabla orders ya no tiene lectura pública (era una fuga real
 * de datos de todos los clientes) — la función solo permite consultar UN
 * pedido a la vez, y el UUID en sí (nunca enumerable, solo llega por el
 * link de confirmación) es la única "credencial" que hace falta.
 */
export async function fetchOrderById(id: string): Promise<Order | null> {
  const { data, error } = await supabase.rpc('get_order_tracking', { p_order_id: id })
  if (error) throw error
  return data as unknown as Order | null
}

export async function fetchOrderItems(
  orderId: string
): Promise<(OrderItem & { order_item_toppings: OrderItemTopping[] })[]> {
  const { data, error } = await supabase
    .from('order_items')
    .select('*, order_item_toppings(*)')
    .eq('order_id', orderId)
  if (error) throw error
  return data ?? []
}

export async function fetchCustomerOrders(customerId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}
