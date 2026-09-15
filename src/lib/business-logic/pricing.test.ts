import { describe, it, expect } from 'vitest'
import { estimatePizzaPrice, estimateCartSubtotal, quantityLevelPrice } from './pricing'

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

describe('quantityLevelPrice', () => {
  it('"little" siempre es $0, sin importar el precio normal', () => {
    expect(quantityLevelPrice(1.5, 2, 'little')).toBe(0)
    expect(quantityLevelPrice(0, 2, 'little')).toBe(0)
  })

  it('"normal" cobra el precio base tal cual, sin el cargo extra', () => {
    expect(quantityLevelPrice(1.5, 2, 'normal')).toBe(1.5)
  })

  it('"extra" suma el cargo extra ENCIMA del precio base (no lo reemplaza)', () => {
    // Ejemplo de la Sesión 21: Pepperoni normal=$1.50, cargo extra=$2.00 → Extra = $3.50
    expect(quantityLevelPrice(1.5, 2, 'extra')).toBeCloseTo(3.5)
  })

  it('"extra" sin cargo extra configurado (0) no cobra de más', () => {
    expect(quantityLevelPrice(1.5, 0, 'extra')).toBe(1.5)
  })

  it('un topping gratis (base=0) en "extra" solo cobra el cargo extra', () => {
    expect(quantityLevelPrice(0, 2, 'extra')).toBe(2)
  })
})

describe('estimatePizzaPrice con niveles de cantidad', () => {
  it('sin quantityLevel (llamadas viejas) se comporta como "normal" — compatibilidad hacia atrás', () => {
    const price = estimatePizzaPrice({
      size: { price: 10 },
      sauce: { extra_price: 0.5 },
      selectedToppings: [{ price: 1.5 }],
      freeToppingsLimit: 0,
    })
    expect(price).toBeCloseTo(12)
  })

  it('un topping en "little" no cobra su precio normal', () => {
    const price = estimatePizzaPrice({
      size: { price: 10 },
      selectedToppings: [{ price: 1.5, quantityLevel: 'little' }],
      freeToppingsLimit: 0,
    })
    expect(price).toBe(10)
  })

  it('un topping en "extra" suma precio normal + cargo extra configurado', () => {
    const price = estimatePizzaPrice({
      size: { price: 10 },
      selectedToppings: [{ price: 1.5, extra_charge: 2, quantityLevel: 'extra' }],
      freeToppingsLimit: 0,
    })
    expect(price).toBeCloseTo(13.5)
  })

  it('un topping gratis (dentro del límite) en "extra" solo cobra el cargo extra, no precio+cargo', () => {
    const price = estimatePizzaPrice({
      size: { price: 10 },
      selectedToppings: [{ price: 1.5, extra_charge: 2, quantityLevel: 'extra' }],
      freeToppingsLimit: 1, // el único topping cae dentro del límite gratis
    })
    expect(price).toBeCloseTo(12) // 10 + (0 base + 2 de cargo extra)
  })

  it('la salsa en "extra" suma su precio normal + su cargo extra configurado', () => {
    const price = estimatePizzaPrice({
      size: { price: 10 },
      sauce: { extra_price: 0.75, extra_charge: 1.25 },
      sauceQuantityLevel: 'extra',
      selectedToppings: [],
    })
    expect(price).toBeCloseTo(12) // 10 + 0.75 + 1.25
  })

  it('la salsa en "little" no cobra nada', () => {
    const price = estimatePizzaPrice({
      size: { price: 10 },
      sauce: { extra_price: 0.75, extra_charge: 1.25 },
      sauceQuantityLevel: 'little',
      selectedToppings: [],
    })
    expect(price).toBe(10)
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
