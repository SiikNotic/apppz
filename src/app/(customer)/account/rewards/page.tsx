'use client'

// Rewards premium — mismas fuentes de datos y RPCs que antes
// (fetchRewardsAccount, fetchPointsHistory, fetchRewardTiers,
// fetchRewardCatalog, redeemCatalogReward, calculateTierProgress): esta
// sesión solo rediseña la presentación, con acento dorado restringido a
// esta pantalla (rating/rewards, nunca "éxito"). "Formas de ganar" solo
// lista el mecanismo real que existe en el backend (award_points_on_delivery:
// puntos por dólar en cada pedido entregado, tasa real de `settings`) — no
// se inventan reseñas ni referidos, que no tienen ninguna tabla ni RPC
// detrás todavía. "Próxima recompensa" es la más barata del catálogo que
// el saldo actual todavía no alcanza — dato real derivado del catálogo,
// no una recompensa inventada.
import { useEffect, useState } from 'react'
import { Gift, TrendingUp, TrendingDown, Lock, ShoppingBag, Sparkles } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  fetchRewardsAccount,
  fetchPointsHistory,
  fetchRewardTiers,
  fetchRewardCatalog,
  redeemCatalogReward,
} from '@/lib/data-access/rewards'
import { calculateTierProgress } from '@/lib/business-logic/rewards'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ItemThumb } from '@/components/ui/item-thumb'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDate } from '@/lib/format'
import { useLanguage } from '@/contexts/LanguageContext'
import type { RewardsAccount, PointsLedgerEntry, RewardTier, RewardCatalogItem } from '@/lib/types'

