'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, User } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { fetchUserAddresses } from '@/lib/data-access/addresses'
import { BRAND_TAGLINE } from '@/lib/config'

function initialsFor(name?: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

// Fila superior de Home: ubicación + avatar sobre fondo blanco, igual que
// la referencia — reemplaza la barra roja de sitio web que tenía la app
// antes (esa no aparecía en ninguna de las 12 capturas de referencia).
// El botón de hamburguesa que abría Ayuda/Términos/Privacidad/etc. se
// quitó: esos enlaces ya viven en el footer de cada página, un segundo
// menú acá era redundante.
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
    <div className="flex items-center justify-between px-4 pt-5 sm:px-6">
      <div className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-ink-600">
        <MapPin size={14} className="shrink-0 text-brand-500" aria-hidden="true" />
        <span className="truncate">{locationLabel ?? BRAND_TAGLINE}</span>
      </div>
      <button
        type="button"
        onClick={() => router.push(session ? '/account/profile' : '/login')}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-500 text-xs font-extrabold text-white"
        aria-label={session ? t('nav.account') : t('nav.login')}
      >
        {session ? initialsFor(profile?.full_name || user?.email) : <User size={18} aria-hidden="true" />}
      </button>
    </div>
  )
}
