'use client'

// CRUD del catálogo de recompensas canjeables (Problema 6) — distinto de
// los niveles de progresión (reward_tiers) que gestiona el resto de esta
// página. La validación real del canje (saldo suficiente, disponibilidad,
// vencimiento) vive en el servidor (redeem_catalog_reward RPC); esto es
// solo la administración del catálogo.
import { useEffect, useRef, useState } from 'react'
import { Plus, Pencil, Trash2, Upload, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { ItemThumb } from '@/components/ui/item-thumb'
import { formatDate } from '@/lib/format'
import type { RewardCatalogItem } from '@/lib/types'

interface CatalogForm {
  id?: string
  name: string
  description: string
  pointsCost: string
  imageUrl: string
  active: boolean
  expiresAt: string
}

const EMPTY: CatalogForm = {
  name: '',
  description: '',
  pointsCost: '100',
  imageUrl: '',
  active: true,
  expiresAt: '',
}

interface RedemptionRow {
  id: string
  points_spent: number
  redeemed_at: string
  reward: { name: string } | null
  customer: { full_name: string | null } | null
}

export function RewardCatalogManager({ canManage }: { canManage: boolean }) {
  const [items, setItems] = useState<RewardCatalogItem[]>([])
  const [redemptions, setRedemptions] = useState<RedemptionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<CatalogForm>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    const [catalogRes, redemptionsRes] = await Promise.all([
      supabase.from('reward_catalog').select('*').order('sort_order'),
      supabase
        .from('reward_redemptions')
        .select('id, points_spent, redeemed_at, reward:reward_catalog(name), customer:profiles(full_name)')
        .order('redeemed_at', { ascending: false })
        .limit(15),
    ])
    setItems(catalogRes.data ?? [])
    setRedemptions((redemptionsRes.data as unknown as RedemptionRow[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function openCreate() {
    setForm(EMPTY)
    setError(null)
    setFormOpen(true)
  }

  function openEdit(item: RewardCatalogItem) {
    setForm({
      id: item.id,
      name: item.name,
      description: item.description ?? '',
      pointsCost: String(item.points_cost),
      imageUrl: item.image_url ?? '',
      active: item.active,
      expiresAt: item.expires_at ? item.expires_at.slice(0, 10) : '',
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
    const path = `rewards/${crypto.randomUUID()}.${ext}`
    const { error: uploadErr } = await supabase.storage.from('menu-images').upload(path, file, {
      contentType: file.type,
      upsert: false,
    })
    setUploading(false)
    if (uploadErr) {
      setError('No se pudo subir la imagen.')
      return
    }
    const { data } = supabase.storage.from('menu-images').getPublicUrl(path)
    setForm((prev) => ({ ...prev, imageUrl: data.publicUrl }))
  }

  async function handleSave() {
    if (!form.name.trim()) return setError('El nombre es obligatorio.')
    const pointsCost = Number(form.pointsCost)
    if (!pointsCost || pointsCost <= 0) return setError('Los puntos requeridos deben ser mayores a 0.')

    setSaving(true)
    setError(null)
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      points_cost: pointsCost,
      image_url: form.imageUrl.trim() || null,
      active: form.active,
      expires_at: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    }
    const { error: saveError } = form.id
      ? await supabase.from('reward_catalog').update(payload).eq('id', form.id)
      : await supabase.from('reward_catalog').insert(payload)

    setSaving(false)
    if (saveError) return setError(saveError.message)
    setFormOpen(false)
    load()
  }

  async function handleDelete(item: RewardCatalogItem) {
    if (!confirm(`¿Eliminar la recompensa "${item.name}"?`)) return
    await supabase.from('reward_catalog').delete().eq('id', item.id)
    load()
  }

  if (loading) return <p className="text-sm text-ink-400">Cargando…</p>

  return (
    <>
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-ink-900">Catálogo de recompensas</h2>
            <p className="text-xs text-ink-400">Lo que tus clientes pueden canjear con sus puntos.</p>
          </div>
          {canManage && (
            <Button size="sm" onClick={openCreate}>
              <Plus size={14} aria-hidden="true" /> Recompensa
            </Button>
          )}
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-ink-400">Sin recompensas configuradas todavía.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-ink-50 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <ItemThumb name={item.name} imageUrl={item.image_url} size="sm" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-bold text-ink-900">{item.name}</span>
                      <Badge variant={item.active ? 'success' : 'neutral'}>
                        {item.active ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </div>
                    <p className="text-xs text-ink-400">
                      {item.points_cost} pts
                      {item.expires_at ? ` · Vence ${formatDate(item.expires_at)}` : ''}
                    </p>
                  </div>
                </div>
                {canManage && (
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      onClick={() => openEdit(item)}
                      aria-label={`Editar ${item.name}`}
                      className="grid h-8 w-8 place-items-center rounded-full bg-white text-ink-600 hover:bg-ink-100"
                    >
                      <Pencil size={14} aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      aria-label={`Eliminar ${item.name}`}
                      className="grid h-8 w-8 place-items-center rounded-full bg-white text-danger-500 hover:bg-red-50"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {canManage && redemptions.length > 0 && (
        <Card className="p-6">
          <h2 className="mb-4 text-sm font-bold text-ink-900">Canjes recientes</h2>
          <div className="space-y-2">
            {redemptions.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-semibold text-ink-900">{r.customer?.full_name ?? 'Cliente'}</span>
                  <span className="text-ink-400"> canjeó </span>
                  <span className="font-semibold text-ink-900">{r.reward?.name ?? 'Recompensa'}</span>
                </div>
                <span className="text-xs text-ink-400">{formatDate(r.redeemed_at)} · {r.points_spent} pts</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-sm">
          <div className="p-6">
            <DialogTitle className="mb-4 text-lg font-extrabold text-ink-900">
              {form.id ? 'Editar recompensa' : 'Nueva recompensa'}
            </DialogTitle>
            <div className="space-y-3">
              <div>
                <Label htmlFor="reward-name">Nombre</Label>
                <Input
                  id="reward-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="reward-description">Descripción (opcional)</Label>
                <Textarea
                  id="reward-description"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <Label>Foto (opcional)</Label>
                <div className="flex items-center gap-3">
                  <ItemThumb name={form.name || 'Recompensa'} imageUrl={form.imageUrl} size="md" />
                  <div className="flex-1">
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
                          <Upload size={14} /> {form.imageUrl ? 'Cambiar' : 'Subir'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="reward-points">Puntos requeridos</Label>
                  <Input
                    id="reward-points"
                    type="number"
                    min="1"
                    value={form.pointsCost}
                    onChange={(e) => setForm({ ...form, pointsCost: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="reward-expires">Vence (opcional)</Label>
                  <Input
                    id="reward-expires"
                    type="date"
                    value={form.expiresAt}
                    onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-ink-600">
                <Checkbox
                  checked={form.active}
                  onCheckedChange={(checked) => setForm({ ...form, active: checked === true })}
                />
                Disponible para canjear
              </label>
              {error && (
                <p role="alert" className="text-xs font-semibold text-danger-500">
                  {error}
                </p>
              )}
              <Button fullWidth onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar recompensa'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
