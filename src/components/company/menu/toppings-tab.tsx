'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/format'
import type { Topping, Ingredient } from '@/lib/types'

const EMPTY = { name: '', price: '0.55', ingredient_id: '' }
const NONE = '__none__'

export function ToppingsTab() {
  const [toppings, setToppings] = useState<Topping[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const [toppingsRes, ingredientsRes] = await Promise.all([
      supabase.from('toppings').select('*').order('name'),
      supabase.from('ingredients').select('*').order('name'),
    ])
    setToppings(toppingsRes.data ?? [])
    setIngredients(ingredientsRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function ingredientName(id: string | null) {
    return ingredients.find((i) => i.id === id)?.name ?? '—'
  }

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY)
    setError(null)
    setFormOpen(true)
  }

  function openEdit(topping: Topping) {
    setEditingId(topping.id)
    setForm({
      name: topping.name,
      price: String(topping.price),
      ingredient_id: topping.ingredient_id ?? '',
    })
    setError(null)
    setFormOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return setError('El nombre es obligatorio.')
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      price: Number(form.price) || 0,
      ingredient_id: form.ingredient_id || null,
    }
    const { error } = editingId
      ? await supabase.from('toppings').update(payload).eq('id', editingId)
      : await supabase.from('toppings').insert(payload)
    setSaving(false)
    if (error) return setError(error.message)
    setFormOpen(false)
    load()
  }

  async function toggleActive(topping: Topping) {
    await supabase.from('toppings').update({ active: !topping.active }).eq('id', topping.id)
    load()
  }

  async function handleDelete(topping: Topping) {
    if (!confirm(`¿Eliminar "${topping.name}"?`)) return
    const { error } = await supabase.from('toppings').delete().eq('id', topping.id)
    if (!error) load()
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-extrabold text-ink-900">Toppings</h2>
        <Button size="sm" onClick={openCreate}>
          <Plus size={14} /> Topping
        </Button>
      </div>

      <Card className="divide-y divide-ink-100 p-0">
        {loading && <p className="p-5 text-sm text-ink-400">Cargando…</p>}
        {!loading && toppings.length === 0 && (
          <p className="p-5 text-sm text-ink-400">Sin toppings todavía.</p>
        )}
        {toppings.map((topping) => (
          <div key={topping.id} className="flex items-center justify-between gap-3 px-5 py-3">
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-semibold text-ink-900">{topping.name}</span>
              <span className="text-xs font-semibold text-ink-400">
                +{formatCurrency(topping.price)} · consume {ingredientName(topping.ingredient_id)}
              </span>
              <button onClick={() => toggleActive(topping)}>
                <Badge variant={topping.active ? 'success' : 'neutral'}>
                  {topping.active ? 'Activo' : 'Inactivo'}
                </Badge>
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => openEdit(topping)}
                className="grid h-8 w-8 place-items-center rounded-full bg-ink-50 text-ink-600 hover:bg-ink-100"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => handleDelete(topping)}
                className="grid h-8 w-8 place-items-center rounded-full bg-red-50 text-danger-500 hover:brightness-95"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-sm">
          <div className="p-6">
            <DialogTitle className="mb-4 text-lg font-extrabold text-ink-900">
              {editingId ? 'Editar topping' : 'Nuevo topping'}
            </DialogTitle>
            <div className="space-y-3">
              <div>
                <Label>Nombre</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>Precio extra</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <div>
                <Label>Ingrediente que consume (opcional)</Label>
                <Select
                  value={form.ingredient_id || NONE}
                  onValueChange={(v) => setForm({ ...form, ingredient_id: v === NONE ? '' : v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Sin vincular</SelectItem>
                    {ingredients.map((ing) => (
                      <SelectItem key={ing.id} value={ing.id}>
                        {ing.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {error && <p className="text-xs font-semibold text-danger-500">{error}</p>}
              <Button fullWidth onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