export default function RewardsPage() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [account, setAccount] = useState<RewardsAccount | null>(null)
  const [history, setHistory] = useState<PointsLedgerEntry[]>([])
  const [tiers, setTiers] = useState<RewardTier[]>([])
  const [catalog, setCatalog] = useState<RewardCatalogItem[]>([])
  const [pointsPerDollar, setPointsPerDollar] = useState<number | null>(null)
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
      supabase.from('settings').select('value').eq('key', 'rewards.points_per_dollar').maybeSingle(),
    ]).then(([acc, hist, tierList, cat, rate]) => {
      if (!active) return
      setAccount(acc)
      setHistory(hist)
      setTiers(tierList)
      setCatalog(cat)
      setPointsPerDollar(typeof rate.data?.value === 'number' ? rate.data.value : null)
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
      setRedeemedNotice(t('account.redeemed', { name: reward.name }))
      load()
    } catch (err) {
      setRedeemError(err instanceof Error ? err.message : t('account.redeemErrorDefault'))
    } finally {
      setRedeemingId(null)
    }
  }

  if (loading) return <p className="py-16 text-center text-sm text-muted-foreground">{t('common.loading')}</p>

  const progress = calculateTierProgress(account?.lifetime_points ?? 0, tiers)
  const balance = account?.points_balance ?? 0

  // La más barata que el saldo actual todavía no alcanza — "próxima" en
  // el sentido literal de "la siguiente que vas a poder pagar".
  const nextReward = [...catalog].filter((r) => r.points_cost > balance).sort((a, b) => a.points_cost - b.points_cost)[0] ?? null

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">{t('dashboardNav.rewards')}</h1>
        <p className="text-sm text-muted-foreground">{t('account.rewardsSubtitle')}</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(280px,360px)_1fr] lg:items-start">
        {/* Columna izquierda: resumen de membresía + próxima recompensa + formas de ganar */}
        <div className="space-y-5">
          <Card className="overflow-hidden border-gold-500/25 bg-gold-500/[0.06] p-6">
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gold-500/15 text-gold-300">
                <Gift size={26} aria-hidden="true" />
              </span>
              <div>
                {progress.currentTier && <Badge variant="rating" className="mb-1">{progress.currentTier.name}</Badge>}
                <p className="text-3xl font-extrabold leading-none text-foreground">{balance}</p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">{t('account.pts')}</p>
              </div>
            </div>

            {progress.nextTier ? (
              <div className="mt-5">
                <div className="mb-1.5 flex justify-between text-xs font-semibold text-muted-foreground">
                  <span>{progress.currentTier?.name ?? '—'}</span>
                  <span>{progress.nextTier.name}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gold-500 transition-all" style={{ width: `${progress.progressPercent}%` }} />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {t('account.pointsToNextTier', { points: progress.pointsToNextTier, tier: progress.nextTier.name })}
                </p>
              </div>
            ) : (
              progress.currentTier && (
                <p className="mt-4 text-xs text-muted-foreground">
                  {t('account.pointsAvailable', { tier: progress.currentTier.name })}
                </p>
              )
            )}

            {progress.currentTier && Array.isArray(progress.currentTier.benefits) && progress.currentTier.benefits.length > 0 && (
              <ul className="mt-4 space-y-1 border-t border-white/10 pt-4 text-sm text-foreground/90">
                {(progress.currentTier.benefits as string[]).map((b) => (
                  <li key={b} className="flex items-start gap-1.5">
                    <span className="text-gold-300">✓</span> {b}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {nextReward ? (
            <Card className="p-5">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <Sparkles size={13} className="text-gold-300" aria-hidden="true" /> {t('account.nextRewardTitle')}
              </p>
              <div className="flex items-center gap-3">
                <ItemThumb name={nextReward.name} imageUrl={nextReward.image_url} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{nextReward.name}</p>
                  <p className="text-xs font-semibold text-gold-300">
                    {nextReward.points_cost} {t('account.pts')}
                  </p>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gold-500 transition-all"
                  style={{ width: `${Math.min(100, Math.round((balance / nextReward.points_cost) * 100))}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {t('account.nextRewardProgress', { points: nextReward.points_cost - balance })}
              </p>
            </Card>
          ) : (
            catalog.length > 0 && (
              <Card className="p-5">
                <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                  <Sparkles size={15} className="text-gold-300" aria-hidden="true" /> {t('account.allRewardsUnlocked')}
                </p>
              </Card>
            )
          )}

          <Card className="p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">{t('account.waysToEarnTitle')}</p>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gold-500/15 text-gold-300">
                <ShoppingBag size={18} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground">{t('account.earnPerOrderTitle')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('account.earnPerOrderDesc', { rate: pointsPerDollar ?? 1 })}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Columna derecha: catálogo canjeable + historial */}
        <div className="space-y-5">
          <Card className="p-6">
            <h2 className="mb-4 text-sm font-bold text-foreground">{t('account.redeemPoints')}</h2>
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
            {catalog.length === 0 ? (
              <EmptyState icon={<Gift size={28} aria-hidden="true" />} message={t('account.noRewardsYet')} />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {catalog.map((reward) => {
                  const canAfford = balance >= reward.points_cost
                  return (
                    <div
                      key={reward.id}
                      className={`flex items-center gap-3 rounded-2xl border p-4 ${
                        canAfford ? 'border-gold-500/25 bg-gold-500/5' : 'border-border bg-card opacity-70'
                      }`}
                    >
                      <ItemThumb name={reward.name} imageUrl={reward.image_url} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-foreground">{reward.name}</p>
                        {reward.description && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{reward.description}</p>
                        )}
                        <p className="mt-1 text-xs font-semibold text-gold-300">
                          {reward.points_cost} {t('account.pts')}
                        </p>
                        <div className="mt-2">
                          {canAfford ? (
                            <Button size="sm" onClick={() => handleRedeem(reward)} disabled={redeemingId === reward.id}>
                              {redeemingId === reward.id ? t('account.redeeming') : t('account.redeem')}
                            </Button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                              <Lock size={12} aria-hidden="true" />
                              {t('account.missingPoints', { points: reward.points_cost - balance })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 text-sm font-bold text-foreground">{t('account.pointsHistory')}</h2>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('account.noMovements')}</p>
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
                        <p className="font-semibold text-foreground">{entry.reason}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(entry.created_at)}</p>
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
      </div>
    </div>
  )
}
