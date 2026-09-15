import { supabase } from '@/lib/supabase'
import type { Order, OrderItem, OrderItemTopping, ToppingQuantityLevel } from '@/lib/types'
import type { Json } from '@/lib/database.types'

/** Un topping del carrito enviado al RPC — id + el nivel de cantidad
 *  elegido (Sesión 21). El servidor (calculate_cart_price) es quien
 *  resuelve precio/nombre/"gratis" reales; acá solo se manda la
 *  selección, nunca un precio calculado en el cliente. */
export interface CartToppingRef {
  id: string
  quantity_level: ToppingQuantityLevel
}

export interface CartRpcItem {
  menu_item_id: string
  size_id?: string | null
  crust_id?: string | null
  sauce_id?: string | null
  /** Nivel de cantidad para la salsa elegida (sauce_id) — 'normal' si se
   *  omite, igual que antes de que existiera este concepto. */
  sauce_quantity_level?: ToppingQuantityLevel
  topping_ids?: CartToppingRef[]
  /** Variante elegida (marca/sabor) — Sesión 22. Solo aplica a productos
   *  con `menu_items.has_variants`; el servidor exige elegir una si el
   *  producto tiene variantes activas configuradas. */
  variant_id?: string | null
  quantity: number
}

export interface CartPricingResult {
  items: {
    menu_item_id: string
    item_name: string
    size_name: string | null
    crust_name: string | null
    sauce_name: string | null
    sauce_quantity_level: ToppingQuantityLevel
    sauce_base_price: number
    sauce_extra_charge: number
    sauce_final_price: number
    toppings: { id: string; name: string; price: number; free: boolean; quantity_level: ToppingQuantityLevel; base_price: number; extra_charge: number }[]
    variant_name: string | null
    variant_price: number | null
    quantity: number
    unit_price: number
    subtotal: number
  }[]
  subtotal: number
  discount: number
  delivery_fee: number
  tax: number
  /** Pizzeria Credit aplicado — Sesión 23. Siempre recortado en el
   *  servidor a min(lo pedido, saldo disponible, total antes de crédito);
   *  nunca lo que mande el cliente. 0 si no hay sesión o no se pidió. */
  credit_applied: number
  /** Saldo de crédito disponible del cliente en este momento — solo
   *  informativo para la UI (cuánto podría aplicar), no una promesa de
   *  cuánto se aplicará si el carrito cambia. */
  available_credit: number
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
  customerId?: string,
  creditApplied?: number
): Promise<CartPricingResult> {
  const { data, error } = await supabase.rpc('calculate_cart_price', {
    p_cart: cart as unknown as Json,
    p_order_type: orderType,
    p_promo_code: promoCode || undefined,
    p_customer_id: customerId,
    p_credit_applied: creditApplied ?? 0,
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
  /** 100% para el conductor — nunca se mezcla con subtotal/total (ver
   *  columna orders.tip_amount). Solo aplica a domicilio; no se envía
   *  (o se envía 0) en pickup, donde no hay conductor. */
  tipAmount?: number
  /** Pizzeria Credit a aplicar — Sesión 23. El servidor (create_order via
   *  calculate_cart_price) es quien recorta esto a lo realmente
   *  disponible; este valor es solo lo que el cliente pide usar. */
  creditApplied?: number
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
    p_tip_amount: input.tipAmount ?? 0,
    p_credit_applied: input.creditApplied ?? 0,
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

/**
 * Una imagen representativa por pedido (el primer producto real, vía
 * order_items.menu_item_id → menu_items.image_url) para la miniatura de
 * "Mis pedidos" — nunca un placeholder inventado. Si el producto ya no
 * existe en el catálogo (menu_item_id null, o borrado) o no tiene foto,
 * el llamador cae al ícono genérico de ItemThumb, igual que en todos
 * lados más — no se inventa ninguna imagen acá.
 */
export async function fetchOrderThumbnails(
  orderIds: string[]
): Promise<Map<string, { name: string; imageUrl: string | null }>> {
  const map = new Map<string, { name: string; imageUrl: string | null }>()
  if (orderIds.length === 0) return map
  const { data, error } = await supabase
    .from('order_items')
    .select('order_id, item_name, menu_items(image_url)')
    .in('order_id', orderIds)
  if (error) throw error
  for (const row of data ?? []) {
    if (map.has(row.order_id)) continue // el primer item real de cada pedido, no todos
    const menuItem = Array.isArray(row.menu_items) ? row.menu_items[0] : row.menu_items
    map.set(row.order_id, { name: row.item_name, imageUrl: menuItem?.image_url ?? null })
  }
  return map
}
