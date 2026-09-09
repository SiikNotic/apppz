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
import { DollarSign, ShoppingCart, Receipt, Trophy, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/ui/stat-card'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Order, OrderItem } from '@/lib/types'

// Convierte un valor de celda a texto seguro para CSV: si contiene coma,
// comilla o salto de línea hay que envolverlo en comillas y duplicar las
// comillas internas (RFC 4180) — si no, un nombre de cliente con coma
// rompería las columnas al abrir el archivo en Excel/Sheets.
function csvCell(value: string | number): string {
  const str = String(value)
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  // ﻿ (BOM) al inicio para que Excel detecte UTF-8 y no rompa acentos.
  const csv = '﻿' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

const RANGES = [
  { key: 7, label: '7 días' },
  { key: 14, label: '14 días' },
  { key: 30, label: '30 días' },
] as const

export default function ReportsPage() {
  const { can } = useAuth()
  const canView = can('analytics.view')
  const [rangeDays, setRangeDays] = useState<number>(7)
  const [orders, setOrders] = useState<Order[]>([])
  const [items, setItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!canView) {
      setLoading(false)
      return
    }
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
  }, [rangeDays, canView])

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

  function exportOrdersCsv() {
    downloadCsv(`pedidos_${rangeDays}dias_${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Pedido', 'Fecha', 'Cliente', 'Tipo', 'Estado', 'Subtotal', 'Envío', 'Total'],
      ...orders.map((o) => [
        o.order_number,
        formatDate(o.created_at),
        o.customer_name,
        o.order_type === 'delivery' ? 'Domicilio' : 'Recoger',
        o.status,
        o.subtotal,
        o.delivery_fee,
        o.total,
      ]),
    ])
  }

  function exportTopItemsCsv() {
    downloadCsv(`productos_mas_vendidos_${rangeDays}dias_${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Producto', 'Unidades vendidas', 'Ingresos'],
      ...topItems.map(([name, data]) => [name, data.quantity, data.revenue]),
    ])
  }

  if (!canView) {
    return (
      <Card className="flex flex-col items-center gap-2 p-10 text-center">
        <p className="text-sm text-ink-400">No tienes permiso para ver esta sección.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">Reportes de ventas</h1>
          <p className="text-sm text-ink-400">Analiza el desempeño de tu dark kitchen.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRangeDays(r.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                rangeDays === r.key ? 'bg-brand-500 text-ink-900 shadow-card' : 'bg-white text-ink-600'
              }`}
            >
              {r.label}
            </button>
          ))}
          <Button size="sm" variant="secondary" onClick={exportOrdersCsv} disabled={loading || orders.length === 0}>
            <Download size={14} aria-hidden="true" /> Descargar pedidos (CSV)
          </Button>
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
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-extrabold text-ink-900">Productos más vendidos</h2>
              {topItems.length > 0 && (
                <Button size="sm" variant="secondary" onClick={exportTopItemsCsv}>
                  <Download size={14} aria-hidden="true" /> CSV
                </Button>
              )}
            </div>
            <div className="space-y-3">
              {topItems.length === 0 && (
                <p className="text-sm text-ink-400">Sin ventas en este periodo.</p>
              )}
              {topItems.map(([name, data], i) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-900">
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
