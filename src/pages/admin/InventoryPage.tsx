import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, PackagePlus, PackageMinus, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { FieldLabel, Input, Select } from '../../components/ui/Input'
import { formatCurrency, formatNumber } from '../../lib/format'
import type { Ingredient } from '../../lib/types'

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

export function InventoryPage() {
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
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-left text-xs font-bold uppercase tracking-wide text-ink-400">
              <th className="px-5 py-3">Ingrediente</th>
              <th className="px-5 py-3">Stock</th>
              <th className="px-5 py-3">Mínimo</th>
              <th className="px-5 py-3">Costo/unidad</th>
              <th className="px-5 py-3">Proveedor</th>
              <th className="px-5 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-ink-400">
                  Cargando…
                </td>
              </tr>
            )}
            {!loading && ingredients.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-ink-400">
                  No hay ingredientes registrados.
                </td>
              </tr>
            )}
            {ingredients.map((ing) => {
              const low = ing.stock_quantity <= ing.min_stock
              return (
                <tr key={ing.id} className="border-b border-ink-100 last:border-0">
                  <td className="px-5 py-3 font-semibold text-ink-900">
                    <div className="flex items-center gap-2">
                      {low && <AlertTriangle size={14} className="text-danger-500" />}
                      {ing.name}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={low ? 'danger' : 'success'}>
                      {formatNumber(ing.stock_quantity)} {ing.unit}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-ink-600">
                    {formatNumber(ing.min_stock)} {ing.unit}
                  </td>
                  <td className="px-5 py-3 text-ink-600">{formatCurrency(ing.cost_per_unit)}</td>
                  <td className="px-5 py-3 text-ink-600">{ing.supplier || '—'}</td>
                  <td className="px-5 py-3">
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
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} widthClass="max-w-md">
        <div className="p-6">
          <h2 className="mb-4 text-lg font-extrabold text-ink-900">
            {form.id ? 'Editar ingrediente' : 'Nuevo ingrediente'}
          </h2>
          <div className="space-y-3">
            <div>
              <FieldLabel>Nombre</FieldLabel>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Unidad</FieldLabel>
                <Select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <FieldLabel>Costo por unidad</FieldLabel>
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
                <FieldLabel>Stock actual</FieldLabel>
                <Input
                  type="number"
                  step="0.01"
                  value={form.stock_quantity}
                  onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                  disabled={!!form.id}
                />
              </div>
              <div>
                <FieldLabel>Stock mínimo</FieldLabel>
                <Input
                  type="number"
                  step="0.01"
                  value={form.min_stock}
                  onChange={(e) => setForm({ ...form, min_stock: e.target.value })}
                />
              </div>
            </div>
            <div>
              <FieldLabel>Proveedor (opcional)</FieldLabel>
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
      </Modal>

      <Modal open={!!adjustTarget} onClose={() => setAdjustTarget(null)} widthClass="max-w-sm">
        {adjustTarget && (
          <div className="p-6">
            <h2 className="mb-1 text-lg font-extrabold text-ink-900">
              {adjustType === 'in' ? 'Registrar entrada' : 'Registrar salida'}
            </h2>
            <p className="mb-4 text-sm text-ink-400">{adjustTarget.name}</p>
            <div className="space-y-3">
              <div>
                <FieldLabel>Cantidad ({adjustTarget.unit})</FieldLabel>
                <Input
                  type="number"
                  step="0.01"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <FieldLabel>Motivo (opcional)</FieldLabel>
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
      </Modal>
    </div>
  )
}
