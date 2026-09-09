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
import { formatCurrency } from '@/lib/format'
import { useLanguage } from '@/contexts/LanguageContext'

interface SimpleOption {
  id: string
  name: string
  extra_price: number
  active: boolean
  image_url: string | null
}

interface SimpleOptionsManagerProps {
  table: 'crusts' | 'sauces'
  title: string
  itemLabel: string
}

const EMPTY = { name: '', extra_price: '0', imageUrl: '' }

export function SimpleOptionsManager({ table, title, itemLabel }: SimpleOptionsManagerProps) {
  const { t } = useLanguage()
  const [items, setItems] = useState<SimpleOption[]>([])
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
    const { data, error } = await supabase.from(table).select('*').order('name')
    if (!error) setItems((data ?? []) as SimpleOption[])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table])

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY)
    setError(null)
    setFormOpen(true)
  }

  function openEdit(item: SimpleOption) {
    setEditingId(item.id)
    setForm({ name: item.name, extra_price: String(item.extra_price), imageUrl: item.image_url ?? '' })
    setError(null)
    setFormOpen(true)
  }

  async function handleImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${table}/${crypto.randomUUID()}.${ext}`
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
      extra_price: Number(form.extra_price) || 0,
      image_url: form.imageUrl.trim() || null,
    }
    const { error } = editingId
      ? await supabase.from(table).update(payload).eq('id', editingId)
      : await supabase.from(table).insert(payload)
    setSaving(false)
    if (error) return setError(error.message)
    setFormOpen(false)
    load()
  }

  async function toggleActive(item: SimpleOption) {
    await supabase.from(table).update({ active: !item.active }).eq('id', item.id)
    load()
  }

  async function handleDelete(item: SimpleOption) {
    if (!confirm(t('menuMgmt.confirmDeleteGeneric', { name: item.name }))) return
    const { error } = await supabase.from(table).delete().eq('id', item.id)
    if (!error) load()
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-extrabold text-ink-900">{title}</h2>
        <Button size="sm" onClick={openCreate}>
          <Plus size={14} /> {itemLabel}
        </Button>
      </div>

      <Card className="divide-y divide-ink-100 p-0">
        {loading && <p className="p-5 text-sm text-ink-400">{t('common.loading')}</p>}
        {!loading && items.length === 0 && (
          <p className="p-5 text-sm text-ink-400">{t('menuMgmt.noRecords')}</p>
        )}
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 px-5 py-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <ItemThumb name={item.name} imageUrl={item.image_url} size="sm" />
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
                <span className="text-sm font-semibold text-ink-900">{item.name}</span>
                {item.extra_price > 0 && (
                  <span className="text-xs font-semibold text-ink-400">
                    +{formatCurrency(item.extra_price)}
                  </span>
                )}
                <button onClick={() => toggleActive(item)}>
                  <Badge variant={item.active ? 'success' : 'neutral'}>
                    {item.active ? t('menuMgmt.activeM') : t('menuMgmt.inactiveM')}
                  </Badge>
                </button>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
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
        <DialogContent className="max-w-sm">
          <div className="p-6">
            <DialogTitle className="mb-4 text-lg font-extrabold text-ink-900">
              {editingId ? t('common.edit') : itemLabel}
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
                  value={form.extra_price}
                  onChange={(e) => setForm({ ...form, extra_price: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('menuMgmt.imageOptional')}</Label>
                <div className="flex items-center gap-3">
                  <ItemThumb name={form.name || itemLabel} imageUrl={form.imageUrl} size="md" />
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
