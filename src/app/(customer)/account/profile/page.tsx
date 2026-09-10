'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Pencil,
  MapPin,
  CreditCard,
  ClipboardList,
  Heart,
  Gift,
  Globe,
  HelpCircle,
  Share2,
  LogOut,
  ChevronRight,
  Trash2,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { LanguageToggle } from '@/components/ui/language-toggle'
import { useLanguage } from '@/contexts/LanguageContext'
import { BASE_PATH } from '@/lib/base-path'
import { BRAND_NAME } from '@/lib/config'
import { cn } from '@/lib/utils'

function initialsFor(name?: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

interface RowProps {
  icon: React.ElementType
  tone: 'brand' | 'success' | 'warning' | 'info' | 'neutral'
  label: string
  subtitle?: string
  href?: string
  onClick?: () => void
  right?: React.ReactNode
}

const TONE_CLASSES: Record<RowProps['tone'], string> = {
  brand: 'bg-brand-50 text-brand-500',
  success: 'bg-success-500/10 text-success-500',
  warning: 'bg-warning-500/10 text-warning-500',
  info: 'bg-blue-50 text-blue-500',
  neutral: 'bg-ink-50 text-ink-600',
}

function Row({ icon: Icon, tone, label, subtitle, href, onClick, right }: RowProps) {
  const content = (
    <>
      <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-2xl', TONE_CLASSES[tone])}>
        <Icon size={18} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-ink-900">{label}</span>
        {subtitle && <span className="block truncate text-xs text-ink-400">{subtitle}</span>}
      </span>
      {right ?? <ChevronRight size={18} className="shrink-0 text-ink-300" aria-hidden="true" />}
    </>
  )
  const className = 'flex items-center gap-3 px-4 py-3.5'
  return href ? (
    <Link href={href} className={cn(className, 'hover:bg-ink-50')}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cn(className, 'w-full text-left hover:bg-ink-50')}>
      {content}
    </button>
  )
}

