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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatNumber } from '@/lib/format'
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
    if (!form.name.trim()) return setError('El nombre es obligatorio.')
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
    if (!confirm(`¿Eliminar "${ing.name}" del inventario?`)) return
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
    if (!qty || qty <= 0) return setError('Ingresa una cantidad válida.')
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
          <h1 className="text-2xl font-extrabold text-ink-900">Inventario</h1>
          <p className="text-sm text-ink-400">Controla el stock de ingredientes de tu cocina.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} /> Nuevo ingrediente
        </Button>
      </div>

      <Card className="overflow-x-auto p-0">
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow>
              <TableHead>Ingrediente</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Mínimo</TableHead>
              <TableHead>Costo/unidad</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-ink-400">
                  Cargando…
                </TableCell>
              </TableRow>
            )}
            {!loading && ingredients.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-ink-400">
                  No hay ingredientes registrados.
                </TableCell>
              </TableRow>
            )}
            {ingredients.map((ing) => {
              const low = ing.stock_quantity <= ing.min_stock
              return (
                <TableRow key={ing.id}>
                  <TableCell className="font-semibold text-ink-900">
                    <div className="flex items-center gap-2">
                      {low && <AlertTriangle size={14} className="text-danger-500" />}
                      {ing.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={low ? 'danger' : 'success'}>
                      {formatNumber(ing.stock_quantity)} {ing.unit}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-ink-600">
                    {formatNumber(ing.min_stock)} {ing.unit}
                  </TableCell>
                  <TableCell className="text-ink-600">{formatCurrency(ing.cost_per_unit)}</TableCell>
                  <TableCell className="text-ink-600">{ing.supplier || '—'}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openAdjust(ing, 'in')}
                        className="grid h-8 w-8 place-items-center rounded-full bg-green-50 text-success-500 hover:brightness-95"
                        title="Registrar entrada"
                      >
                        <PackagePlus size={15} />
                      </button>
                      <button
                        onClick={() => openAdjust(ing, 'out')}
                        className="grid h-8 w-8 place-items-center rounded-full bg-amber-50 text-warning-500 hover:brightness-95"
                        title="Registrar salida"
                      >
                        <PackageMinus size={15} />
                      </button>
                      <button
                        onClick={() => openEdit(ing)}
                        className="grid h-8 w-8 place-items-center rounded-full bg-ink-50 text-ink-600 hover:bg-ink-100"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(ing)}
                        className="grid h-8 w-8 place-items-center rounded-full bg-red-50 text-danger-500 hover:brightness-95"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <div className="p-6">
            <DialogTitle className="mb-4 text-lg font-extrabold text-ink-900">
              {form.id ? 'Editar ingrediente' : 'Nuevo ingrediente'}
            </DialogTitle>
            <div className="space-y-3">
              <div>
                <Label>Nombre</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Unidad</Label>
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
                  <Label>Costo por unidad</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.cost_per_unit}
                    onChange={(e) => setForm({ ...form, cost_per_unit: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Stock actual</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.stock_quantity}
                    onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                    disabled={!!form.id}
                  />
                </div>
                <div>
                  <Label>Stock mínimo</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.min_stock}
                    onChange={(e) => setForm({ ...form, min_stock: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Proveedor (opcional)</Label>
                <Input
                  value={form.supplier}
                  onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                />
              </div>
              {form.id && (
                <p className="text-[11px] text-ink-400">
                  Para cambiar el stock usa los botones de entrada/salida en la tabla — así queda
                  registrado el movimiento.
                </p>
              )}
              {error && <p className="text-xs font-semibold text-danger-500">{error}</p>}
              <Button fullWidth onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
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
                {adjustType === 'in' ? 'Registrar entrada' : 'Registrar salida'}
              </DialogTitle>
              <p className="mb-4 text-sm text-ink-400">{adjustTarget.name}</p>
              <div className="space-y-3">
                <div>
                  <Label>Cantidad ({adjustTarget.unit})</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <Label>Motivo (opcional)</Label>
                  <Input
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder={adjustType === 'in' ? 'Compra a proveedor' : 'Merma, uso manual…'}
                  />
                </div>
                {error && <p className="text-xs font-semibold text-danger-500">{error}</p>}
                <Button fullWidth onClick={handleAdjustSubmit} disabled={saving}>
                  {saving ? 'Guardando…' : 'Confirmar'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
