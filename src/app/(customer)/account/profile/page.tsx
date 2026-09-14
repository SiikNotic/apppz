'use client'

// Perfil premium: arriba solo identidad (avatar/nombre/correo) + una
// tarjeta de membresía real (nivel + puntos, de rewards_accounts /
// reward_tiers — mismas fuentes que /account/rewards, nunca inventadas
// acá). Abajo, un solo listado plano de navegación con ícono+chevron
// (Pedidos, Rewards, Pago, Direcciones, Favoritos, Configuración,
// Ayuda) — sin convertir cada fila en su propia tarjeta grande. Cerrar
// sesión y eliminar cuenta ahora viven en /account/settings.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Pencil,
  MapPin,
  CreditCard,
  ClipboardList,
  Heart,
  Gift,
  Settings as SettingsIcon,
  HelpCircle,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { fetchRewardsAccount, fetchRewardTiers } from '@/lib/data-access/rewards'
import { calculateTierProgress } from '@/lib/business-logic/rewards'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { AvatarUpload } from '@/components/ui/avatar-upload'
import { formatMonthYear } from '@/lib/format'
import { useLanguage } from '@/contexts/LanguageContext'
import type { RewardsAccount, RewardTier } from '@/lib/types'

interface RowProps {
  icon: React.ElementType
  tone: 'brand' | 'success' | 'warning' | 'rating' | 'neutral'
  label: string
  subtitle?: string
  href: string
}

// Mismos pares fondo/texto que ya usan Badge y StatCard — un solo
// vocabulario de "tono" en toda la app en vez de inventar uno nuevo acá.
const TONE_CLASSES: Record<RowProps['tone'], string> = {
  brand: 'bg-brand-500/15 text-brand-300',
  success: 'bg-success-500/15 text-success-300',
  warning: 'bg-warning-500/15 text-warning-300',
  rating: 'bg-gold-500/15 text-gold-300',
  neutral: 'bg-white/10 text-muted-foreground',
}

function NavRow({ icon: Icon, tone, label, subtitle, href }: RowProps) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-accent">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${TONE_CLASSES[tone]}`}>
        <Icon size={18} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-foreground">{label}</span>
        {subtitle && <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>}
      </span>
      <ChevronRight size={18} className="shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  )
}

