'use client'

import { useEffect, useState } from 'react'
import { MessageCircleWarning, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/format'
import { ISSUE_REPORT_CATEGORY_LABELS, type IssueReport, type Order } from '@/lib/types'

type ReportWithOrder = IssueReport & { order: Pick<Order, 'order_number' | 'customer_name'> | null }

const STATUS_LABELS: Record<string, string> = {
  open: 'Abierto',
  in_progress: 'En proceso',
  resolved: 'Resuelto',
}

export default function SupportPage() {
  const { can, profile } = useAuth()
  const canManage = can('customers.view')
  const [reports, setReports] = useState<ReportWithOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [showResolved, setShowResolved] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('issue_reports')
      .select('*, order:orders(order_number, customer_name)')
      .order('created_at', { ascending: false })
    setReports((data ?? []) as ReportWithOrder[])
    setLoading(false)
  }

  useEffect(() => {
    if (!canManage) {
      setLoading(false)
      return
    }
    load()
    const channel = supabase
      .channel('support-reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issue_reports' }, load)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage])

  async function resolve(report: ReportWithOrder) {
    setBusyId(report.id)
    await supabase
      .from('issue_reports')
      .update({ status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: profile?.id })
      .eq('id', report.id)
    setBusyId(null)
  }

  if (!canManage) {
    return (
      <Card className="flex flex-col items-center gap-2 p-10 text-center">
        <MessageCircleWarning size={28} className="text-ink-200" aria-hidden="true" />
        <p className="text-sm text-ink-400">No tienes permiso para ver esta sección.</p>
      </Card>
    )
  }

  const visible = reports.filter((r) => showResolved || r.status !== 'resolved')

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">Soporte</h1>
          <p className="text-sm text-ink-400">Reportes de clientes sobre sus pedidos.</p>
        </div>
        <button
          onClick={() => setShowResolved((v) => !v)}
          className="text-sm font-semibold text-brand-900 hover:underline"
        >
          {showResolved ? 'Ocultar resueltos' : 'Mostrar resueltos'}
        </button>
      </div>

      <Card className="divide-y divide-ink-100 p-0">
        {loading && <p className="p-5 text-sm text-ink-400">Cargando…</p>}
        {!loading && visible.length === 0 && (
          <p className="p-5 text-sm text-ink-400">Sin reportes pendientes.</p>
        )}
        {visible.map((report) => (
          <div key={report.id} className="flex items-start justify-between gap-3 px-5 py-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-ink-900">
                  {report.order ? `Pedido #${report.order.order_number}` : 'Pedido eliminado'}
                </span>
                <Badge variant="brand">{ISSUE_REPORT_CATEGORY_LABELS[report.category] ?? report.category}</Badge>
                <Badge variant={report.status === 'resolved' ? 'success' : report.status === 'in_progress' ? 'warning' : 'danger'}>
                  {STATUS_LABELS[report.status] ?? report.status}
                </Badge>
              </div>
              {report.order?.customer_name && (
                <p className="mt-1 text-xs text-ink-400">{report.order.customer_name}</p>
              )}
              {report.description && <p className="mt-1.5 text-sm text-ink-600">{report.description}</p>}
              <p className="mt-1 text-xs text-ink-400">{formatDate(report.created_at)}</p>
            </div>
            {report.status !== 'resolved' && (
              <Button
                size="sm"
                variant="secondary"
                className="shrink-0"
                disabled={busyId === report.id}
                onClick={() => resolve(report)}
              >
                <CheckCircle2 size={14} aria-hidden="true" /> Resolver
              </Button>
            )}
          </div>
        ))}
      </Card>
    </div>
  )
}
