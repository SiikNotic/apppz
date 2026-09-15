import type { ItemSize, Crust, Sauce, Topping, ToppingQuantityLevel } from '@/lib/types'

/**
 * Precio final de un topping o la salsa dado su precio normal (base) y el
 * nivel de cantidad elegido — Sesión 21. Mismo criterio en cliente
 * (estimación visual) y servidor (calculate_cart_price, la fuente
 * autoritativa): "little" ("Poco") siempre $0 sin importar el precio
 * normal; "normal" cobra el precio normal tal cual; "extra" suma el cargo
 * extra configurado ENCIMA del precio normal — nunca lo reemplaza (por
 * eso no es solo `extraCharge`, es `basePrice + extraCharge`).
 */
export function quantityLevelPrice(basePrice: number, extraCharge: number, level: ToppingQuantityLevel): number {
  switch (level) {
    case 'little':
      return 0
    case 'extra':
      return basePrice + extraCharge
    case 'normal':
    default:
      return basePrice
  }
}

/**
 * Estimación de precio 100% en el cliente, usada SOLO para feedback visual
 * instantáneo mientras el usuario arma su pizza o revisa el carrito.
 *
 * NUNCA se usa este número para cobrar ni para guardar el pedido — eso lo
 * hace `calculate_cart_price` en el servidor (ver lib/data-access/orders.ts).
 * Si ambos números llegaran a diferir (ej. cambió un precio mientras el
 * cliente tenía el carrito abierto), el servidor gana siempre.
 *
 * freeToppingsLimit SIEMPRE debe venir del producto (menu_items.
 * free_toppings_limit) — es la única fuente de verdad, la misma que usa
 * calculate_cart_price(). Nunca un valor global: dos pizzas pueden tener
 * límites distintos. Si se omite, se asume 0 (nunca sobreestima toppings
 * gratis que el servidor no vaya a reconocer).
 *
 * quantityLevel (por topping y para la salsa) es opcional y por defecto
 * 'normal' — así las llamadas/tests que no conocen el concepto de
 * cantidad (de antes de la Sesión 21) siguen dando el mismo resultado de
 * siempre, sin tener que tocarlas.
 */
export function estimatePizzaPrice(params: {
  size?: Pick<ItemSize, 'price'>
  crust?: Pick<Crust, 'extra_price'>
  sauce?: Pick<Sauce, 'extra_price'> & { extra_charge?: number }
  sauceQuantityLevel?: ToppingQuantityLevel
  selectedToppings: (Pick<Topping, 'price'> & { extra_charge?: number; quantityLevel?: ToppingQuantityLevel })[]
  freeToppingsLimit?: number
}): number {
  const freeLimit = params.freeToppingsLimit ?? 0
  let price = params.size?.price ?? 0
  price += params.crust?.extra_price ?? 0
  price += quantityLevelPrice(params.sauce?.extra_price ?? 0, params.sauce?.extra_charge ?? 0, params.sauceQuantityLevel ?? 'normal')
  params.selectedToppings.forEach((topping, index) => {
    const base = index >= freeLimit ? topping.price : 0
    price += quantityLevelPrice(base, topping.extra_charge ?? 0, topping.quantityLevel ?? 'normal')
  })
  return price
}

export function estimateCartSubtotal(lineTotals: number[]): number {
  return lineTotals.reduce((sum, n) => sum + n, 0)
}
