'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { DollarSign, ShoppingCart, Receipt, Trophy } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { formatCurrency } from '@/lib/format'
import type { Order, OrderItem } from '@/lib/types'

const RANGES = [
  { key: 7, label: '7 días' },
  { key: 14, label: '14 días' },
  { key: 30, label: '30 días' },
] as const

export default function ReportsPage() {
  const [rangeDays, setRangeDays] = useState<number>(7)
  const [orders, setOrders] = useState<Order[]>([])
  const [items, setItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const since = new Date()
      since.setDate(since.getDate() - (rangeDays - 1))
      since.setHours(0, 0, 0, 0)

      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', since.toISOString())
        .neq('status', 'cancelled')
        .order('created_at')

      const orderIds = (ordersData ?? []).map((o) => o.id)
      const { data: itemsData } =
        orderIds.length > 0
          ? await supabase.from('order_items').select('*').in('order_id', orderIds)
          : { data: [] }

      if (!active) return
      setOrders(ordersData ?? [])
      setItems(itemsData ?? [])
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [rangeDays])

  const dailySeries = useMemo(() => {
    const buckets = new Map<string, number>()
    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
      buckets.set(key, 0)
    }
    for (const order of orders) {
      const key = new Date(order.created_at).toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
      })
      buckets.set(key, (buckets.get(key) ?? 0) + order.total)
    }
    return Array.from(buckets.entries()).map(([date, total]) => ({ date, total }))
  }, [orders, rangeDays])

  const topItems = useMemo(() => {
    const byName = new Map<string, { quantity: number; revenue: number }>()
    for (const item of items) {
      const entry = byName.get(item.item_name) ?? { quantity: 0, revenue: 0 }
      entry.quantity += item.quantity
      entry.revenue += item.subtotal
      byName.set(item.item_name, entry)
    }
    return Array.from(byName.entries())
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 6)
  }, [items])

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0)
  const totalOrders = orders.length
  const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0
  const itemsSold = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">Reportes de ventas</h1>
          <p className="text-sm text-ink-400">Analiza el desempeño de tu dark kitchen.</p>
        </div>
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRangeDays(r.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                rangeDays === r.key ? 'bg-brand-500 text-white shadow-card' : 'bg-white text-ink-600'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-ink-400">Cargando reportes…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Ingresos"
              value={formatCurrency(totalRevenue)}
              icon={<DollarSign size={20} />}
            />
            <StatCard label="Pedidos" value={String(totalOrders)} icon={<ShoppingCart size={20} />} />
            <StatCard
              label="Ticket promedio"
              value={formatCurrency(avgTicket)}
              icon={<Receipt size={20} />}
              tone="success"
            />
            <StatCard label="Items vendidos" value={String(itemsSold)} icon={<Trophy size={20} />} tone="warning" />
          </div>

          <Card className="p-5">
            <h2 className="mb-4 text-base font-extrabold text-ink-900">Ventas por día</h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailySeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1dcbe" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#7a746b" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#7a746b" width={70} tickFormatter={(v) => formatCurrency(Number(v))} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="total" fill="#f2601c" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 text-base font-extrabold text-ink-900">Productos más vendidos</h2>
            <div className="space-y-3">
              {topItems.length === 0 && (
                <p className="text-sm text-ink-400">Sin ventas en este periodo.</p>
              )}
              {topItems.map(([name, data], i) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-600">
                      {i + 1}
                    </span>
                    <span className="font-semibold text-ink-900">{name}</span>
                    <span className="text-xs text-ink-400">{data.quantity} unidades</span>
                  </div>
                  <span className="font-bold text-ink-900">{formatCurrency(data.revenue)}</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
