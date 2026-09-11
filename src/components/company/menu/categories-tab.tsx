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
import { ItemThumb } from '@/components/ui/item-thumb'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty-state'
import { useLanguage } from '@/contexts/LanguageContext'
import type { Category } from '@/lib/types'

const EMPTY = { name: '', sort_order: '0', image_url: '' }

export function CategoriesTab() {
  const { t } = useLanguage()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('categories').select('*').order('sort_order')
    if (!error) setCategories(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function openCreate() {
    setEditingId(null)
    setForm({ name: '', sort_order: String(categories.length), image_url: '' })
    setError(null)
    setUploadError(null)
    setFormOpen(true)
  }

  function openEdit(cat: Category) {
    setEditingId(cat.id)
    setForm({ name: cat.name, sort_order: String(cat.sort_order), image_url: cat.image_url ?? '' })
    setError(null)
    setUploadError(null)
    setFormOpen(true)
  }

  // Mismo bucket que productos/toppings/cortezas (menu-images) — nunca
  // finge una URL, solo la publica la sube al Storage real de Supabase.
  async function handleImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
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
      setUploadError(t('menuMgmt.uploadError'))
      return
    }
    const { data } = supabase.storage.from('menu-images').getPublicUrl(path)
    setForm((prev) => ({ ...prev, image_url: data.publicUrl }))
  }

  async function handleSave() {
    if (!form.name.trim()) return setError(t('menuMgmt.nameRequired'))
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      sort_order: Number(form.sort_order) || 0,
      image_url: form.image_url.trim() || null,
    }
    const { error } = editingId
      ? await supabase.from('categories').update(payload).eq('id', editingId)
      : await supabase.from('categories').insert(payload)
    setSaving(false)
    if (error) return setError(error.message)
    setFormOpen(false)
    load()
  }

  async function toggleActive(cat: Category) {
    await supabase.from('categories').update({ active: !cat.active }).eq('id', cat.id)
    load()
  }

  async function handleDelete(cat: Category) {
    if (!confirm(t('menuMgmt.confirmDeleteCategory', { name: cat.name }))) return
    const { error } = await supabase.from('categories').delete().eq('id', cat.id)
    if (!error) load()
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-extrabold text-foreground">{t('menuMgmt.tabCategories')}</h2>
        <Button size="sm" onClick={openCreate}>
          <Plus size={14} /> {t('menuMgmt.newCategory')}
        </Button>
      </div>

      {loading && <p className="py-8 text-center text-sm text-muted-foreground">{t('common.loading')}</p>}
      {!loading && categories.length === 0 && <EmptyState message={t('menuMgmt.noCategories')} icon={<Plus size={28} aria-hidden="true" />} />}

      {!loading && categories.length > 0 && (
        <>
          {/* Mobile (< md): tarjeta por categoría. */}
          <div className="space-y-3 md:hidden">
            {categories.map((cat) => (
              <Card key={cat.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <ItemThumb name={cat.name} imageUrl={cat.image_url} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{cat.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('menuMgmt.orderPrefix')} {cat.sort_order}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => toggleActive(cat)}>
                    <Badge variant={cat.active ? 'success' : 'neutral'}>
                      {cat.active ? t('menuMgmt.activeF') : t('menuMgmt.inactiveF')}
                    </Badge>
                  </button>
                </div>
                <div className="flex items-center gap-2 border-t border-border pt-3">
                  <Button size="sm" variant="secondary" onClick={() => openEdit(cat)} className="flex-1">
                    <Pencil size={14} aria-hidden="true" /> {t('common.edit')}
                  </Button>
                  <button
                    onClick={() => handleDelete(cat)}
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
                  <TableHead>{t('menuMgmt.sortOrder')}</TableHead>
                  <TableHead>{t('ordersAdmin.status')}</TableHead>
                  <TableHead className="text-right">{t('ordersAdmin.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-semibold text-foreground">
                      <div className="flex items-center gap-3">
                        <ItemThumb name={cat.name} imageUrl={cat.image_url} size="sm" />
                        {cat.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{cat.sort_order}</TableCell>
                    <TableCell>
                      <button onClick={() => toggleActive(cat)}>
                        <Badge variant={cat.active ? 'success' : 'neutral'}>
                          {cat.active ? t('menuMgmt.activeF') : t('menuMgmt.inactiveF')}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(cat)}
                          className="grid h-8 w-8 place-items-center rounded-full bg-muted text-muted-foreground hover:bg-muted/70"
                        >
                          <Pencil size={14} aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => handleDelete(cat)}
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
              {editingId ? t('menuMgmt.editCategoryTitle') : t('menuMgmt.newCategoryTitle')}
            </DialogTitle>
            <div className="space-y-3">
              <div>
                <Label>{t('menuMgmt.name')}</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>{t('menuMgmt.sortOrder')}</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('menuMgmt.categoryImage')}</Label>
                <div className="flex items-center gap-3">
                  <ItemThumb name={form.name || t('menuMgmt.tabCategories')} imageUrl={form.image_url} size="md" />
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
                          <Upload size={14} /> {form.image_url ? t('menuMgmt.changePhoto') : t('menuMgmt.uploadPhoto')}
                        </>
                      )}
                    </Button>
                    <p className="text-[11px] text-ink-400">{t('menuMgmt.fileHint')}</p>
                    {uploadError && (
                      <p role="alert" className="text-xs font-semibold text-danger-500">
                        {uploadError}
                      </p>
                    )}
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
