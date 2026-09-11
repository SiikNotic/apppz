'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  UtensilsCrossed,
  BarChart3,
  LogOut,
  ChefHat,
  Flame,
  Users,
  Tag,
  Gift,
  Bike,
  Truck,
  Settings,
  Menu,
  X,
  UserPlus,
  MessageCircleWarning,
  Home,
  BellRing,
  Volume2,
  LogIn,
  Clock,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { LanguageToggle } from '@/components/ui/language-toggle'
import { supabase } from '@/lib/supabase'
import { useNewOrderAlert } from '@/hooks/useNewOrderAlert'
import { useStaffClock } from '@/hooks/useStaffClock'
import { BRAND_NAME } from '@/lib/config'
import { NAV_ITEMS_BY_PERMISSION } from '@/lib/auth/permissions'
import type { Driver } from '@/lib/types'

// Mapea cada ruta del nav a su clave en dashboardNav (translations.ts).
// Las labels en NAV_ITEMS_BY_PERMISSION ya venían hardcodeadas en inglés
// — esto las hace bilingües de verdad sin tocar esa lista (la usan otros
// consumidores) ni perder el fallback si alguna ruta nueva no está mapeada.
const NAV_LABEL_KEYS: Record<string, string> = {
  '/company/dashboard': 'dashboard',
  '/company/kitchen': 'kitchen',
  '/company/menu': 'menu',
  '/company/customers': 'customers',
  '/company/support': 'support',
  '/company/team': 'team',
  '/company/promotions': 'promotions',
  '/company/rewards': 'rewards',
  '/company/drivers': 'drivers',
  '/company/analytics': 'analytics',
  '/company/settings': 'settings',
  '/company/inventory': 'inventory',
  '/company/driver': 'myDeliveries',
  '/company/driver/earnings': 'driverEarnings',
}

// Rutas que ya tienen página implementada — controla qué aparece en el nav.
const IMPLEMENTED_ROUTES = new Set([
  '/company/dashboard',
  '/company/kitchen',
  '/company/menu',
  '/company/customers',
  '/company/team',
  '/company/promotions',
  '/company/rewards',
  '/company/drivers',
  '/company/driver',
  '/company/driver/earnings',
  '/company/analytics',
  '/company/settings',
  '/company/support',
])

const ICONS: Record<string, LucideIcon> = {
  '/company/dashboard': LayoutDashboard,
  '/company/kitchen': Flame,
  '/company/menu': UtensilsCrossed,
  '/company/customers': Users,
  '/company/team': UserPlus,
  '/company/promotions': Tag,
  '/company/rewards': Gift,
  '/company/drivers': Bike,
  '/company/driver': Truck,
  '/company/driver/earnings': Wallet,
  '/company/analytics': BarChart3,
  '/company/settings': Settings,
  '/company/support': MessageCircleWarning,
}

const ROLE_KEYS: Record<string, string> = {
  owner: 'teamAdmin.roleOwner',
  admin: 'teamAdmin.roleAdmin',
  manager: 'teamAdmin.roleManager',
  kitchen: 'teamAdmin.roleKitchen',
  cashier: 'teamAdmin.roleCashier',
  driver: 'teamAdmin.roleDriver',
  staff: 'teamAdmin.roleStaff',
}

// Estado real del conductor (drivers.status) para la píldora del menú móvil
// estilo "app de reparto" — nada de niveles/insignias inventados, solo lo
// que ya existe en el esquema.
const DRIVER_STATUS_KEYS: Record<Driver['status'], string> = {
  offline: 'driverPage.statusOffline',
  available: 'driverPage.statusAvailable',
  on_delivery: 'driverPage.statusOnDelivery',
}
const DRIVER_STATUS_DOT: Record<Driver['status'], string> = {
  offline: 'bg-white/40',
  available: 'bg-success-500',
  on_delivery: 'bg-brand-500',
}

/** Iniciales para el avatar circular del sidebar — "Ana López" → "AL",
 *  sin nombre cae al correo, sin ninguno de los dos cae a "?". */
function initialsFor(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email || ''
  if (!source) return '?'
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return source.slice(0, 2).toUpperCase()
}

