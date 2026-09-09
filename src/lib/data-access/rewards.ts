import { supabase } from '@/lib/supabase'
import type { RewardsAccount, PointsLedgerEntry, RewardTier, RewardCatalogItem } from '@/lib/types'

export async function fetchRewardsAccount(userId: string): Promise<RewardsAccount | null> {
  const { data, error } = await supabase.from('rewards_accounts').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data
}

export async function fetchPointsHistory(userId: string): Promise<PointsLedgerEntry[]> {
  const { data, error } = await supabase
    .from('points_ledger')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function fetchRewardTiers(): Promise<RewardTier[]> {
  const { data, error } = await supabase
    .from('reward_tiers')
    .select('*')
    .eq('active', true)
    .order('sort_order')
  if (error) throw error
  return data ?? []
}

/** Canjea puntos propios; el balance se valida en el servidor (redeem_points RPC). */
export async function redeemPoints(points: number, reason: string): Promise<RewardsAccount> {
  const { data, error } = await supabase.rpc('redeem_points', { p_points: points, p_reason: reason })
  if (error) throw error
  return data as unknown as RewardsAccount
}

/** Catálogo de recompensas canjeables activas y vigentes — RLS ya filtra por active/expires_at. */
export async function fetchRewardCatalog(): Promise<RewardCatalogItem[]> {
  const { data, error } = await supabase
    .from('reward_catalog')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return data ?? []
}

/**
 * Canjea una recompensa específica del catálogo. El balance de puntos y la
 * disponibilidad/vencimiento de la recompensa se validan en el servidor
 * (redeem_catalog_reward RPC) — nunca solo en el frontend.
 */
export async function redeemCatalogReward(rewardId: string): Promise<RewardsAccount> {
  const { data, error } = await supabase.rpc('redeem_catalog_reward', { p_reward_id: rewardId })
  if (error) throw error
  return data as unknown as RewardsAccount
}
