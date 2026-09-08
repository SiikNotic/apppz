import { describe, it, expect } from 'vitest'
import { canTransition, nextHappyPathStatus, isTerminalStatus } from './order-state-machine'

describe('canTransition', () => {
  it('permite el camino feliz completo', () => {
    expect(canTransition('pending', 'confirmed')).toBe(true)
    expect(canTransition('confirmed', 'preparing')).toBe(true)
    expect(canTransition('preparing', 'ready')).toBe(true)
    expect(canTransition('ready', 'out_for_delivery')).toBe(true)
    expect(canTransition('out_for_delivery', 'delivered')).toBe(true)
  })

  it('nunca permite retroceder de delivered a un estado anterior', () => {
    expect(canTransition('delivered', 'preparing')).toBe(false)
    expect(canTransition('delivered', 'pending')).toBe(false)
    expect(canTransition('delivered', 'confirmed')).toBe(false)
  })

  it('permite cancelar solo antes de que el pedido esté en camino', () => {
    expect(canTransition('pending', 'cancelled')).toBe(true)
    expect(canTransition('preparing', 'cancelled')).toBe(true)
    expect(canTransition('out_for_delivery', 'cancelled')).toBe(false)
  })

  it('un pedido cancelado o fallido puede reembolsarse pero no revivir', () => {
    expect(canTransition('cancelled', 'refunded')).toBe(true)
    expect(canTransition('cancelled', 'pending')).toBe(false)
    expect(canTransition('failed', 'refunded')).toBe(true)
  })

  it('un pedido reembolsado es un estado final', () => {
    expect(canTransition('refunded', 'delivered')).toBe(false)
    expect(canTransition('refunded', 'refunded')).toBe(false)
  })
})

describe('nextHappyPathStatus', () => {
  it('avanza un paso a la vez por el camino feliz', () => {
    expect(nextHappyPathStatus('pending')).toBe('confirmed')
    expect(nextHappyPathStatus('ready')).toBe('out_for_delivery')
  })

  it('no hay siguiente paso después de delivered', () => {
    expect(nextHappyPathStatus('delivered')).toBeNull()
  })

  it('un estado fuera del camino feliz (cancelled) no tiene siguiente paso', () => {
    expect(nextHappyPathStatus('cancelled')).toBeNull()
  })
})

describe('isTerminalStatus', () => {
  it('delivered y refunded son terminales', () => {
    expect(isTerminalStatus('delivered')).toBe(true)
    expect(isTerminalStatus('refunded')).toBe(true)
  })

  it('pending no es terminal', () => {
    expect(isTerminalStatus('pending')).toBe(false)
  })
})
