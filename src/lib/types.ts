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
export type RewardCatalogItem = Tables<'reward_catalog'>
export type RewardRedemption = Tables<'reward_redemptions'>
export type Promotion = Tables<'promotions'>
export type PromoBanner = Tables<'promo_banners'>
export type PromotionRedemption = Tables<'promotion_redemptions'>
export type Driver = Tables<'drivers'>
export type EmployeeDetails = Tables<'employee_details'>
export type EmployeeSensitiveInfo = Tables<'employee_sensitive_info'>
export type DeliveryAssignment = Tables<'delivery_assignments'>
export type Notification = Tables<'notifications'>
export type AuditLog = Tables<'audit_logs'>
export type ProductImage = Tables<'product_images'>
export type Favorite = Tables<'favorites'>
export type Setting = Tables<'settings'>
export type AccountDeletionRequest = Tables<'account_deletion_requests'>
export type IssueReport = Tables<'issue_reports'>
export type IssueReportMessage = Tables<'issue_report_messages'>

export const ISSUE_REPORT_CATEGORY_LABELS: Record<string, string> = {
  wrong_order: 'Pedido incorrecto',
  missing_item: 'Artículo faltante',
  damaged_order: 'Pedido dañado',
  delivery_issue: 'Problema con la entrega',
  payment_issue: 'Problema con el pago',
  other: 'Otro',
}

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

/**
 * Estados en los que un pedido ya no va a cambiar más — a diferencia de
 * ORDER_TERMINAL_STATUSES, aquí sí se incluye "delivered" (que es el
 * final feliz del camino, no un estado "fuera de camino"). Se usa para
 * saber cuándo dejar de recordar/avisar sobre un pedido (el banner de
 * seguimiento persistente, por ejemplo) — no para decidir si se muestra
 * el timeline de progreso.
 */
export const ORDER_CLOSED_STATUSES: OrderStatus[] = [...ORDER_TERMINAL_STATUSES, 'delivered']

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
