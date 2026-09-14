'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MapPin, User, Receipt } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { fetchUserAddresses } from '@/lib/data-access/addresses'
import { BRAND_TAGLINE } from '@/lib/config'

function initialsFor(name?: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

// Fila superior de Home: ubicación (con jerarquía de dos líneas: label +
// dirección real) + acceso rápido a "Mis pedidos" + avatar. Compacta a
// propósito (sin padding vertical extra) para no comerse espacio de
// pantalla en mobile — el resto del home ya tiene bastante contenido.
export function HomeTopBar() {
  const { user, profile, session } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()
  const [locationLabel, setLocationLabel] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    if (!user) {
      setLocationLabel(null)
      return
    }
    fetchUserAddresses(user.id).then((addresses) => {
      if (!active) return
      const primary = addresses.find((a) => a.is_default) ?? addresses[0]
      setLocationLabel(primary ? `${primary.street}, ${primary.city}` : null)
    })
    return () => {
      active = false
    }
  }, [user])

  return (
    <div className="flex items-center justify-between gap-2 px-4 pt-5 sm:px-6">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <MapPin size={11} className="shrink-0 text-brand-500" aria-hidden="true" />
          {t('home.deliverTo')}
        </span>
        <span className="max-w-[52vw] truncate text-sm font-bold text-foreground sm:max-w-xs">
          {locationLabel ?? BRAND_TAGLINE}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/account/orders"
          className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground transition hover:bg-accent"
          aria-label={t('home.ordersQuickAccess')}
          title={t('home.ordersQuickAccess')}
        >
          <Receipt size={17} aria-hidden="true" />
        </Link>
        <button
          type="button"
          onClick={() => router.push(session ? '/account/profile' : '/login')}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-500 text-xs font-extrabold text-white"
          aria-label={session ? t('nav.account') : t('nav.login')}
        >
          {session ? initialsFor(profile?.full_name || user?.email) : <User size={18} aria-hidden="true" />}
        </button>
      </div>
    </div>
  )
}
