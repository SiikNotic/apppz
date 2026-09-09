import { useMemo, useState } from 'react'
import { estimatePizzaPrice } from '@/lib/business-logic/pricing'
import type { MenuItem, ItemSize, Crust, Sauce, Topping, CartLine } from '@/lib/types'

/**
 * Estado y cálculo de precio (estimado, no autoritativo) del configurador
 * de pizza. Compartido entre el modal de la lista de menú y la página de
 * detalle de producto para no duplicar la lógica dos veces.
 *
 * freeToppingsLimit viene SIEMPRE del producto (item.free_toppings_limit)
 * — única fuente de verdad, la misma que aplica calculate_cart_price() en
 * el servidor. Ya no existe un límite global.
 */
export function usePizzaBuilder(
  sizes: ItemSize[],
  crusts: Crust[],
  sauces: Sauce[],
  toppings: Topping[],
  freeToppingsLimit: number
) {
  const [sizeId, setSizeId] = useState(sizes[0]?.id)
  const [crustId, setCrustId] = useState(crusts[0]?.id)
  const [sauceId, setSauceId] = useState(sauces[0]?.id)
  const [toppingIds, setToppingIds] = useState<string[]>([])

  const selectedSize = sizes.find((s) => s.id === sizeId) ?? sizes[0]
  const selectedCrust = crusts.find((c) => c.id === crustId) ?? crusts[0]
  const selectedSauce = sauces.find((s) => s.id === sauceId) ?? sauces[0]

  const selectedToppings = useMemo(
    () =>
      toppingIds
        .map((id) => toppings.find((t) => t.id === id))
        .filter((t): t is Topping => !!t)
        .map((t, i) => ({ ...t, free: i < freeToppingsLimit })),
    [toppingIds, toppings, freeToppingsLimit]
  )

  const total = estimatePizzaPrice({
    size: selectedSize,
    crust: selectedCrust,
    sauce: selectedSauce,
    selectedToppings,
    freeToppingsLimit,
  })

  const freeRemaining = Math.max(0, freeToppingsLimit - toppingIds.length)

  function toggleTopping(id: string) {
    setToppingIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))
  }

  function reset() {
    setSizeId(sizes[0]?.id)
    setCrustId(crusts[0]?.id)
    setSauceId(sauces[0]?.id)
    setToppingIds([])
  }

  function buildCartLine(item: MenuItem): Omit<CartLine, 'lineId'> | null {
    if (!selectedSize || !selectedCrust || !selectedSauce) return null
    return {
      menuItemId: item.id,
      name: item.name,
      imageUrl: item.image_url,
      quantity: 1,
      unitPrice: total,
      size: { id: selectedSize.id, name: selectedSize.name, price: selectedSize.price },
      crust: { id: selectedCrust.id, name: selectedCrust.name, extraPrice: selectedCrust.extra_price },
      sauce: { id: selectedSauce.id, name: selectedSauce.name, extraPrice: selectedSauce.extra_price },
      toppings: selectedToppings.map((t) => ({ id: t.id, name: t.name, price: t.price, free: t.free })),
    }
  }

  return {
    sizeId,
    setSizeId,
    crustId,
    setCrustId,
    sauceId,
    setSauceId,
    toppingIds,
    toggleTopping,
    selectedSize,
    selectedCrust,
    selectedSauce,
    selectedToppings,
    total,
    freeRemaining,
    reset,
    buildCartLine,
  }
}
