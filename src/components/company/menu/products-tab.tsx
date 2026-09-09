'use client'

import { useEffect, useRef, useState } from 'react'
import { Plus, Pencil, Trash2, X, Upload, Loader2, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ItemThumb } from '@/components/ui/item-thumb'
import { formatCurrency } from '@/lib/format'
import type { Category, MenuItem, ItemSize } from '@/lib/types'

const NONE = '__none__'

interface ProductFormState {
  id?: string
  name: string
  description: string
  category_id: string
  base_price: string
  image_url: string
  is_customizable_pizza: boolean
  active: boolean
  free_toppings_limit: string
}

const EMPTY_FORM: ProductFormState = {
  name: '',
  description: '',
  category_id: '',
  base_price: '0',
  image_url: '',
  is_customizable_pizza: false,
  active: true,
  free_toppings_limit: '0',
}

export function ProductsTab() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM)
  const [sizes, setSizes] = useState<
    { id?: string; name: string; price: string; sizeInches: string; sizeCm: string }[]
  >([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiPreviewUrl, setAiPreviewUrl] = useState<string | null>(null)
  const [aiMessage, setAiMessage] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const [itemsRes, categoriesRes] = await Promise.all([
      supabase.from('menu_items').select('*').order('name'),
      supabase.from('categories').select('*').order('sort_order'),
    ])
    setItems(itemsRes.data ?? [])
    setCategories(categoriesRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function categoryName(id: string | null) {
    return categories.find((c) => c.id === id)?.name ?? 'Sin categoría'
  }

  function resetAiPanel() {
    setAiPanelOpen(false)
    setAiPrompt('')
    setAiGenerating(false)
    setAiPreviewUrl(null)
    setAiMessage(null)
  }

  function openCreate() {
    setForm({ ...EMPTY_FORM, category_id: categories[0]?.id ?? '' })
    setSizes([])
    setError(null)
    setUploadError(null)
    resetAiPanel()
    setFormOpen(true)
  }

  async function openEdit(item: MenuItem) {
    setForm({
      id: item.id,
      name: item.name,
      description: item.description ?? '',
      category_id: item.category_id ?? '',
      base_price: String(item.base_price),
      image_url: item.image_url ?? '',
      is_customizable_pizza: item.is_customizable_pizza,
      active: item.active,
      free_toppings_limit: String(item.free_toppings_limit),
    })
    setError(null)
    setUploadError(null)
    resetAiPanel()
    if (item.is_customizable_pizza) {
      const { data } = await supabase
        .from('item_sizes')
        .select('*')
        .eq('menu_item_id', item.id)
        .order('sort_order')
      setSizes(
        (data ?? []).map((s: ItemSize) => ({
          id: s.id,
          name: s.name,
          price: String(s.price),
          sizeInches: s.size_inches != null ? String(s.size_inches) : '',
          sizeCm: s.size_cm != null ? String(s.size_cm) : '',
        }))
      )
    } else {
      setSizes([])
    }
    setFormOpen(true)
  }

  function addSizeRow() {
    setSizes((prev) => [...prev, { name: '', price: '0', sizeInches: '', sizeCm: '' }])
  }

  function updateSizeRow(
    index: number,
    patch: Partial<{ name: string; price: string; sizeInches: string; sizeCm: string }>
  ) {
    setSizes((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  function removeSizeRow(index: number) {
    setSizes((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite volver a elegir el mismo archivo si falla
    if (!file) return

    setUploadError(null)
    setUploading(true)
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${crypto.randomUUID()}.${ext}`
    const { error: uploadErr } = await supabase.storage.from('menu-images').upload(path, file, {
      contentType: file.type,
      upsert: false,
    })
    setUploading(false)
    if (uploadErr) {
      setUploadError('No se pudo subir la imagen. Verifica que sea JPG/PNG/WebP y pese menos de 5MB.')
      return
    }
    const { data } = supabase.storage.from('menu-images').getPublicUrl(path)
    setForm((prev) => ({ ...prev, image_url: data.publicUrl }))
  }

  // Backend real (Edge Function generate-product-image), gateado por el
  // permiso media.manage — nunca finge una generación en el cliente. Hoy
  // el proyecto no tiene ninguna clave de proveedor de IA configurada,
  // así que la función siempre responde configured:false; esta interfaz
  // ya queda lista (prompt → generando → preview → aceptar/regenerar)
  // para cuando el negocio provea una clave real.
  async function handleGenerateImage() {
    if (!aiPrompt.trim()) return
    setAiGenerating(true)
    setAiMessage(null)
    setAiPreviewUrl(null)
    const { data, error: fnError } = await supabase.functions.invoke('generate-product-image', {
      body: { prompt: aiPrompt.trim() },
    })
    setAiGenerating(false)
    if (fnError) {
      setAiMessage('No se pudo generar la imagen. Intenta de nuevo más tarde.')
      return
    }
    if (!data?.configured) {
      setAiMessage(
        data?.message ?? 'La generación de imágenes con IA todavía no está configurada.'
      )
      return
    }
    setAiPreviewUrl(data.url)
  }

  function acceptAiImage() {
    if (!aiPreviewUrl) return
    setForm((prev) => ({ ...prev, image_url: aiPreviewUrl }))
    resetAiPanel()
  }

  async function handleSave() {
    if (!form.name.trim()) return setError('El nombre es obligatorio.')
    setSaving(true)
    setError(null)

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      category_id: form.category_id || null,
      base_price: Number(form.base_price) || 0,
      image_url: form.image_url.trim() || null,
      is_customizable_pizza: form.is_customizable_pizza,
      active: form.active,
      free_toppings_limit: form.is_customizable_pizza ? Math.max(0, Number(form.free_toppings_limit) || 0) : 0,
    }

    const { data: saved, error } = form.id
      ? await supabase.from('menu_items').update(payload).eq('id', form.id).select().single()
      : await supabase.from('menu_items').insert(payload).select().single()

    if (error || !saved) {
      setSaving(false)
      return setError(error?.message ?? 'No se pudo guardar el producto')
    }

    if (form.is_customizable_pizza) {
      // Estrategia simple: reemplazar los tamaños existentes con los del formulario
      await supabase.from('item_sizes').delete().eq('menu_item_id', saved.id)
      const validSizes = sizes.filter((s) => s.name.trim())
      if (validSizes.length > 0) {
        await supabase.from('item_sizes').insert(
          validSizes.map((s, i) => ({
            menu_item_id: saved.id,
            name: s.name.trim(),
            price: Number(s.price) || 0,
            size_inches: s.sizeInches.trim() ? Number(s.sizeInches) : null,
            size_cm: s.sizeCm.trim() ? Number(s.sizeCm) : null,
            sort_order: i,
          }))
        )
      }
    }

    setSaving(false)
    setFormOpen(false)
    load()
  }

  async function toggleActive(item: MenuItem) {
    await supabase.from('menu_items').update({ active: !item.active }).eq('id', item.id)
    load()
  }

  async function handleDelete(item: MenuItem) {
    if (!confirm(`¿Eliminar "${item.name}" del menú?`)) return
    const { error } = await supabase.from('menu_items').delete().eq('id', item.id)
    if (!error) load()
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-extrabold text-ink-900">Productos</h2>
        <Button size="sm" onClick={openCreate}>
          <Plus size={14} /> Producto
        </Button>
      </div>

      <Card className="divide-y divide-ink-100 p-0">
        {loading && <p className="p-5 text-sm text-ink-400">Cargando…</p>}
        {!loading && items.length === 0 && (
          <p className="p-5 text-sm text-ink-400">Sin productos todavía.</p>
        )}
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 px-5 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <ItemThumb name={item.name} imageUrl={item.image_url} size="sm" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-ink-900">{item.name}</span>
                  {item.is_customizable_pizza && <Badge variant="brand">Personalizable</Badge>}
                </div>
                <p className="text-xs text-ink-400">
                  {categoryName(item.category_id)} · {formatCurrency(item.base_price)}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button onClick={() => toggleActive(item)}>
                <Badge variant={item.active ? 'success' : 'neutral'}>
                  {item.active ? 'Activo' : 'Inactivo'}
                </Badge>
              </button>
              <button
                onClick={() => openEdit(item)}
                className="grid h-8 w-8 place-items-center rounded-full bg-ink-50 text-ink-600 hover:bg-ink-100"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => handleDelete(item)}
                className="grid h-8 w-8 place-items-center rounded-full bg-red-50 text-danger-500 hover:brightness-95"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <div className="p-6">
            <DialogTitle className="mb-4 text-lg font-extrabold text-ink-900">
              {form.id ? 'Editar producto' : 'Nuevo producto'}
            </DialogTitle>
            <div className="space-y-3">
              <div>
                <Label>Nombre</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>Descripción</Label>
                <Textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label>Categoría</Label>
                  <Select
                    value={form.category_id || NONE}
                    onValueChange={(v) => setForm({ ...form, category_id: v === NONE ? '' : v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Sin categoría</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{form.is_customizable_pizza ? 'Precio base (referencia)' : 'Precio'}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.base_price}
                    onChange={(e) => setForm({ ...form, base_price: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Foto del producto</Label>
                <div className="flex items-center gap-3">
                  <ItemThumb name={form.name || 'Producto'} imageUrl={form.image_url} size="md" />
                  <div className="flex-1 space-y-1.5">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={handleImageSelected}
                    />
                    <div className="flex flex-wrap gap-1.5">
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
                            <Upload size={14} /> {form.image_url ? 'Cambiar foto' : 'Subir foto'}
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          resetAiPanel()
                          setAiPanelOpen(true)
                          setAiPrompt(
                            form.name ? `Foto de ${form.name} para el menú de una pizzería, fondo neutro, alta calidad` : ''
                          )
                        }}
                      >
                        <Sparkles size={14} /> Generar con IA
                      </Button>
                    </div>
                    <p className="text-[11px] text-ink-400">JPG, PNG, WebP o GIF · máx. 5MB.</p>
                    {uploadError && (
                      <p role="alert" className="text-xs font-semibold text-danger-500">
                        {uploadError}
                      </p>
                    )}
                  </div>
                </div>

                {aiPanelOpen && (
                  <div className="mt-3 space-y-2 rounded-xl border border-ink-100 bg-ink-50/50 p-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ai-prompt">Describe la imagen a generar</Label>
                      <button
                        type="button"
                        onClick={resetAiPanel}
                        aria-label="Cerrar"
                        className="text-ink-400 hover:text-ink-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <Textarea
                      id="ai-prompt"
                      rows={2}
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Ej: Pizza pepperoni recién horneada, vista cenital, fondo de madera"
                    />
                    {aiPreviewUrl ? (
                      <div className="flex items-center gap-3">
                        <ItemThumb name="Vista previa" imageUrl={aiPreviewUrl} size="md" />
                        <div className="flex gap-1.5">
                          <Button type="button" size="sm" onClick={acceptAiImage}>
                            Usar esta imagen
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={handleGenerateImage}
                            disabled={aiGenerating}
                          >
                            Regenerar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleGenerateImage}
                        disabled={aiGenerating || !aiPrompt.trim()}
                      >
                        {aiGenerating ? (
                          <>
                            <Loader2 size={14} className="animate-spin" /> Generando…
                          </>
                        ) : (
                          <>
                            <Sparkles size={14} /> Generar
                          </>
                        )}
                      </Button>
                    )}
                    {aiMessage && (
                      <p role="status" className="text-xs font-semibold text-ink-500">
                        {aiMessage}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2 text-sm font-semibold text-ink-600">
                <Checkbox
                  checked={form.is_customizable_pizza}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, is_customizable_pizza: checked === true })
                  }
                />
                Es una pizza personalizable (tamaños, masa, salsa y toppings)
              </label>
              {form.is_customizable_pizza && (
                <div>
                  <Label htmlFor="free-toppings-limit">Toppings gratis incluidos</Label>
                  <Input
                    id="free-toppings-limit"
                    type="number"
                    min="0"
                    value={form.free_toppings_limit}
                    onChange={(e) => setForm({ ...form, free_toppings_limit: e.target.value })}
                  />
                  <p className="mt-1 text-[11px] text-ink-400">
                    Cuántos toppings puede elegir el cliente antes de que se le cobren extra — cada
                    producto define el suyo, ya no hay un límite global.
                  </p>
                </div>
              )}
              <label className="flex items-center gap-2 text-sm font-semibold text-ink-600">
                <Checkbox
                  checked={form.active}
                  onCheckedChange={(checked) => setForm({ ...form, active: checked === true })}
                />
                Visible en el menú de clientes
              </label>

              {form.is_customizable_pizza && (
                <div className="rounded-2xl bg-ink-50 p-3.5">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wide text-ink-600">Tamaños</p>
                    <button
                      onClick={addSizeRow}
                      className="text-xs font-bold text-brand-900 hover:underline"
                    >
                      + Agregar tamaño
                    </button>
                  </div>
                  <div className="space-y-2">
                    {sizes.map((size, i) => (
                      <div key={i} className="rounded-xl bg-white p-2.5">
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Ej. Pequeña"
                            value={size.name}
                            onChange={(e) => updateSizeRow(i, { name: e.target.value })}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Precio"
                            value={size.price}
                            onChange={(e) => updateSizeRow(i, { price: e.target.value })}
                            className="w-24"
                          />
                          <button
                            onClick={() => removeSizeRow(i)}
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink-50 text-ink-400 hover:text-danger-500"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <Input
                            type="number"
                            step="0.5"
                            placeholder="Pulgadas (ej. 10)"
                            value={size.sizeInches}
                            onChange={(e) => updateSizeRow(i, { sizeInches: e.target.value })}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            step="0.5"
                            placeholder="Centímetros (ej. 25)"
                            value={size.sizeCm}
                            onChange={(e) => updateSizeRow(i, { sizeCm: e.target.value })}
                            className="flex-1"
                          />
                        </div>
                      </div>
                    ))}
                    {sizes.length === 0 && (
                      <p className="text-xs text-ink-400">Agrega al menos un tamaño.</p>
                    )}
                  </div>
                </div>
              )}

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
