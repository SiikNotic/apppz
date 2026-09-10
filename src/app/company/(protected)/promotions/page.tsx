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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty-state'
import { BannersManager } from '@/components/company/promotions/banners-manager'
import { formatCurrency, formatDate } from '@/lib/format'
import { useLanguage } from '@/contexts/LanguageContext'
import { PageHeader } from '@/components/company/page-header'
import type { Promotion } from '@/lib/types'

const TYPE_KEYS: Record<string, string> = {
  percentage: 'promotionsAdmin.typePercentage',
  fixed_amount: 'promotionsAdmin.typeFixedAmount',
  free_item: 'promotionsAdmin.typeFreeItem',
  free_delivery: 'promotionsAdmin.typeFreeDelivery',
  bonus_points: 'promotionsAdmin.typeBonusPoints',
  buy_x_get_y: 'promotionsAdmin.typeBuyXGetY',
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
  const { t } = useLanguage()
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
    if (!form.name.trim()) return setError(t('menuMgmt.nameRequired'))
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
    if (!confirm(t('promotionsAdmin.confirmDeletePromo', { name: promo.name }))) return
    await supabase.from('promotions').delete().eq('id', promo.id)
    load()
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('promotionsAdmin.title')}
        subtitle={t('promotionsAdmin.subtitle')}
        actions={
          canManage && (
            <Button onClick={openCreate}>
              <Plus size={16} aria-hidden="true" /> {t('promotionsAdmin.newPromotion')}
            </Button>
          )
        }
      />

      {loading && <p className="py-8 text-center text-sm text-muted-foreground">{t('common.loading')}</p>}
      {!loading && promotions.length === 0 && (
        <EmptyState icon={<Tag size={28} aria-hidden="true" />} message={t('promotionsAdmin.noPromotions')} />
      )}

      {!loading && promotions.length > 0 && (
        <>
          {/* Mobile (< md): tarjeta por promoción. */}
          <div className="space-y-3 md:hidden">
            {promotions.map((promo) => (
              <Card key={promo.id} className="space-y-3 p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-900">
                    <Tag size={16} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-bold text-foreground">{promo.name}</span>
                      {promo.code && <Badge variant="brand">{promo.code}</Badge>}
                      <button onClick={() => canManage && toggleActive(promo)} disabled={!canManage}>
                        <Badge variant={promo.active ? 'success' : 'neutral'}>
                          {promo.active ? t('menuMgmt.activeF') : t('menuMgmt.inactiveF')}
                        </Badge>
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t(TYPE_KEYS[promo.type])} ·{' '}
                      {promo.type === 'percentage' ? `${promo.value}%` : formatCurrency(promo.value)}
                      {promo.min_order_amount
                        ? ` · ${t('promotionsAdmin.minPrefix', { amount: formatCurrency(promo.min_order_amount) })}`
                        : ''}
                      {promo.ends_at ? ` · ${t('promotionsAdmin.expiresPrefix', { date: formatDate(promo.ends_at) })}` : ''}
                    </p>
                  </div>
                </div>
                {canManage && (
                  <div className="flex items-center gap-2 border-t border-border pt-3">
                    <Button size="sm" variant="secondary" onClick={() => openEdit(promo)} className="flex-1">
                      <Pencil size={14} aria-hidden="true" /> {t('common.edit')}
                    </Button>
                    <button
                      onClick={() => handleDelete(promo)}
                      aria-label={t('promotionsAdmin.deleteAria', { name: promo.name })}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-red-50 text-danger-500 hover:brightness-95"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Tablet/Desktop (>= md): tabla real, más densa. */}
          <Card className="hidden overflow-x-auto p-0 md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('menuMgmt.name')}</TableHead>
                  <TableHead>{t('promotionsAdmin.type')}</TableHead>
                  <TableHead>{t('ordersAdmin.status')}</TableHead>
                  <TableHead className="text-right">{t('ordersAdmin.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promotions.map((promo) => (
                  <TableRow key={promo.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{promo.name}</span>
                        {promo.code && <Badge variant="brand">{promo.code}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {t(TYPE_KEYS[promo.type])} ·{' '}
                      {promo.type === 'percentage' ? `${promo.value}%` : formatCurrency(promo.value)}
                      {promo.min_order_amount
                        ? ` · ${t('promotionsAdmin.minPrefix', { amount: formatCurrency(promo.min_order_amount) })}`
                        : ''}
                      {promo.ends_at ? ` · ${t('promotionsAdmin.expiresPrefix', { date: formatDate(promo.ends_at) })}` : ''}
                    </TableCell>
                    <TableCell>
                      <button onClick={() => canManage && toggleActive(promo)} disabled={!canManage}>
                        <Badge variant={promo.active ? 'success' : 'neutral'}>
                          {promo.active ? t('menuMgmt.activeF') : t('menuMgmt.inactiveF')}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell>
                      {canManage && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEdit(promo)}
                            aria-label={t('promotionsAdmin.editAria', { name: promo.name })}
                            className="grid h-8 w-8 place-items-center rounded-full bg-muted text-muted-foreground hover:bg-muted/70"
                          >
                            <Pencil size={14} aria-hidden="true" />
                          </button>
                          <button
                            onClick={() => handleDelete(promo)}
                            aria-label={t('promotionsAdmin.deleteAria', { name: promo.name })}
                            className="grid h-8 w-8 place-items-center rounded-full bg-red-50 text-danger-500 hover:brightness-95"
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      <BannersManager canManage={canManage} />

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <div className="p-6">
            <DialogTitle className="mb-4 text-lg font-extrabold text-ink-900">
              {editingId ? t('promotionsAdmin.editPromoTitle') : t('promotionsAdmin.newPromoTitle')}
            </DialogTitle>
            <div className="space-y-3">
              <div>
                <Label htmlFor="promo-name">{t('menuMgmt.name')}</Label>
                <Input id="promo-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="promo-code">{t('promotionsAdmin.codeLabel')}</Label>
                <Input
                  id="promo-code"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="PIZZA10"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label>{t('promotionsAdmin.type')}</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as Promotion['type'] })}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">{t('promotionsAdmin.typePercentage')}</SelectItem>
                      <SelectItem value="fixed_amount">{t('promotionsAdmin.typeFixedAmount')}</SelectItem>
                      <SelectItem value="free_delivery">{t('promotionsAdmin.typeFreeDelivery')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="promo-value">
                    {form.type === 'percentage' ? t('promotionsAdmin.percentageValue') : t('promotionsAdmin.amountValue')}
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
                <Label htmlFor="promo-min">{t('promotionsAdmin.minOrderAmount')}</Label>
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
                  <Label htmlFor="promo-starts">{t('promotionsAdmin.starts')}</Label>
                  <Input id="promo-starts" type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="promo-ends">{t('promotionsAdmin.ends')}</Label>
                  <Input id="promo-ends" type="date" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="promo-limit">{t('promotionsAdmin.totalUsageLimit')}</Label>
                  <Input id="promo-limit" type="number" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="promo-limit-customer">{t('promotionsAdmin.perCustomerLimit')}</Label>
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
                {saving ? t('menuMgmt.savingButton') : t('promotionsAdmin.savePromo')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