function CompanyChrome({ children }: { children: ReactNode }) {
  const { profile, user, can, signOut } = useAuth()
  const { t } = useLanguage()
  const pathname = usePathname()
  const router = useRouter()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { isDriver: isClockDriver, openShift, loading: clockLoading, busy: clockBusy, toggle: toggleClock } = useStaffClock()
  const isDriverRole = profile?.company_role === 'driver'

  // Datos reales para el encabezado del menú móvil del conductor (ver
  // DriverMobileMenu más abajo) — conteo de entregas completadas y estado
  // actual (drivers.status). Nunca niveles/insignias inventados, solo lo
  // que ya existe en el esquema.
  const [driverHero, setDriverHero] = useState<{ deliveredCount: number; status: Driver['status'] | null }>({
    deliveredCount: 0,
    status: null,
  })
  useEffect(() => {
    if (!isDriverRole || !user) return
    let active = true
    async function loadDriverHero() {
      if (!user) return
      const [{ count }, { data: driverRow }] = await Promise.all([
        supabase
          .from('delivery_assignments')
          .select('id', { count: 'exact', head: true })
          .eq('driver_id', user.id)
          .eq('status', 'delivered'),
        supabase.from('drivers').select('status').eq('user_id', user.id).maybeSingle(),
      ])
      if (!active) return
      setDriverHero({ deliveredCount: count ?? 0, status: driverRow?.status ?? null })
    }
    loadDriverHero()
    const channel = supabase
      .channel(`driver-hero-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'delivery_assignments', filter: `driver_id=eq.${user.id}` },
        loadDriverHero
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers', filter: `user_id=eq.${user.id}` }, loadDriverHero)
      .subscribe()
    return () => {
      active = false
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDriverRole, user?.id])

  async function handleClockToggle() {
    const { error } = await toggleClock()
    if (error) alert(t('teamAdmin.clockActionFailed'))
  }

  // Reportes de soporte abiertos: visible en TODO el dashboard (no solo en
  // /company/support) mediante un badge en el nav + la misma alerta
  // visual/audible que ya usa Cocina para pedidos nuevos (useNewOrderAlert
  // es genérico — se reutiliza aquí en vez de duplicar el mecanismo).
  const canSeeSupport = can('customers.view')
  const [openReportIds, setOpenReportIds] = useState<string[]>([])
  useEffect(() => {
    if (!canSeeSupport) return
    let active = true
    async function loadOpenReports() {
      const { data } = await supabase.from('issue_reports').select('id').neq('status', 'resolved')
      if (active) setOpenReportIds((data ?? []).map((r) => r.id))
    }
    loadOpenReports()
    const channel = supabase
      .channel('support-reports-alert')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issue_reports' }, loadOpenReports)
      .subscribe()
    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [canSeeSupport])
  const { alertActive, needsUnlock, unlock, dismiss } = useNewOrderAlert(openReportIds)

  const navItems = NAV_ITEMS_BY_PERMISSION.filter(
    (item) => IMPLEMENTED_ROUTES.has(item.href) && can(item.permission)
  )
  // Inventario sigue siendo parte de "Menu/Products" para esta dark kitchen.
  const items = [
    ...navItems,
    ...(can('inventory.manage')
      ? [{ href: '/company/inventory', label: 'Inventory', permission: 'inventory.manage' as const }]
      : []),
    // "Mis entregas" es específico del rol de conductor, no de un permiso
    // compartido con otros roles — no tendría sentido que lo vea cocina o
    // administración, así que se filtra por company_role directamente.
    ...(profile?.company_role === 'driver'
      ? [
          { href: '/company/driver', label: 'Mis entregas', permission: 'orders.view' as const },
          { href: '/company/driver/earnings', label: 'Horas y pagos', permission: 'orders.view' as const },
        ]
      : []),
  ]

  async function handleSignOut() {
    await signOut()
    router.push('/company/login')
  }

  return (
    <div className="min-h-screen bg-background lg:flex">
      <a
        href="#company-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-foreground focus:shadow-pop"
      >
        {t('common.skipToContent')}
      </a>
      <aside className="hidden w-64 shrink-0 flex-col justify-between bg-ink-900 p-5 text-white lg:flex">
        <div>
          <Link
            href="/"
            title={t('nav.viewSite')}
            className="mb-8 flex items-center gap-2.5 rounded-2xl px-1 py-1 -mx-1 transition hover:bg-white/5"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-500 text-white">
              <ChefHat size={20} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold leading-tight">{BRAND_NAME}</p>
              <p className="text-[11px] text-white/50">{t('nav.companyDashboard')}</p>
            </div>
          </Link>
          <nav aria-label={t('common.mainNav')} className="space-y-1">
            {items.map(({ href, label }) => {
              const isActive = pathname === href
              const Icon = ICONS[href] ?? Package
              const unreadCount = href === '/company/support' ? openReportIds.length : 0
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition',
                    isActive
                      ? 'bg-brand-500 text-white'
                      : 'text-white/60 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span className="flex-1">{NAV_LABEL_KEYS[href] ? t(`dashboardNav.${NAV_LABEL_KEYS[href]}`) : label}</span>
                  {unreadCount > 0 && (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-danger-500 px-1 text-[10px] font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="space-y-3 border-t border-white/10 pt-4">
          <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-500 text-xs font-extrabold text-white">
              {initialsFor(profile?.full_name, user?.email)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{profile?.full_name || user?.email}</p>
              <p className="truncate text-[11px] uppercase tracking-wide text-white/40">
                {profile?.company_role && ROLE_KEYS[profile.company_role] ? t(ROLE_KEYS[profile.company_role]) : t('teamAdmin.roleStaff')}
              </p>
            </div>
          </div>
          {/* Fichaje de horas — conductores ya lo hacen desde /company/driver,
              este control es para el resto del personal (ver useStaffClock). */}
          {!isClockDriver && !clockLoading && (
            <button
              onClick={handleClockToggle}
              disabled={clockBusy}
              className={cn(
                'flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition disabled:opacity-60',
                openShift ? 'bg-success-500/15 text-success-500 hover:bg-success-500/25' : 'text-white/60 hover:bg-white/10 hover:text-white'
              )}
            >
              {openShift ? <Clock size={18} aria-hidden="true" /> : <LogIn size={18} aria-hidden="true" />}
              <span className="min-w-0 flex-1 text-left">
                {openShift ? t('teamAdmin.clockOut') : t('teamAdmin.clockIn')}
                {openShift && (
                  <span className="block truncate text-[10px] font-normal normal-case opacity-80">
                    {t('teamAdmin.clockedInSince', {
                      time: new Date(openShift.clock_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    })}
                  </span>
                )}
              </span>
            </button>
          )}
          <Link
            href="/"
            className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-white/60 hover:bg-white/10 hover:text-white"
          >
            <Home size={18} aria-hidden="true" />
            {t('nav.viewSite')}
          </Link>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-white/60 hover:bg-white/10 hover:text-white"
          >
            <LogOut size={18} aria-hidden="true" />
            {t('nav.signOut')}
          </button>
          <LanguageToggle className="mx-1" variant="dark" />
        </div>
      </aside>

      {/* Barra superior para móvil: con 10+ secciones no cabían como iconos
          en una barra inferior, así que en móvil se navega desde un menú
          de pantalla completa (mismas secciones que el sidebar de escritorio). */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-ink-900 px-4 py-3 text-white lg:hidden">
        <Link href="/" title={t('nav.viewSite')} className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-brand-500 text-white">
            <ChefHat size={18} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold leading-tight">{BRAND_NAME}</p>
            {/* Sesión actual siempre visible: con varias cuentas de prueba
                (owner, cocina, conductor…) es fácil no notar con cuál
                quedaste conectado — sobre todo porque los permisos se
                aplican de verdad en el servidor, no solo se ocultan botones. */}
            <p className="truncate text-[10px] text-white/50">
              {profile?.full_name || user?.email} ·{' '}
              {profile?.company_role && ROLE_KEYS[profile.company_role] ? t(ROLE_KEYS[profile.company_role]) : t('teamAdmin.roleStaff')}
            </p>
          </div>
        </Link>
        <button
          onClick={() => setMobileNavOpen(true)}
          aria-label={t('common.openMenu')}
          aria-expanded={mobileNavOpen}
          className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 hover:bg-white/20"
        >
          <Menu size={20} aria-hidden="true" />
        </button>
      </header>

      {mobileNavOpen && isDriverRole && (
        // Menú del conductor: mismo overlay, pero con la cabecera tipo app
        // de reparto que pidió el usuario — nombre, entregas completadas
        // (dato real) y puesto/estado real en vez de niveles inventados.
        // Solo se ve para company_role='driver'; cocina/admin/etc. siguen
        // con el menú de abajo, sin tocar.
        // Panel lateral, no pantalla completa: deja ver detrás (el mapa,
        // el contenido de la página) igual que la referencia que mandó el
        // usuario, en vez de tapar todo.
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            onClick={() => setMobileNavOpen(false)}
            aria-label={t('common.closeMenu')}
            className="absolute inset-0 animate-in fade-in bg-black/50 duration-200"
          />
          <div className="absolute inset-y-0 left-0 flex w-[82%] max-w-xs animate-in slide-in-from-left flex-col bg-ink-900 text-white shadow-2xl duration-200">
            <div className="relative bg-gradient-to-b from-[#12503f] to-ink-900 px-5 pb-6 pt-5">
              <button
                onClick={() => setMobileNavOpen(false)}
                aria-label={t('common.closeMenu')}
                className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20"
              >
                <X size={18} aria-hidden="true" />
              </button>
              <p className="pr-12 text-2xl font-black leading-tight">{profile?.full_name || user?.email}</p>
              <p className="mt-1 text-sm text-white/70">
                {t('driverPage.deliveriesCompletedStat', { count: driverHero.deliveredCount })}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-bold">
                  <Truck size={13} aria-hidden="true" /> {t(ROLE_KEYS.driver)}
                </span>
                {driverHero.status && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-bold">
                    <span className={cn('h-1.5 w-1.5 rounded-full', DRIVER_STATUS_DOT[driverHero.status])} aria-hidden="true" />
                    {t(DRIVER_STATUS_KEYS[driverHero.status])}
                  </span>
                )}
              </div>
            </div>

            <nav aria-label={t('common.mainNav')} className="flex-1 space-y-1 overflow-y-auto px-4 py-3">
              {items.map(({ href, label }) => {
                const isActive = pathname === href
                const Icon = ICONS[href] ?? Package
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => setMobileNavOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl px-3.5 py-3 text-base font-semibold transition',
                      isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    <Icon size={20} aria-hidden="true" />
                    <span className="flex-1">{NAV_LABEL_KEYS[href] ? t(`dashboardNav.${NAV_LABEL_KEYS[href]}`) : label}</span>
                  </Link>
                )
              })}
            </nav>

            <div className="space-y-1 border-t border-white/10 px-4 py-4">
              <Link
                href="/"
                onClick={() => setMobileNavOpen(false)}
                className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-base font-semibold text-white/70 hover:bg-white/5 hover:text-white"
              >
                <Home size={20} aria-hidden="true" />
                {t('nav.viewSite')}
              </Link>
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-base font-semibold text-white/70 hover:bg-white/5 hover:text-white"
              >
                <LogOut size={20} aria-hidden="true" />
                {t('nav.signOut')}
              </button>
              <LanguageToggle className="mx-1 mt-2" variant="dark" />
            </div>
          </div>
        </div>
      )}

      {mobileNavOpen && !isDriverRole && (
        // Panel lateral, no pantalla completa — deja ver el resto de la
        // página detrás, se cierra tocando fuera igual que cualquier menú
        // de app real.
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            onClick={() => setMobileNavOpen(false)}
            aria-label={t('common.closeMenu')}
            className="absolute inset-0 animate-in fade-in bg-black/50 duration-200"
          />
          <div className="absolute inset-y-0 left-0 flex w-[82%] max-w-xs animate-in slide-in-from-left flex-col bg-ink-900 text-white shadow-2xl duration-200">
            {/* Mismo diseño que el menú del conductor (hero con gradiente +
                píldoras de puesto/estado real + nav con resalte suave) —
                aquí el estado es el turno de fichaje (useStaffClock), no el
                de una entrega, pero es el mismo patrón visual. */}
            <div className="relative bg-gradient-to-b from-brand-900 to-ink-900 px-5 pb-6 pt-5">
              <button
                onClick={() => setMobileNavOpen(false)}
                aria-label={t('common.closeMenu')}
                className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20"
              >
                <X size={18} aria-hidden="true" />
              </button>
              <p className="pr-12 text-2xl font-black leading-tight">{profile?.full_name || user?.email}</p>
              <p className="mt-1 text-sm text-white/70">
                {openShift
                  ? t('teamAdmin.clockedInSince', {
                      time: new Date(openShift.clock_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    })
                  : t('nav.companyDashboard')}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-bold">
                  {profile?.company_role && ROLE_KEYS[profile.company_role] ? t(ROLE_KEYS[profile.company_role]) : t('teamAdmin.roleStaff')}
                </span>
                {!isClockDriver && !clockLoading && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-bold">
                    <span className={cn('h-1.5 w-1.5 rounded-full', openShift ? 'bg-success-500' : 'bg-white/40')} aria-hidden="true" />
                    {openShift ? t('nav.onDutyPill') : t('nav.offDutyPill')}
                  </span>
                )}
              </div>
            </div>

            <nav aria-label={t('common.mainNav')} className="flex-1 space-y-1 overflow-y-auto px-4 py-3">
              {items.map(({ href, label }) => {
                const isActive = pathname === href
                const Icon = ICONS[href] ?? Package
                const unreadCount = href === '/company/support' ? openReportIds.length : 0
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => setMobileNavOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl px-3.5 py-3 text-base font-semibold transition',
                      isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    <Icon size={20} aria-hidden="true" />
                    <span className="flex-1">{NAV_LABEL_KEYS[href] ? t(`dashboardNav.${NAV_LABEL_KEYS[href]}`) : label}</span>
                    {unreadCount > 0 && (
                      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-danger-500 px-1 text-[10px] font-bold text-white">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                )
              })}
            </nav>

            <div className="space-y-1 border-t border-white/10 px-4 py-4">
              {!isClockDriver && !clockLoading && (
                <button
                  onClick={handleClockToggle}
                  disabled={clockBusy}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-base font-semibold transition disabled:opacity-60',
                    openShift ? 'bg-success-500/15 text-success-500 hover:bg-success-500/25' : 'text-white/70 hover:bg-white/5 hover:text-white'
                  )}
                >
                  {openShift ? <Clock size={20} aria-hidden="true" /> : <LogIn size={20} aria-hidden="true" />}
                  {openShift ? t('teamAdmin.clockOut') : t('teamAdmin.clockIn')}
                </button>
              )}
              <Link
                href="/"
                onClick={() => setMobileNavOpen(false)}
                className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-base font-semibold text-white/70 hover:bg-white/5 hover:text-white"
              >
                <Home size={20} aria-hidden="true" />
                {t('nav.viewSite')}
              </Link>
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-base font-semibold text-white/70 hover:bg-white/5 hover:text-white"
              >
                <LogOut size={20} aria-hidden="true" />
                {t('nav.signOut')}
              </button>
              <LanguageToggle className="mx-1 mt-2" variant="dark" />
            </div>
          </div>
        </div>
      )}

      <main id="company-main" className="min-w-0 flex-1 space-y-4 p-4 pb-6 sm:p-6">
        {/* Visible en cualquier página del dashboard, no solo en Soporte —
            si alguien necesita ayuda, el equipo debe enterarse esté donde
            esté. Se omite en /company/support porque ya está viendo la
            lista completa ahí mismo. */}
        {pathname !== '/company/support' && needsUnlock && (
          <button
            onClick={unlock}
            className="flex w-full items-center gap-2 rounded-2xl bg-muted px-4 py-3 text-sm font-semibold text-muted-foreground hover:bg-muted/70"
          >
            <Volume2 size={16} aria-hidden="true" />
            {t('support.enableAlertSound')}
          </button>
        )}
        {pathname !== '/company/support' && alertActive && (
          <div
            role="status"
            className="flex items-center justify-between gap-3 rounded-2xl bg-danger-500 px-4 py-3 font-bold text-white shadow-pop"
          >
            <span className="flex items-center gap-2">
              <BellRing size={18} aria-hidden="true" /> {t('support.newReportAlert')}
            </span>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/company/support"
                onClick={dismiss}
                className="rounded-full bg-white/20 px-3 py-1 text-xs hover:bg-white/30"
              >
                {t('support.viewLink')}
              </Link>
              <button onClick={dismiss} aria-label={t('kitchen.closeAlert')} className="rounded-full p-1 hover:bg-white/20">
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
        {children}
      </main>
    </div>
  )
}

export default function ProtectedCompanyLayout({ children }: { children: ReactNode }) {
  const { session, loading, isCompanyStaff } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!session) {
      router.replace('/company/login')
    } else if (!isCompanyStaff) {
      // Un cliente autenticado no tiene por qué ver el dashboard de la
      // compañía — lo mandamos de vuelta a su propia cuenta.
      router.replace('/account/profile')
    }
  }, [loading, session, isCompanyStaff, router])

  if (loading || !session || !isCompanyStaff) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink-900">
        <p className="text-sm font-semibold text-white/70">{t('common.loading')}</p>
      </div>
    )
  }

  return <CompanyChrome>{children}</CompanyChrome>
}
