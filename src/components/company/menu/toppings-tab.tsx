'use client'

import { useEffect, useRef, useState } from 'react'
import { Plus, Pencil, Trash2, Upload, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ItemThumb } from '@/components/ui/item-thumb'
import { formatCurrency } from '@/lib/format'
import type { Topping, Ingredient } from '@/lib/types'

const EMPTY = { name: '', price: '0.55', ingredient_id: '', imageUrl: '' }
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
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      imageUrl: topping.image_url ?? '',
    })
    setError(null)
    setFormOpen(true)
  }

  async function handleImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `toppings/${crypto.randomUUID()}.${ext}`
    const { error: uploadErr } = await supabase.storage
      .from('menu-images')
      .upload(path, file, { contentType: file.type, upsert: false })
    setUploading(false)
    if (uploadErr) {
      setError('No se pudo subir la imagen. Verifica que sea JPG/PNG/WebP y pese menos de 5MB.')
      return
    }
    const { data } = supabase.storage.from('menu-images').getPublicUrl(path)
    setForm((prev) => ({ ...prev, imageUrl: data.publicUrl }))
  }

  async function handleSave() {
    if (!form.name.trim()) return setError('El nombre es obligatorio.')
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      price: Number(form.price) || 0,
      ingredient_id: form.ingredient_id || null,
      image_url: form.imageUrl.trim() || null,
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
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <ItemThumb name={topping.name} imageUrl={topping.image_url} size="sm" />
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
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
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
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
              <div>
                <Label>Imagen (opcional)</Label>
                <div className="flex items-center gap-3">
                  <ItemThumb name={form.name || 'Topping'} imageUrl={form.imageUrl} size="md" />
                  <div className="flex-1 space-y-1.5">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={handleImageSelected}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <>
                          <Loader2 size={14} className="animate-spin" /> Subiendo…
                        </>
                      ) : (
                        <>
                          <Upload size={14} /> {form.imageUrl ? 'Cambiar foto' : 'Subir foto'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
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
