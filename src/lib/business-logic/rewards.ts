import type { RewardTier } from '@/lib/types'

export interface TierProgress {
  currentTier: RewardTier | null
  nextTier: RewardTier | null
  pointsToNextTier: number
  progressPercent: number
}

/**
 * Calcula el progreso de nivel para mostrarlo en la UI (ej. "750 puntos
 * para Gold"). Los tiers en sí (umbrales, beneficios) vienen de la tabla
 * reward_tiers — configurable desde el dashboard, nunca hardcodeada aquí.
 */
export function calculateTierProgress(lifetimePoints: number, tiers: RewardTier[]): TierProgress {
  const sorted = [...tiers].sort((a, b) => a.min_lifetime_points - b.min_lifetime_points)
  let currentTier: RewardTier | null = null
  let nextTier: RewardTier | null = null

  for (let i = 0; i < sorted.length; i++) {
    if (lifetimePoints >= sorted[i].min_lifetime_points) {
      currentTier = sorted[i]
      nextTier = sorted[i + 1] ?? null
    }
  }

  if (!nextTier) {
    return { currentTier, nextTier: null, pointsToNextTier: 0, progressPercent: 100 }
  }

  const base = currentTier?.min_lifetime_points ?? 0
  const span = nextTier.min_lifetime_points - base
  const progressed = lifetimePoints - base
  const progressPercent = span > 0 ? Math.min(100, Math.round((progressed / span) * 100)) : 0

  return {
    currentTier,
    nextTier,
    pointsToNextTier: Math.max(0, nextTier.min_lifetime_points - lifetimePoints),
    progressPercent,
  }
}
