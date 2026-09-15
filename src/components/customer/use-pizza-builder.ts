import { useMemo, useState } from 'react'
import { estimatePizzaPrice, quantityLevelPrice } from '@/lib/business-logic/pricing'
import type { MenuItem, ItemSize, Crust, Sauce, Topping, CartLine, ToppingQuantityLevel } from '@/lib/types'

/**
 * Estado y cálculo de precio (estimado, no autoritativo) del configurador
 * de pizza. Compartido entre el modal de la lista de menú y la página de
 * detalle de producto para no duplicar la lógica dos veces.
 *
 * freeToppingsLimit viene SIEMPRE del producto (item.free_toppings_limit)
 * — única fuente de verdad, la misma que aplica calculate_cart_price() en
 * el servidor. Ya no existe un límite global.
 *
 * Sesión 21 — selector de cantidad (Poco/Normal/Extra): cada topping
 * seleccionado tiene su propio nivel en `toppingLevels` (por id), y la
 * salsa elegida tiene el suyo en `sauceQuantityLevel`. Seleccionar un
 * topping (o cambiar de salsa) siempre arranca en 'normal' — nunca en
 * 'extra' — tal como pide la tarea; quitar un topping borra también su
 * nivel guardado (no sobrevive un re-agregado posterior).
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
  const [sauceId, setSauceIdState] = useState(sauces[0]?.id)
  const [sauceQuantityLevel, setSauceQuantityLevel] = useState<ToppingQuantityLevel>('normal')
  const [toppingIds, setToppingIds] = useState<string[]>([])
  const [toppingLevels, setToppingLevels] = useState<Record<string, ToppingQuantityLevel>>({})

  const selectedSize = sizes.find((s) => s.id === sizeId) ?? sizes[0]
  const selectedCrust = crusts.find((c) => c.id === crustId) ?? crusts[0]
  const selectedSauce = sauces.find((s) => s.id === sauceId) ?? sauces[0]

  const selectedToppings = useMemo(
    () =>
      toppingIds
        .map((id) => toppings.find((t) => t.id === id))
        .filter((t): t is Topping => !!t)
        .map((t, i) => ({ ...t, free: i < freeToppingsLimit, quantityLevel: toppingLevels[t.id] ?? 'normal' })),
    [toppingIds, toppings, freeToppingsLimit, toppingLevels]
  )

  const total = estimatePizzaPrice({
    size: selectedSize,
    crust: selectedCrust,
    sauce: selectedSauce,
    sauceQuantityLevel,
    selectedToppings,
    freeToppingsLimit,
  })

  const freeRemaining = Math.max(0, freeToppingsLimit - toppingIds.length)

  function toggleTopping(id: string) {
    if (toppingIds.includes(id)) {
      setToppingIds((prev) => prev.filter((t) => t !== id))
      setToppingLevels((levels) => {
        const next = { ...levels }
        delete next[id] // se quita el topping → se quita también su selector de cantidad
        return next
      })
    } else {
      setToppingIds((prev) => [...prev, id])
      setToppingLevels((levels) => ({ ...levels, [id]: 'normal' })) // nunca arranca en 'extra'
    }
  }

  function setToppingLevel(id: string, level: ToppingQuantityLevel) {
    setToppingLevels((prev) => ({ ...prev, [id]: level }))
  }

  function setSauceId(id: string) {
    setSauceIdState(id)
    setSauceQuantityLevel('normal') // otra salsa = otra selección, arranca en 'normal'
  }

  function reset() {
    setSizeId(sizes[0]?.id)
    setCrustId(crusts[0]?.id)
    setSauceIdState(sauces[0]?.id)
    setSauceQuantityLevel('normal')
    setToppingIds([])
    setToppingLevels({})
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
      sauce: {
        id: selectedSauce.id,
        name: selectedSauce.name,
        extraPrice: selectedSauce.extra_price,
        quantityLevel: sauceQuantityLevel,
        price: quantityLevelPrice(selectedSauce.extra_price, selectedSauce.extra_charge, sauceQuantityLevel),
      },
      toppings: selectedToppings.map((t) => ({
        id: t.id,
        name: t.name,
        price: quantityLevelPrice(t.free ? 0 : t.price, t.extra_charge, t.quantityLevel),
        free: t.free,
        quantityLevel: t.quantityLevel,
      })),
    }
  }

  return {
    sizeId,
    setSizeId,
    crustId,
    setCrustId,
    sauceId,
    setSauceId,
    sauceQuantityLevel,
    setSauceQuantityLevel,
    toppingIds,
    toggleTopping,
    toppingLevels,
    setToppingLevel,
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
