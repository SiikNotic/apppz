'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Menu, MapPin, User } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { fetchUserAddresses } from '@/lib/data-access/addresses'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { LanguageToggle } from '@/components/ui/language-toggle'
import { BRAND_TAGLINE } from '@/lib/config'

function initialsFor(name?: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

// Fila superior de Home: hamburguesa + ubicación + avatar sobre fondo
// blanco, igual que la referencia — reemplaza la barra roja de sitio web
// que tenía la app antes (esa solo aparecía en la referencia... en
// ningún lado, de hecho: ninguna de las 12 capturas la usa).
export function HomeTopBar() {
  const { user, profile, session } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
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
    <>
      <div className="flex items-center justify-between px-4 pt-5 sm:px-6">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-2xl bg-ink-50 text-ink-900 hover:bg-ink-100"
          aria-label={t('nav.openMenu')}
        >
          <Menu size={20} aria-hidden="true" />
        </button>
        <div className="flex min-w-0 items-center gap-1.5 px-2 text-sm font-semibold text-ink-600">
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

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent className="max-w-xs">
          <div className="p-6">
            <DialogTitle className="mb-4">{t('nav.openMenu')}</DialogTitle>
            <nav className="flex flex-col gap-1">
              <Link href="/help" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-600 hover:bg-ink-50">
                {t('nav.help')}
              </Link>
              <Link href="/terms" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-600 hover:bg-ink-50">
                {t('nav.terms')}
              </Link>
              <Link href="/privacy" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-600 hover:bg-ink-50">
                {t('nav.privacy')}
              </Link>
              <Link href="/accessibility" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-600 hover:bg-ink-50">
                {t('nav.accessibility')}
              </Link>
              <Link href="/company/login" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-600 hover:bg-ink-50">
                {t('nav.companyLogin')}
              </Link>
            </nav>
            <div className="mt-3 flex items-center justify-between border-t border-ink-100 px-3 pt-4">
              <span className="text-sm font-semibold text-ink-600">{t('nav.language')}</span>
              <LanguageToggle />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
