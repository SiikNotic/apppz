import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DollarSign, ClipboardList, AlertTriangle, TrendingUp } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { StatCard } from '../../components/ui/StatCard'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { formatCurrency, formatDate } from '../../lib/format'
import { ORDER_STATUS_LABELS, type Ingredient, type Order, type OrderStatus } from '../../lib/types'

function startOfToday(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

const STATUS_TONE: Record<OrderStatus, 'brand' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  pending: 'warning',
  confirmed: 'brand',
  preparing: 'brand',
  ready: 'success',
  on_the_way: 'success',
  delivered: 'neutral',
  cancelled: 'danger',
}

export function DashboardPage() {
  const [todayOrders, setTodayOrders] = useState<Order[]>([])
  const [lowStock, setLowStock] = useState<Ingredient[]>([])
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      const [todayRes, ingredientsRes, recentRes] = await Promise.all([
        supabase.from('orders').select('*').gte('created_at', startOfToday()),
        supabase.from('ingredients').select('*').order('name'),
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(6),
      ])
      if (!active) return
      setTodayOrders((todayRes.data ?? []).filter((o) => o.status !== 'cancelled'))
      setLowStock((ingredientsRes.data ?? []).filter((i) => i.stock_quantity <= i.min_stock))
      setRecentOrders(recentRes.data ?? [])
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [])

  const revenueToday = todayOrders.reduce((sum, o) => sum + o.total, 0)
  const activeOrders = todayOrders.filter((o) =>
    ['pending', 'confirmed', 'preparing', 'ready', 'on_the_way'].includes(o.status)
  ).length
  const avgTicket = todayOrders.length > 0 ? revenueToday / todayOrders.length : 0

  if (loading) return <p className="text-sm text-ink-400">Cargando dashboard…</p>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Dashboard</h1>
        <p className="text-sm text-ink-400">Resumen del día de tu dark kitchen.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Ventas de hoy"
          value={formatCurrency(revenueToday)}
          icon={<DollarSign size={20} />}
          tone="brand"
        />
        <StatCard
          label="Pedidos de hoy"
          value={String(todayOrders.length)}
          icon={<ClipboardList size={20} />}
          tone="brand"
          hint={`${activeOrders} en curso`}
        />
        <StatCard
          label="Ticket promedio"
          value={formatCurrency(avgTicket)}
          icon={<TrendingUp size={20} />}
          tone="success"
        />
        <StatCard
          label="Ingredientes bajos"
          value={String(lowStock.length)}
          icon={<AlertTriangle size={20} />}
          tone={lowStock.length > 0 ? 'danger' : 'success'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr,1fr]">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-extrabold text-ink-900">Pedidos recientes</h2>
            <Link to="/admin/pedidos" className="text-xs font-bold text-brand-500">
              Ver todos
            </Link>
          </div>
          <div className="space-y-3">
            {recentOrders.length === 0 && (
              <p className="text-sm text-ink-400">Aún no hay pedidos.</p>
            )}
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-semibold text-ink-900">
                    #{order.order_number} · {order.customer_name}
                  </p>
                  <p className="text-xs text-ink-400">{formatDate(order.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-ink-900">{formatCurrency(order.total)}</span>
                  <Badge tone={STATUS_TONE[order.status as OrderStatus]}>
                    {ORDER_STATUS_LABELS[order.status as OrderStatus]}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-extrabold text-ink-900">Alertas de stock</h2>
            <Link to="/admin/inventario" className="text-xs font-bold text-brand-500">
              Ver inventario
            </Link>
          </div>
          <div className="space-y-3">
            {lowStock.length === 0 && (
              <p className="text-sm text-ink-400">Todo tu inventario está en buen nivel. 🎉</p>
            )}
            {lowStock.map((ing) => (
              <div key={ing.id} className="flex items-center justify-between text-sm">
                <span className="font-semibold text-ink-900">{ing.name}</span>
                <span className="font-semibold text-danger-500">
                  {ing.stock_quantity} / {ing.min_stock} {ing.unit}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
