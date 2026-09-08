import { describe, it, expect } from 'vitest'
import { estimatePizzaPrice, estimateCartSubtotal } from './pricing'

describe('estimatePizzaPrice', () => {
  it('usa solo el precio del tamaño cuando no hay masa/salsa/toppings', () => {
    const price = estimatePizzaPrice({ size: { price: 11.99 }, selectedToppings: [] })
    expect(price).toBe(11.99)
  })

  it('suma los extras de masa y salsa', () => {
    const price = estimatePizzaPrice({
      size: { price: 11.99 },
      crust: { extra_price: 1.5 },
      sauce: { extra_price: 0.5 },
      selectedToppings: [],
    })
    expect(price).toBeCloseTo(13.99)
  })

  it('los primeros N toppings son gratis y el resto se cobra', () => {
    const toppings = [{ price: 0.55 }, { price: 0.55 }, { price: 0.55 }]
    const price = estimatePizzaPrice({
      size: { price: 10 },
      selectedToppings: toppings,
      freeToppingsLimit: 2,
    })
    // 2 gratis + 1 pagado
    expect(price).toBeCloseTo(10.55)
  })

  it('respeta un límite de toppings gratis distinto de 4', () => {
    const toppings = [{ price: 1 }, { price: 1 }]
    const price = estimatePizzaPrice({ size: { price: 5 }, selectedToppings: toppings, freeToppingsLimit: 0 })
    expect(price).toBe(7)
  })
})

describe('estimateCartSubtotal', () => {
  it('suma los totales de línea', () => {
    expect(estimateCartSubtotal([10, 5.5, 2])).toBeCloseTo(17.5)
  })

  it('regresa 0 para un carrito vacío', () => {
    expect(estimateCartSubtotal([])).toBe(0)
  })
})
