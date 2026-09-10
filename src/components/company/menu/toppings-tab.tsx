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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrency } from '@/lib/format'
import { useLanguage } from '@/contexts/LanguageContext'
import type { Topping, Ingredient } from '@/lib/types'

const EMPTY = { name: '', price: '0.55', ingredient_id: '', imageUrl: '' }
const NONE = '__none__'

export function ToppingsTab() {
  const { t } = useLanguage()
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
    return ingredients.find((i) => i.id === id)?.name ?? t('menuMgmt.noIngredientDash')
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
      setError(t('menuMgmt.uploadError'))
      return
    }
    const { data } = supabase.storage.from('menu-images').getPublicUrl(path)
    setForm((prev) => ({ ...prev, imageUrl: data.publicUrl }))
  }

  async function handleSave() {
    if (!form.name.trim()) return setError(t('menuMgmt.nameRequired'))
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
    if (!confirm(t('menuMgmt.confirmDeleteGeneric', { name: topping.name }))) return
    const { error } = await supabase.from('toppings').delete().eq('id', topping.id)
    if (!error) load()
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-extrabold text-foreground">{t('menuMgmt.tabToppings')}</h2>
        <Button size="sm" onClick={openCreate}>
          <Plus size={14} /> {t('menuMgmt.toppingWord')}
        </Button>
      </div>

      {loading && <p className="py-8 text-center text-sm text-muted-foreground">{t('common.loading')}</p>}
      {!loading && toppings.length === 0 && <EmptyState message={t('menuMgmt.noToppings')} icon={<Plus size={28} aria-hidden="true" />} />}

      {!loading && toppings.length > 0 && (
        <>
          {/* Mobile (< md): tarjeta por topping. */}
          <div className="space-y-3 md:hidden">
            {toppings.map((topping) => (
              <Card key={topping.id} className="space-y-3 p-4">
                <div className="flex items-start gap-3">
                  <ItemThumb name={topping.name} imageUrl={topping.image_url} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">{topping.name}</span>
                      <button onClick={() => toggleActive(topping)}>
                        <Badge variant={topping.active ? 'success' : 'neutral'}>
                          {topping.active ? t('menuMgmt.activeM') : t('menuMgmt.inactiveM')}
                        </Badge>
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      +{formatCurrency(topping.price)} ·{' '}
                      {t('menuMgmt.consumesIngredient', { ingredient: ingredientName(topping.ingredient_id) })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 border-t border-border pt-3">
                  <Button size="sm" variant="secondary" onClick={() => openEdit(topping)} className="flex-1">
                    <Pencil size={14} aria-hidden="true" /> {t('common.edit')}
                  </Button>
                  <button
                    onClick={() => handleDelete(topping)}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-red-50 text-danger-500 hover:brightness-95"
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              </Card>
            ))}
          </div>

          {/* Tablet/Desktop (>= md): tabla real, más densa. */}
          <Card className="hidden overflow-x-auto p-0 md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('menuMgmt.name')}</TableHead>
                  <TableHead>{t('menuMgmt.extraPrice')}</TableHead>
                  <TableHead>{t('menuMgmt.ingredientOptional')}</TableHead>
                  <TableHead>{t('ordersAdmin.status')}</TableHead>
                  <TableHead className="text-right">{t('ordersAdmin.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {toppings.map((topping) => (
                  <TableRow key={topping.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <ItemThumb name={topping.name} imageUrl={topping.image_url} size="sm" />
                        <span className="font-semibold text-foreground">{topping.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">+{formatCurrency(topping.price)}</TableCell>
                    <TableCell className="text-muted-foreground">{ingredientName(topping.ingredient_id)}</TableCell>
                    <TableCell>
                      <button onClick={() => toggleActive(topping)}>
                        <Badge variant={topping.active ? 'success' : 'neutral'}>
                          {topping.active ? t('menuMgmt.activeM') : t('menuMgmt.inactiveM')}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(topping)}
                          className="grid h-8 w-8 place-items-center rounded-full bg-muted text-muted-foreground hover:bg-muted/70"
                        >
                          <Pencil size={14} aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => handleDelete(topping)}
                          className="grid h-8 w-8 place-items-center rounded-full bg-red-50 text-danger-500 hover:brightness-95"
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-sm">
          <div className="p-6">
            <DialogTitle className="mb-4 text-lg font-extrabold text-ink-900">
              {editingId ? t('menuMgmt.editToppingTitle') : t('menuMgmt.newToppingTitle')}
            </DialogTitle>
            <div className="space-y-3">
              <div>
                <Label>{t('menuMgmt.name')}</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>{t('menuMgmt.extraPrice')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('menuMgmt.ingredientOptional')}</Label>
                <Select
                  value={form.ingredient_id || NONE}
                  onValueChange={(v) => setForm({ ...form, ingredient_id: v === NONE ? '' : v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{t('menuMgmt.noIngredientLink')}</SelectItem>
                    {ingredients.map((ing) => (
                      <SelectItem key={ing.id} value={ing.id}>
                        {ing.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('menuMgmt.imageOptional')}</Label>
                <div className="flex items-center gap-3">
                  <ItemThumb name={form.name || t('menuMgmt.toppingWord')} imageUrl={form.imageUrl} size="md" />
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
                          <Loader2 size={14} className="animate-spin" /> {t('menuMgmt.uploading')}
                        </>
                      ) : (
                        <>
                          <Upload size={14} /> {form.imageUrl ? t('menuMgmt.changePhoto') : t('menuMgmt.uploadPhoto')}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              {error && <p className="text-xs font-semibold text-danger-500">{error}</p>}
              <Button fullWidth onClick={handleSave} disabled={saving}>
                {saving ? t('menuMgmt.savingButton') : t('common.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
