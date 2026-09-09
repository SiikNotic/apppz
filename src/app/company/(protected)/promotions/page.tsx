'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Tag } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Promotion } from '@/lib/types'

const TYPE_LABELS: Record<string, string> = {
  percentage: 'Porcentaje',
  fixed_amount: 'Monto fijo',
  free_item: 'Producto gratis',
  free_delivery: 'Envío gratis',
  bonus_points: 'Puntos extra',
  buy_x_get_y: 'Compra X lleva Y',
}

interface FormState {
  code: string
  name: string
  type: Promotion['type']
  value: string
  minOrderAmount: string
  usageLimit: string
  usageLimitPerCustomer: string
  startsAt: string
  endsAt: string
  active: boolean
}

const EMPTY: FormState = {
  code: '',
  name: '',
  type: 'percentage',
  value: '10',
  minOrderAmount: '',
  usageLimit: '',
  usageLimitPerCustomer: '1',
  startsAt: '',
  endsAt: '',
  active: true,
}

export default function PromotionsPage() {
  const { can } = useAuth()
  const canManage = can('promotions.manage')
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('promotions').select('*').order('created_at', { ascending: false })
    setPromotions(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY)
    setError(null)
    setFormOpen(true)
  }

  function openEdit(promo: Promotion) {
    setEditingId(promo.id)
    setForm({
      code: promo.code ?? '',
      name: promo.name,
      type: promo.type,
      value: String(promo.value),
      minOrderAmount: promo.min_order_amount != null ? String(promo.min_order_amount) : '',
      usageLimit: promo.usage_limit != null ? String(promo.usage_limit) : '',
      usageLimitPerCustomer: promo.usage_limit_per_customer != null ? String(promo.usage_limit_per_customer) : '',
      startsAt: promo.starts_at?.slice(0, 10) ?? '',
      endsAt: promo.ends_at?.slice(0, 10) ?? '',
      active: promo.active,
    })
    setError(null)
    setFormOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return setError('El nombre es obligatorio.')
    setSaving(true)
    const payload = {
      code: form.code.trim().toUpperCase() || null,
      name: form.name.trim(),
      type: form.type,
      value: Number(form.value) || 0,
      min_order_amount: form.minOrderAmount ? Number(form.minOrderAmount) : null,
      usage_limit: form.usageLimit ? Number(form.usageLimit) : null,
      usage_limit_per_customer: form.usageLimitPerCustomer ? Number(form.usageLimitPerCustomer) : null,
      starts_at: form.startsAt || null,
      ends_at: form.endsAt || null,
      active: form.active,
    }
    const { error } = editingId
      ? await supabase.from('promotions').update(payload).eq('id', editingId)
      : await supabase.from('promotions').insert(payload)
    setSaving(false)
    if (error) return setError(error.message)
    setFormOpen(false)
    load()
  }

  async function toggleActive(promo: Promotion) {
    await supabase.from('promotions').update({ active: !promo.active }).eq('id', promo.id)
    load()
  }

  async function handleDelete(promo: Promotion) {
    if (!confirm(`¿Eliminar la promoción "${promo.name}"?`)) return
    await supabase.from('promotions').delete().eq('id', promo.id)
    load()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">Promociones</h1>
          <p className="text-sm text-ink-400">
            Se validan y aplican automáticamente en el checkout — restricciones de fecha, monto
            mínimo y límites de uso se hacen cumplir en el servidor.
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus size={16} aria-hidden="true" /> Nueva promoción
          </Button>
        )}
      </div>

      <Card className="divide-y divide-ink-100 p-0">
        {loading && <p className="p-5 text-sm text-ink-400">Cargando…</p>}
        {!loading && promotions.length === 0 && (
          <p className="p-5 text-sm text-ink-400">Sin promociones todavía.</p>
        )}
        {promotions.map((promo) => (
          <div key={promo.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-900">
                <Tag size={16} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-bold text-ink-900">{promo.name}</span>
                  {promo.code && <Badge variant="brand">{promo.code}</Badge>}
                  <button onClick={() => canManage && toggleActive(promo)} disabled={!canManage}>
                    <Badge variant={promo.active ? 'success' : 'neutral'}>
                      {promo.active ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </button>
                </div>
                <p className="text-xs text-ink-400">
                  {TYPE_LABELS[promo.type]} ·{' '}
                  {promo.type === 'percentage' ? `${promo.value}%` : formatCurrency(promo.value)}
                  {promo.min_order_amount ? ` · mín. ${formatCurrency(promo.min_order_amount)}` : ''}
                  {promo.ends_at ? ` · vence ${formatDate(promo.ends_at)}` : ''}
                </p>
              </div>
            </div>
            {canManage && (
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  onClick={() => openEdit(promo)}
                  aria-label={`Editar ${promo.name}`}
                  className="grid h-8 w-8 place-items-center rounded-full bg-ink-50 text-ink-600 hover:bg-ink-100"
                >
                  <Pencil size={14} aria-hidden="true" />
                </button>
                <button
                  onClick={() => handleDelete(promo)}
                  aria-label={`Eliminar ${promo.name}`}
                  className="grid h-8 w-8 place-items-center rounded-full bg-red-50 text-danger-500 hover:brightness-95"
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        ))}
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <div className="p-6">
            <DialogTitle className="mb-4 text-lg font-extrabold text-ink-900">
              {editingId ? 'Editar promoción' : 'Nueva promoción'}
            </DialogTitle>
            <div className="space-y-3">
              <div>
                <Label htmlFor="promo-name">Nombre</Label>
                <Input id="promo-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="promo-code">Código (opcional, para que el cliente lo escriba)</Label>
                <Input
                  id="promo-code"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="PIZZA10"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as Promotion['type'] })}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Porcentaje</SelectItem>
                      <SelectItem value="fixed_amount">Monto fijo</SelectItem>
                      <SelectItem value="free_delivery">Envío gratis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="promo-value">
                    {form.type === 'percentage' ? 'Porcentaje (%)' : 'Monto ($)'}
                  </Label>
                  <Input
                    id="promo-value"
                    type="number"
                    step="0.01"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    disabled={form.type === 'free_delivery'}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="promo-min">Monto mínimo de compra (opcional)</Label>
                <Input
                  id="promo-min"
                  type="number"
                  step="0.01"
                  value={form.minOrderAmount}
                  onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="promo-starts">Empieza</Label>
                  <Input id="promo-starts" type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="promo-ends">Termina</Label>
                  <Input id="promo-ends" type="date" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="promo-limit">Límite de usos totales (opcional)</Label>
                  <Input id="promo-limit" type="number" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="promo-limit-customer">Límite por cliente</Label>
                  <Input
                    id="promo-limit-customer"
                    type="number"
                    value={form.usageLimitPerCustomer}
                    onChange={(e) => setForm({ ...form, usageLimitPerCustomer: e.target.value })}
                  />
                </div>
              </div>

              {error && <p role="alert" className="text-xs font-semibold text-danger-500">{error}</p>}
              <Button fullWidth onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar promoción'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