export default function ProfilePage() {
  const { user, profile, refreshProfile, signOut } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()

  const [ordersCount, setOrdersCount] = useState<number | null>(null)
  const [favoritesCount, setFavoritesCount] = useState<number | null>(null)

  const [editOpen, setEditOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteReason, setDeleteReason] = useState('')
  const [deleteRequested, setDeleteRequested] = useState(false)

  const [shareNotice, setShareNotice] = useState(false)

  useEffect(() => {
    setFullName(profile?.full_name ?? '')
    setPhone(profile?.phone ?? '')
  }, [profile])

  // Solo dos estadísticas reales — no se inventa una de "Reseñas" porque
  // este negocio no tiene esa función.
  useEffect(() => {
    if (!user) return
    let active = true
    async function loadStats() {
      const [orders, favorites] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('customer_id', user!.id),
        supabase
          .from('favorites')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user!.id)
          .eq('target_type', 'product'),
      ])
      if (!active) return
      setOrdersCount(orders.count ?? 0)
      setFavoritesCount(favorites.count ?? 0)
    }
    loadStats()
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

  async function handleRequestDeletion() {
    if (!user) return
    await supabase.from('account_deletion_requests').insert({
      user_id: user.id,
      reason: deleteReason.trim() || null,
    })
    setDeleteOpen(false)
    setDeleteRequested(true)
  }

  async function handleShare() {
    const url = `${window.location.origin}${BASE_PATH}/`
    const shareData = { title: BRAND_NAME, text: t('account.shareText'), url }
    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        // El usuario canceló el share sheet — no es un error real.
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setShareNotice(true)
      setTimeout(() => setShareNotice(false), 2500)
    } catch {
      // Clipboard no disponible — no hay más fallback razonable.
    }
  }

  return (
    <div className="space-y-5">
      <Card className="mx-auto max-w-lg p-6">
        <div className="flex items-center gap-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-brand-500 text-xl font-extrabold text-white">
            {initialsFor(fullName || user?.email)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="truncate text-lg font-extrabold text-ink-900">{fullName || t('account.profileTitle')}</h1>
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink-50 text-ink-600 hover:bg-ink-100"
                aria-label={t('account.editProfile')}
              >
                <Pencil size={12} aria-hidden="true" />
              </button>
            </div>
            <p className="truncate text-sm text-ink-400">{user?.email}</p>
            {phone && <p className="truncate text-sm text-ink-400">{phone}</p>}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 divide-x divide-ink-100 rounded-2xl bg-ink-50/60 py-3">
          <Link href="/account/orders" className="text-center">
            <span className="block text-xl font-extrabold text-ink-900">{ordersCount ?? '—'}</span>
            <span className="block text-xs font-semibold text-ink-400">{t('account.navOrders')}</span>
          </Link>
          <Link href="/account/favorites" className="text-center">
            <span className="block text-xl font-extrabold text-ink-900">{favoritesCount ?? '—'}</span>
            <span className="block text-xs font-semibold text-ink-400">{t('account.navFavorites')}</span>
          </Link>
        </div>
      </Card>

      <div className="mx-auto max-w-lg space-y-5">
        <div>
          <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-ink-400">
            {t('account.sectionAccount')}
          </p>
          <Card className="divide-y divide-ink-100 overflow-hidden p-0">
            <Row icon={MapPin} tone="brand" label={t('account.navAddresses')} href="/account/addresses" />
            <Row icon={CreditCard} tone="success" label={t('account.navPayment')} href="/account/payment-methods" />
          </Card>
        </div>

        <div>
          <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-ink-400">
            {t('account.sectionActivity')}
          </p>
          <Card className="divide-y divide-ink-100 overflow-hidden p-0">
            <Row
              icon={ClipboardList}
              tone="warning"
              label={t('account.navOrders')}
              subtitle={t('account.rowOrdersSubtitle')}
              href="/account/orders"
            />
            <Row
              icon={Heart}
              tone="brand"
              label={t('account.navFavorites')}
              subtitle={t('account.rowFavoritesSubtitle')}
              href="/account/favorites"
            />
            <Row
              icon={Gift}
              tone="info"
              label={t('account.navRewards')}
              subtitle={t('account.rowRewardsSubtitle')}
              href="/account/rewards"
            />
          </Card>
        </div>

        <div>
          <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-ink-400">
            {t('account.sectionPreferences')}
          </p>
          <Card className="overflow-hidden p-0">
            <Row icon={Globe} tone="info" label={t('nav.language')} right={<LanguageToggle />} />
          </Card>
        </div>

        <div>
          <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-ink-400">
            {t('account.sectionSupport')}
          </p>
          <Card className="divide-y divide-ink-100 overflow-hidden p-0">
            <Row icon={HelpCircle} tone="neutral" label={t('nav.help')} href="/help" />
            <Row icon={Share2} tone="neutral" label={t('account.rowShare')} onClick={handleShare} />
          </Card>
          {shareNotice && <p className="mt-2 px-1 text-xs font-semibold text-success-500">{t('account.shareCopied')}</p>}
        </div>

        <button
          type="button"
          onClick={async () => {
            await signOut()
            router.push('/')
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-danger-500/10 px-4 py-3.5 text-sm font-bold text-danger-500 hover:bg-danger-500/15"
        >
          <LogOut size={16} aria-hidden="true" /> {t('nav.signOut')}
        </button>

        <Card className="space-y-3 p-6">
          <h2 className="flex items-center gap-2 text-sm font-bold text-ink-900">
            <Trash2 size={14} className="text-danger-500" aria-hidden="true" /> {t('account.deleteAccountTitle')}
          </h2>
          <p className="text-xs text-ink-400">{t('account.deleteAccountDesc')}</p>
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm">
          <div className="p-6">
            <DialogTitle className="mb-4 text-lg font-extrabold text-ink-900">
              {t('account.editProfile')}
            </DialogTitle>
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
              {error && <p role="alert" className="text-xs font-semibold text-danger-500">{error}</p>}
              <Button fullWidth onClick={handleSave} disabled={saving}>
                {saving ? t('account.saving') : t('account.saveChanges')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <div className="p-6">
            <DialogTitle className="mb-2 text-lg font-extrabold text-ink-900">
              {t('account.deleteConfirmTitle')}
            </DialogTitle>
            <p className="mb-4 text-sm text-ink-600">{t('account.deleteConfirmDesc')}</p>
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
    </div>
  )
}
