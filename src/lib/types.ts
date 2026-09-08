import type { Tables } from './database.types'

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
export type Profile = Tables<'profiles'>

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'on_the_way'
  | 'delivered'
  | 'cancelled'

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'on_the_way',
  'delivered',
]

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'En preparación',
  ready: 'Listo',
  on_the_way: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
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
}

export function cartLineSubtotal(line: CartLine): number {
  return line.unitPrice * line.quantity
}
