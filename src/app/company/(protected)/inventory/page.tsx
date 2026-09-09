'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, PackagePlus, PackageMinus, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, formatNumber } from '@/lib/format'
import { useLanguage } from '@/contexts/LanguageContext'
import type { Ingredient } from '@/lib/types'

const UNITS = ['unidad', 'kg', 'g', 'l', 'ml']

interface IngredientFormState {
  id?: string
  name: string
  unit: string
  stock_quantity: string
  min_stock: string
  cost_per_unit: string
  supplier: string
}

const EMPTY_FORM: IngredientFormState = {
  name: '',
  unit: 'kg',
  stock_quantity: '0',
  min_stock: '0',
  cost_per_unit: '0',
  supplier: '',
}

export default function InventoryPage() {
  const { profile } = useAuth()
  const { t } = useLanguage()
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<IngredientFormState>(EMPTY_FORM)
  const [adjustTarget, setAdjustTarget] = useState<Ingredient | null>(null)
  const [adjustQty, setAdjustQty] = useState('')
  const [adjustType, setAdjustType] = useState<'in' | 'out'>('in')
  const [adjustReason, setAdjustReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('ingredients').select('*').order('name')
    if (!error) setIngredients(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function openCreate() {
    setForm(EMPTY_FORM)
    setError(null)
    setFormOpen(true)
  }

  function openEdit(ing: Ingredient) {
    setForm({
      id: ing.id,
      name: ing.name,
      unit: ing.unit,
      stock_quantity: String(ing.stock_quantity),
      min_stock: String(ing.min_stock),
      cost_per_unit: String(ing.cost_per_unit),
      supplier: ing.supplier ?? '',
    })
    setError(null)
    setFormOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return setError(t('menuMgmt.nameRequired'))
    setSaving(true)
    setError(null)
    const payload = {
      name: form.name.trim(),
      unit: form.unit,
      stock_quantity: Number(form.stock_quantity) || 0,
      min_stock: Number(form.min_stock) || 0,
      cost_per_unit: Number(form.cost_per_unit) || 0,
      supplier: form.supplier.trim() || null,
    }

    const { error } = form.id
      ? await supabase.from('ingredients').update(payload).eq('id', form.id)
      : await supabase.from('ingredients').insert(payload)

    setSaving(false)
    if (error) return setError(error.message)
    setFormOpen(false)
    load()
  }

  async function handleDelete(ing: Ingredient) {
    if (!confirm(t('inventoryAdmin.confirmDeleteIngredient', { name: ing.name }))) return
    const { error } = await supabase.from('ingredients').delete().eq('id', ing.id)
    if (!error) load()
  }

  function openAdjust(ing: Ingredient, type: 'in' | 'out') {
    setAdjustTarget(ing)
    setAdjustType(type)
    setAdjustQty('')
    setAdjustReason('')
    setError(null)
  }

  async function handleAdjustSubmit() {
    if (!adjustTarget) return
    const qty = Number(adjustQty)
    if (!qty || qty <= 0) return setError(t('inventoryAdmin.invalidQuantity'))
    setSaving(true)
    setError(null)

    const delta = adjustType === 'in' ? qty : -qty
    const newStock = Math.max(0, adjustTarget.stock_quantity + delta)

    const { error: updateError } = await supabase
      .from('ingredients')
      .update({ stock_quantity: newStock })
      .eq('id', adjustTarget.id)

    if (updateError) {
      setSaving(false)
      return setError(updateError.message)
    }

    await supabase.from('inventory_movements').insert({
      ingredient_id: adjustTarget.id,
      type: adjustType,
      quantity: qty,
      reason: adjustReason.trim() || null,
      created_by: profile?.id ?? null,
    })

    setSaving(false)
    setAdjustTarget(null)
    load()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">{t('inventoryAdmin.title')}</h1>
          <p className="text-sm text-ink-400">{t('inventoryAdmin.subtitle')}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} /> {t('inventoryAdmin.newIngredient')}
        </Button>
      </div>

      {loading && <p className="py-8 text-center text-sm text-ink-400">{t('common.loading')}</p>}
      {!loading && ingredients.length === 0 && (
        <Card className="py-8 text-center text-sm text-ink-400">{t('inventoryAdmin.noIngredients')}</Card>
      )}

      {/* Cards en vez de tabla: en mobile una columna sin scroll horizontal,
          en tablet dos, en desktop tres — nunca una tabla forzada a caber. */}
      {!loading && ingredients.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ingredients.map((ing) => {
            const low = ing.stock_quantity <= ing.min_stock
            return (
              <Card key={ing.id} className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-sm font-bold text-ink-900">
                      {low && <AlertTriangle size={14} className="shrink-0 text-danger-500" aria-hidden="true" />}
                      <span className="truncate">{ing.name}</span>
                    </p>
                    <p className="text-xs text-ink-400">{ing.supplier || t('inventoryAdmin.noSupplier')}</p>
                  </div>
                  <Badge variant={low ? 'danger' : 'success'} className="shrink-0">
                    {formatNumber(ing.stock_quantity)} {ing.unit}
                  </Badge>
                </div>

                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <dt className="text-ink-400">{t('inventoryAdmin.minimum')}</dt>
                  <dd className="text-right font-semibold text-ink-600">
                    {formatNumber(ing.min_stock)} {ing.unit}
                  </dd>
                  <dt className="text-ink-400">{t('inventoryAdmin.costPerUnit')}</dt>
                  <dd className="text-right font-semibold text-ink-600">{formatCurrency(ing.cost_per_unit)}</dd>
                </dl>

                <div className="mt-auto flex items-center justify-between gap-1.5 border-t border-ink-100 pt-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openAdjust(ing, 'in')}
                      className="grid h-9 w-9 place-items-center rounded-full bg-green-50 text-success-500 hover:brightness-95"
                      aria-label={t('inventoryAdmin.registerInAria', { name: ing.name })}
                      title={t('inventoryAdmin.registerIn')}
                    >
                      <PackagePlus size={16} aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => openAdjust(ing, 'out')}
                      className="grid h-9 w-9 place-items-center rounded-full bg-amber-50 text-warning-500 hover:brightness-95"
                      aria-label={t('inventoryAdmin.registerOutAria', { name: ing.name })}
                      title={t('inventoryAdmin.registerOut')}
                    >
                      <PackageMinus size={16} aria-hidden="true" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEdit(ing)}
                      className="grid h-9 w-9 place-items-center rounded-full bg-ink-50 text-ink-600 hover:bg-ink-100"
                      aria-label={t('inventoryAdmin.editAria', { name: ing.name })}
                      title={t('common.edit')}
                    >
                      <Pencil size={14} aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => handleDelete(ing)}
                      className="grid h-9 w-9 place-items-center rounded-full bg-red-50 text-danger-500 hover:brightness-95"
                      aria-label={t('inventoryAdmin.deleteAria', { name: ing.name })}
                      title={t('common.delete')}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <div className="p-6">
            <DialogTitle className="mb-4 text-lg font-extrabold text-ink-900">
              {form.id ? t('inventoryAdmin.editIngredientTitle') : t('inventoryAdmin.newIngredientTitle')}
            </DialogTitle>
            <div className="space-y-3">
              <div>
                <Label>{t('menuMgmt.name')}</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label>{t('inventoryAdmin.unit')}</Label>
                  <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('inventoryAdmin.costPerUnitLabel')}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.cost_per_unit}
                    onChange={(e) => setForm({ ...form, cost_per_unit: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label>{t('inventoryAdmin.currentStock')}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.stock_quantity}
                    onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                    disabled={!!form.id}
                  />
                </div>
                <div>
                  <Label>{t('inventoryAdmin.minStock')}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.min_stock}
                    onChange={(e) => setForm({ ...form, min_stock: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>{t('inventoryAdmin.supplierOptional')}</Label>
                <Input
                  value={form.supplier}
                  onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                />
              </div>
              {form.id && <p className="text-[11px] text-ink-400">{t('inventoryAdmin.stockChangeHint')}</p>}
              {error && <p className="text-xs font-semibold text-danger-500">{error}</p>}
              <Button fullWidth onClick={handleSave} disabled={saving}>
                {saving ? t('menuMgmt.savingButton') : t('common.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!adjustTarget} onOpenChange={(open) => !open && setAdjustTarget(null)}>
        <DialogContent className="max-w-sm">
          {adjustTarget && (
            <div className="p-6">
              <DialogTitle className="mb-1 text-lg font-extrabold text-ink-900">
                {adjustType === 'in' ? t('inventoryAdmin.registerIn') : t('inventoryAdmin.registerOut')}
              </DialogTitle>
              <p className="mb-4 text-sm text-ink-400">{adjustTarget.name}</p>
              <div className="space-y-3">
                <div>
                  <Label>{t('inventoryAdmin.quantityUnit', { unit: adjustTarget.unit })}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <Label>{t('inventoryAdmin.reasonOptional')}</Label>
                  <Input
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder={adjustType === 'in' ? t('inventoryAdmin.reasonInPlaceholder') : t('inventoryAdmin.reasonOutPlaceholder')}
                  />
                </div>
                {error && <p className="text-xs font-semibold text-danger-500">{error}</p>}
                <Button fullWidth onClick={handleAdjustSubmit} disabled={saving}>
                  {saving ? t('menuMgmt.savingButton') : t('common.confirm')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
