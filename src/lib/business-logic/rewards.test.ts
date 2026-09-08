import { describe, it, expect } from 'vitest'
import { calculateTierProgress } from './rewards'
import type { RewardTier } from '@/lib/types'

function tier(name: string, min: number): RewardTier {
  return {
    id: name,
    name,
    min_lifetime_points: min,
    sort_order: min,
    benefits: [],
    active: true,
  }
}

const TIERS = [tier('Bronze', 0), tier('Silver', 500), tier('Gold', 2000), tier('VIP', 5000)]

describe('calculateTierProgress', () => {
  it('un cliente nuevo empieza en Bronze con progreso hacia Silver', () => {
    const progress = calculateTierProgress(0, TIERS)
    expect(progress.currentTier?.name).toBe('Bronze')
    expect(progress.nextTier?.name).toBe('Silver')
    expect(progress.pointsToNextTier).toBe(500)
    expect(progress.progressPercent).toBe(0)
  })

  it('calcula el porcentaje de avance entre dos niveles', () => {
    // 250 de 500 necesarios para pasar de Bronze (0) a Silver (500) = 50%
    const progress = calculateTierProgress(250, TIERS)
    expect(progress.progressPercent).toBe(50)
    expect(progress.pointsToNextTier).toBe(250)
  })

  it('reconoce el nivel más alto alcanzado exactamente en el umbral', () => {
    const progress = calculateTierProgress(2000, TIERS)
    expect(progress.currentTier?.name).toBe('Gold')
    expect(progress.nextTier?.name).toBe('VIP')
  })

  it('el nivel más alto no tiene siguiente nivel y el progreso es 100%', () => {
    const progress = calculateTierProgress(10000, TIERS)
    expect(progress.currentTier?.name).toBe('VIP')
    expect(progress.nextTier).toBeNull()
    expect(progress.progressPercent).toBe(100)
  })
})
