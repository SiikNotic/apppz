'use client'

// Perfil premium: arriba identidad (avatar/nombre/correo) + tarjeta de
// membresía real (nivel + puntos, de rewards_accounts / reward_tiers —
// mismas fuentes que /account/rewards, nunca inventadas acá) + listado
// plano de navegación (Pedidos, Rewards, Pago, Direcciones, Favoritos,
// Configuración, Ayuda). Cerrar sesión y Eliminar cuenta viven acá
// mismo, cerca del final — antes solo existían un paso más adentro, en
// /account/settings, lo que las hacía fáciles de no encontrar. La lógica
// es exactamente la misma que ya existía (signOut() de AuthContext,
// insert en account_deletion_requests: una SOLICITUD que el equipo
// procesa a mano siguiendo sus propias reglas de retención — esta app
// nunca borra pedidos, registros de pago ni la cuenta en sí misma sola);
// solo se movió/restyleó la UI que la dispara.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
  LogOut,
  Trash2,
  Wallet,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { fetchRewardsAccount, fetchRewardTiers } from '@/lib/data-access/rewards'
import { fetchCreditBalance } from '@/lib/data-access/cancellations'
import { calculateTierProgress } from '@/lib/business-logic/rewards'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { AvatarUpload } from '@/components/ui/avatar-upload'
import { formatMonthYear, formatCurrency } from '@/lib/format'
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
  const { user, profile, refreshProfile, setAvatarUrl, signOut } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()

  const [ordersCount, setOrdersCount] = useState<number | null>(null)
  const [favoritesCount, setFavoritesCount] = useState<number | null>(null)
  const [rewardsAccount, setRewardsAccount] = useState<RewardsAccount | null>(null)
  const [tiers, setTiers] = useState<RewardTier[]>([])
  const [creditBalance, setCreditBalance] = useState(0)

  const [editOpen, setEditOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [signingOut, setSigningOut] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteReason, setDeleteReason] = useState('')
  const [deleteRequested, setDeleteRequested] = useState(false)

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
      fetchCreditBalance(user.id),
    ]).then(([orders, favorites, account, tierList, balance]) => {
      if (!active) return
      setOrdersCount(orders.count ?? 0)
      setFavoritesCount(favorites.count ?? 0)
      setRewardsAccount(account)
      setTiers(tierList)
      setCreditBalance(balance)
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

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
    router.push('/')
  }

  // Nunca borra nada acá mismo — solo dispara la MISMA solicitud de
  // siempre (account_deletion_requests) para que el equipo la revise y
  // la procese a mano según sus propias reglas de retención (pedidos,
  // pagos, etc. nunca se eliminan solo porque alguien pidió borrar su
  // cuenta). No hay ninguna otra ruta de borrado en la app.
  async function handleRequestDeletion() {
    if (!user) return
    await supabase.from('account_deletion_requests').insert({
      user_id: user.id,
      reason: deleteReason.trim() || null,
    })
    setDeleteOpen(false)
    setDeleteRequested(true)
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

      {/* Pizzeria Credit — Sesión 23. Solo se muestra con saldo > 0: la
          inmensa mayoría de clientes nunca tuvo una cancelación
          reembolsada, y una tarjeta en $0.00 sería ruido sin sentido. */}
      {creditBalance > 0 && (
        <Card className="flex items-center gap-3 border-success-500/25 bg-success-500/[0.06] p-5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-success-500/15 text-success-500">
            <Wallet size={20} aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">{t('account.pizzeriaCredit')}</p>
            <p className="text-xl font-extrabold leading-none text-foreground">{formatCurrency(creditBalance)}</p>
          </div>
        </Card>
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

      {/* Cuenta/Sesión — a propósito visible acá mismo, cerca del final
          del perfil, no un paso más adentro en Configuración: cerrar
          sesión y eliminar cuenta son las dos acciones que alguien busca
          bajo presión (perdió el celular, ya no quiere usar la app) y no
          debería tener que encontrar entre preferencias. Cerrar sesión
          va como botón secundario (ni rojo ni el CTA de marca — no es
          destructivo) y Eliminar cuenta queda claramente aparte, en su
          propia tarjeta con borde tenue en rojo y botón destructivo, para
          que las dos nunca compitan por la misma jerarquía visual. */}
      <div className="space-y-3 pt-1">
        <p className="px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">{t('account.sectionAccount')}</p>

        <Button
          fullWidth
          variant="secondary"
          onClick={handleSignOut}
          disabled={signingOut}
        >
          <LogOut size={16} aria-hidden="true" /> {signingOut ? t('account.signingOut') : t('nav.signOut')}
        </Button>

        <Card className="space-y-3 border-danger-500/20 p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Trash2 size={14} className="text-danger-500" aria-hidden="true" /> {t('account.deleteAccountTitle')}
          </h2>
          <p className="text-xs text-muted-foreground">{t('account.deleteAccountDesc')}</p>
          {deleteRequested ? (
            <p role="status" className="text-xs font-semibold text-success-500">
              {t('account.deleteRequested')}
            </p>
          ) : (
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              {t('account.requestDeletion')}
            </Button>
          )}
        </Card>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <div className="p-6">
            <DialogTitle className="mb-2 text-lg font-extrabold text-foreground">{t('account.deleteConfirmTitle')}</DialogTitle>
            <p className="mb-4 text-sm text-muted-foreground">{t('account.deleteConfirmDesc')}</p>
            <Textarea
              rows={3}
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder={t('account.deleteReasonPlaceholder')}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button variant="destructive" onClick={handleRequestDeletion}>
                {t('account.confirmRequest')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
