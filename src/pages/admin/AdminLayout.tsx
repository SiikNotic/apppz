import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  UtensilsCrossed,
  ClipboardList,
  BarChart3,
  LogOut,
  ChefHat,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../../contexts/AuthContext'
import { BRAND_NAME } from '../../lib/config'

const NAV_ITEMS = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/pedidos', label: 'Pedidos', icon: ClipboardList },
  { to: '/admin/inventario', label: 'Inventario', icon: Package },
  { to: '/admin/menu', label: 'Menú', icon: UtensilsCrossed },
  { to: '/admin/reportes', label: 'Reportes', icon: BarChart3 },
]

export function AdminLayout() {
  const { profile, user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen bg-cream-100 lg:flex">
      <aside className="hidden w-64 shrink-0 flex-col justify-between bg-ink-900 p-5 text-white lg:flex">
        <div>
          <div className="mb-8 flex items-center gap-2.5 px-1">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-500">
              <ChefHat size={20} />
            </span>
            <div>
              <p className="text-sm font-extrabold leading-tight">{BRAND_NAME}</p>
              <p className="text-[11px] text-white/50">Panel de administración</p>
            </div>
          </div>
          <nav className="space-y-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition',
                    isActive ? 'bg-brand-500 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'
                  )
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="space-y-3 border-t border-white/10 pt-4">
          <div className="px-1">
            <p className="truncate text-sm font-semibold">{profile?.full_name || user?.email}</p>
            <p className="text-[11px] uppercase tracking-wide text-white/40">
              {profile?.role === 'admin' ? 'Administrador' : 'Staff'}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-white/60 hover:bg-white/10 hover:text-white"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Nav inferior para móvil */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-ink-100 bg-white px-1 py-2 lg:hidden">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-[10px] font-semibold',
                isActive ? 'text-brand-500' : 'text-ink-400'
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <main className="min-w-0 flex-1 p-4 pb-24 sm:p-6 lg:pb-6">
        <Outlet />
      </main>
    </div>
  )
}
