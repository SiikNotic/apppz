'use client'

import { useEffect, useState } from 'react'
import { Gift, TrendingUp, TrendingDown, Lock } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  fetchRewardsAccount,
  fetchPointsHistory,
  fetchRewardTiers,
  fetchRewardCatalog,
  redeemCatalogReward,
} from '@/lib/data-access/rewards'
import { calculateTierProgress } from '@/lib/business-logic/rewards'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ItemThumb } from '@/components/ui/item-thumb'
import { formatDate } from '@/lib/format'
import type { RewardsAccount, PointsLedgerEntry, RewardTier, RewardCatalogItem } from '@/lib/types'

export default function RewardsPage() {
  const { user } = useAuth()
  const [account, setAccount] = useState<RewardsAccount | null>(null)
  const [history, setHistory] = useState<PointsLedgerEntry[]>([])
  const [tiers, setTiers] = useState<RewardTier[]>([])
  const [catalog, setCatalog] = useState<RewardCatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [redeemingId, setRedeemingId] = useState<string | null>(null)
  const [redeemError, setRedeemError] = useState<string | null>(null)
  const [redeemedNotice, setRedeemedNotice] = useState<string | null>(null)

  function load() {
    if (!user) return () => {}
    let active = true
    Promise.all([
      fetchRewardsAccount(user.id),
      fetchPointsHistory(user.id),
      fetchRewardTiers(),
      fetchRewardCatalog(),
    ]).then(([acc, hist, t, cat]) => {
      if (!active) return
      setAccount(acc)
      setHistory(hist)
      setTiers(t)
      setCatalog(cat)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }

  useEffect(() => {
    return load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function handleRedeem(reward: RewardCatalogItem) {
    setRedeemingId(reward.id)
    setRedeemError(null)
    setRedeemedNotice(null)
    try {
      await redeemCatalogReward(reward.id)
      setRedeemedNotice(`¡Canjeaste "${reward.name}"! Muéstraselo al personal para recibirlo.`)
      load()
    } catch (err) {
      setRedeemError(
        err instanceof Error ? err.message : 'No se pudo canjear la recompensa. Intenta de nuevo.'
      )
    } finally {
      setRedeemingId(null)
    }
  }

  if (loading) return <p className="text-sm text-ink-400">Cargando…</p>

  const progress = calculateTierProgress(account?.lifetime_points ?? 0, tiers)
  const balance = account?.points_balance ?? 0

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Rewards</h1>
        <p className="text-sm text-ink-400">Gana puntos con cada compra y canjéalos por recompensas.</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-900">
            <Gift size={26} aria-hidden="true" />
          </span>
          <div>
            <p className="text-3xl font-extrabold text-ink-900">{account?.points_balance ?? 0}</p>
            <p className="text-sm text-ink-400">puntos disponibles · nivel {progress.currentTier?.name ?? 'Bronze'}</p>
          </div>
        </div>

        {progress.nextTier && (
          <div className="mt-5">
            <div className="mb-1.5 flex justify-between text-xs font-semibold text-ink-600">
              <span>{progress.currentTier?.name ?? 'Bronze'}</span>
              <span>{progress.nextTier.name}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-ink-50">
              <div
                className="h-full rounded-full bg-brand-500 transition-all"
                style={{ width: `${progress.progressPercent}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-ink-400">
              {progress.pointsToNextTier} puntos para {progress.nextTier.name}
            </p>
          </div>
        )}

        {progress.currentTier && Array.isArray(progress.currentTier.benefits) && progress.currentTier.benefits.length > 0 && (
          <ul className="mt-4 space-y-1 text-sm text-ink-600">
            {(progress.currentTier.benefits as string[]).map((b) => (
              <li key={b}>✓ {b}</li>
            ))}
          </ul>
        )}
      </Card>

      {catalog.length > 0 && (
        <Card className="p-6">
          <h2 className="mb-4 text-sm font-bold text-ink-900">Canjea tus puntos</h2>
          {redeemedNotice && (
            <p role="status" className="mb-3 text-xs font-semibold text-success-500">
              {redeemedNotice}
            </p>
          )}
          {redeemError && (
            <p role="alert" className="mb-3 text-xs font-semibold text-danger-500">
              {redeemError}
            </p>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {catalog.map((reward) => {
              const canAfford = balance >= reward.points_cost
              return (
                <div
                  key={reward.id}
                  className={`flex items-center gap-3 rounded-2xl border p-4 ${
                    canAfford ? 'border-ink-100 bg-white' : 'border-ink-100 bg-ink-50/60 opacity-75'
                  }`}
                >
                  <ItemThumb name={reward.name} imageUrl={reward.image_url} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink-900">{reward.name}</p>
                    {reward.description && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-ink-400">{reward.description}</p>
                    )}
                    <p className="mt-1 text-xs font-semibold text-brand-900">{reward.points_cost} pts</p>
                    <div className="mt-2">
                      {canAfford ? (
                        <Button
                          size="sm"
                          onClick={() => handleRedeem(reward)}
                          disabled={redeemingId === reward.id}
                        >
                          {redeemingId === reward.id ? 'Canjeando…' : 'Canjear'}
                        </Button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-400">
                          <Lock size={12} aria-hidden="true" />
                          Te faltan {reward.points_cost - balance} puntos
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      <Card className="p-6">
        <h2 className="mb-4 text-sm font-bold text-ink-900">Historial de puntos</h2>
        {history.length === 0 ? (
          <p className="text-sm text-ink-400">Todavía no tienes movimientos.</p>
        ) : (
          <div className="space-y-3">
            {history.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2.5">
                  {entry.delta >= 0 ? (
                    <TrendingUp size={16} className="text-success-500" aria-hidden="true" />
                  ) : (
                    <TrendingDown size={16} className="text-danger-500" aria-hidden="true" />
                  )}
                  <div>
                    <p className="font-semibold text-ink-900">{entry.reason}</p>
                    <p className="text-xs text-ink-400">{formatDate(entry.created_at)}</p>
                  </div>
                </div>
                <span className={`font-bold ${entry.delta >= 0 ? 'text-success-500' : 'text-danger-500'}`}>
                  {entry.delta >= 0 ? '+' : ''}
                  {entry.delta}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
