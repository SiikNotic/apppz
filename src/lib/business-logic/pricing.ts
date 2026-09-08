import { FREE_TOPPINGS_LIMIT } from '@/lib/types'
import type { ItemSize, Crust, Sauce, Topping } from '@/lib/types'

/**
 * Estimación de precio 100% en el cliente, usada SOLO para feedback visual
 * instantáneo mientras el usuario arma su pizza o revisa el carrito.
 *
 * NUNCA se usa este número para cobrar ni para guardar el pedido — eso lo
 * hace `calculate_cart_price` en el servidor (ver lib/data-access/orders.ts).
 * Si ambos números llegaran a diferir (ej. cambió un precio mientras el
 * cliente tenía el carrito abierto), el servidor gana siempre.
 */
export function estimatePizzaPrice(params: {
  size?: Pick<ItemSize, 'price'>
  crust?: Pick<Crust, 'extra_price'>
  sauce?: Pick<Sauce, 'extra_price'>
  selectedToppings: Pick<Topping, 'price'>[]
  freeToppingsLimit?: number
}): number {
  const freeLimit = params.freeToppingsLimit ?? FREE_TOPPINGS_LIMIT
  let price = params.size?.price ?? 0
  price += params.crust?.extra_price ?? 0
  price += params.sauce?.extra_price ?? 0
  params.selectedToppings.forEach((topping, index) => {
    if (index >= freeLimit) price += topping.price
  })
  return price
}

export function estimateCartSubtotal(lineTotals: number[]): number {
  return lineTotals.reduce((sum, n) => sum + n, 0)
}