export default function ProfilePage() {
  const { user, profile, refreshProfile, setAvatarUrl } = useAuth()
  const { t } = useLanguage()

  const [ordersCount, setOrdersCount] = useState<number | null>(null)
  const [favoritesCount, setFavoritesCount] = useState<number | null>(null)
  const [rewardsAccount, setRewardsAccount] = useState<RewardsAccount | null>(null)
  const [tiers, setTiers] = useState<RewardTier[]>([])

  const [editOpen, setEditOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setFullName(profile?.full_name ?? '')
    setPhone(profile?.phone ?? '')
  }, [profile])

  // Conteos reales (nunca inventados) para las filas de Pedidos/Favoritos,
  // más la cuenta de rewards para la tarjeta de membresía — misma fuente
  // que /account/rewards, solo lectura adicional.
  useEffect(() => {
    if (!user) return
    let active = true
    Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('customer_id', user.id),
      supabase.from('favorites').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('target_type', 'product'),
      fetchRewardsAccount(user.id),
      fetchRewardTiers(),
    ]).then(([orders, favorites, account, tierList]) => {
      if (!active) return
      setOrdersCount(orders.count ?? 0)
      setFavoritesCount(favorites.count ?? 0)
      setRewardsAccount(account)
      setTiers(tierList)
    })
    return () => {
      active = false
    }
  }, [user])

  async function handleSave() {
    if (!user) return
    setSaving(true)
    setError(null)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), phone: phone.trim() || null })
      .eq('id', user.id)
    setSaving(false)
    if (error) return setError(error.message)
    await refreshProfile()
    setEditOpen(false)
  }

  const progress = calculateTierProgress(rewardsAccount?.lifetime_points ?? 0, tiers)
  const tierName = progress.currentTier?.name ?? rewardsAccount?.tier ?? null

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Card className="p-6">
        <div className="flex items-center gap-4">
          {user && (
            <AvatarUpload
              userId={user.id}
              url={profile?.avatar_url ?? null}
              name={fullName || profile?.full_name}
              email={user.email}
              size={80}
              onUpdated={setAvatarUrl}
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="truncate text-lg font-extrabold text-foreground">{fullName || t('account.profileTitle')}</h1>
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/10 text-muted-foreground hover:bg-white/15 hover:text-foreground"
                aria-label={t('account.editProfile')}
              >
                <Pencil size={12} aria-hidden="true" />
              </button>
            </div>
            <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
            {profile?.created_at && (
              <p className="truncate text-xs text-muted-foreground">
                {t('account.memberSince', { date: formatMonthYear(profile.created_at) })}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Membresía — tarjeta premium con acento dorado restringido, la
          misma fuente de datos que /account/rewards (rewards_accounts +
          reward_tiers vía calculateTierProgress). Si todavía no hay una
          cuenta cargada no se muestra nada inventado. */}
      {rewardsAccount && (
        <Link href="/account/rewards">
          <Card className="overflow-hidden border-gold-500/25 bg-gold-500/[0.06] p-5 transition hover:border-gold-500/40">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gold-500/15 text-gold-300">
                  <Gift size={20} aria-hidden="true" />
                </span>
                <div>
                  {tierName && (
                    <Badge variant="rating" className="mb-1">
                      {tierName}
                    </Badge>
                  )}
                  <p className="text-2xl font-extrabold leading-none text-foreground">
                    {rewardsAccount.points_balance}
                    <span className="ml-1 text-xs font-bold text-muted-foreground">{t('account.pts')}</span>
                  </p>
                </div>
              </div>
              <ChevronRight size={18} className="shrink-0 text-muted-foreground" aria-hidden="true" />
            </div>

            {progress.nextTier && (
              <div className="mt-4">
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gold-500 transition-all"
                    style={{ width: `${progress.progressPercent}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {t('account.pointsToNextTier', { points: progress.pointsToNextTier, tier: progress.nextTier.name })}
                </p>
              </div>
            )}
          </Card>
        </Link>
      )}

      <Card className="divide-y divide-border overflow-hidden p-0">
        <NavRow
          icon={ClipboardList}
          tone="warning"
          label={t('account.navOrders')}
          subtitle={ordersCount !== null ? t('account.rowOrdersCount', { count: ordersCount }) : undefined}
          href="/account/orders"
        />
        <NavRow
          icon={Gift}
          tone="rating"
          label={t('account.navRewards')}
          subtitle={t('account.rowRewardsSubtitle')}
          href="/account/rewards"
        />
        <NavRow icon={CreditCard} tone="success" label={t('account.navPayment')} href="/account/payment-methods" />
        <NavRow icon={MapPin} tone="brand" label={t('account.navAddresses')} href="/account/addresses" />
        <NavRow
          icon={Heart}
          tone="brand"
          label={t('account.navFavorites')}
          subtitle={favoritesCount !== null ? t('account.rowFavoritesCount', { count: favoritesCount }) : undefined}
          href="/account/favorites"
        />
        <NavRow
          icon={SettingsIcon}
          tone="neutral"
          label={t('account.navSettings')}
          subtitle={t('account.rowSettingsSubtitle')}
          href="/account/settings"
        />
        <NavRow icon={HelpCircle} tone="neutral" label={t('account.navHelp')} subtitle={t('account.rowHelpSubtitle')} href="/help" />
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm">
          <div className="p-6">
            <DialogTitle className="mb-4 text-lg font-extrabold text-foreground">{t('account.editProfile')}</DialogTitle>
            <div className="space-y-3">
              <div>
                <Label htmlFor="profile-name">{t('auth.fullName')}</Label>
                <Input id="profile-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="profile-phone">{t('auth.phone')}</Label>
                <Input id="profile-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="profile-email">{t('auth.email')}</Label>
                <Input id="profile-email" value={user?.email ?? ''} disabled />
              </div>
              {error && (
                <p role="alert" className="text-xs font-semibold text-danger-500">
                  {error}
                </p>
              )}
              <Button fullWidth onClick={handleSave} disabled={saving}>
                {saving ? t('account.saving') : t('account.saveChanges')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
