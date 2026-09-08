import type { Tables } from './database.types'
import type { CompanyRole } from './auth/permissions'

export type Category = Tables<'categories'>
export type MenuItem = Tables<'menu_items'>
export type ItemSize = Tables<'item_sizes'>
export type Crust = Tables<'crusts'>
export type Sauce = Tables<'sauces'>
export type Topping = Tables<'toppings'>
export type Ingredient = Tables<'ingredients'>
export type InventoryMovement = Tables<'inventory_movements'>
export type RecipeIngredient = Tables<'recipe_ingredients'>
export type ToppingIngredient = Tables<'topping_ingredients'>
export type Order = Tables<'orders'>
export type OrderItem = Tables<'order_items'>
export type OrderItemTopping = Tables<'order_item_toppings'>
export type Profile = Tables<'profiles'> & { company_role: CompanyRole | null }
export type Address = Tables<'addresses'>
export type Payment = Tables<'payments'>
export type RewardsAccount = Tables<'rewards_accounts'>
export type PointsLedgerEntry = Tables<'points_ledger'>
export type RewardTier = Tables<'reward_tiers'>
export type Promotion = Tables<'promotions'>
export type PromotionRedemption = Tables<'promotion_redemptions'>
export type Driver = Tables<'drivers'>
export type DeliveryAssignment = Tables<'delivery_assignments'>
export type Notification = Tables<'notifications'>
export type AuditLog = Tables<'audit_logs'>
export type ProductImage = Tables<'product_images'>
export type Favorite = Tables<'favorites'>
export type Setting = Tables<'settings'>

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'refunded'
  | 'failed'

/** Camino "feliz" que se muestra como timeline de progreso al cliente. */
export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
]

/** Estados terminales fuera del camino feliz. */
export const ORDER_TERMINAL_STATUSES: OrderStatus[] = ['cancelled', 'refunded', 'failed']

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'En preparación',
  ready: 'Listo',
  out_for_delivery: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
  failed: 'Fallido',
}

export const FREE_TOPPINGS_LIMIT = 4

/** Un item dentro del carrito del cliente, antes de convertirse en order_items */
export interface CartLine {
  lineId: string
  menuItemId: string
  name: string
  imageUrl: string | null
  quantity: number
  unitPrice: number
  size?: { id: string; name: string; price: number }
  crust?: { id: string; name: string; extraPrice: number }
  sauce?: { id: string; name: string; extraPrice: number }
  toppings: { id: string; name: string; price: number; free: boolean }[]
  note?: string
}

export function cartLineSubtotal(line: CartLine): number {
  return line.unitPrice * line.quantity
}
