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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDate } from '@/lib/format'
import { useLanguage } from '@/contexts/LanguageContext'
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
  const { t } = useLanguage()
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
      setError(t('rewardsAdmin.uploadFailedGeneric'))
      return
    }
    const { data } = supabase.storage.from('menu-images').getPublicUrl(path)
    setForm((prev) => ({ ...prev, imageUrl: data.publicUrl }))
  }

  async function handleSave() {
    if (!form.name.trim()) return setError(t('menuMgmt.nameRequired'))
    const pointsCost = Number(form.pointsCost)
    if (!pointsCost || pointsCost <= 0) return setError(t('rewardsAdmin.pointsRequiredError'))

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
    if (!confirm(t('rewardsAdmin.confirmDeleteReward', { name: item.name }))) return
    await supabase.from('reward_catalog').delete().eq('id', item.id)
    load()
  }

  if (loading) return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>

  return (
    <>
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-foreground">{t('rewardsAdmin.catalogHeading')}</h2>
            <p className="text-xs text-muted-foreground">{t('rewardsAdmin.catalogSubtitle')}</p>
          </div>
          {canManage && (
            <Button size="sm" onClick={openCreate}>
              <Plus size={14} aria-hidden="true" /> {t('rewardsAdmin.newReward')}
            </Button>
          )}
        </div>

        {items.length === 0 ? (
          <EmptyState message={t('rewardsAdmin.noRewardsConfigured')} icon={<Plus size={28} aria-hidden="true" />} />
        ) : (
          <>
            {/* Mobile (< md): tarjeta por recompensa. */}
            <div className="space-y-3 md:hidden">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-muted p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <ItemThumb name={item.name} imageUrl={item.image_url} size="sm" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-bold text-foreground">{item.name}</span>
                        <Badge variant={item.active ? 'success' : 'neutral'}>
                          {item.active ? t('menuMgmt.activeF') : t('menuMgmt.inactiveF')}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.points_cost} {t('account.pts')}
                        {item.expires_at ? ` · ${t('rewardsAdmin.expiresOn', { date: formatDate(item.expires_at) })}` : ''}
                      </p>
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        onClick={() => openEdit(item)}
                        aria-label={t('rewardsAdmin.editRewardAria', { name: item.name })}
                        className="grid h-8 w-8 place-items-center rounded-full bg-card text-muted-foreground hover:bg-muted"
                      >
                        <Pencil size={14} aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        aria-label={t('rewardsAdmin.deleteRewardAria', { name: item.name })}
                        className="grid h-8 w-8 place-items-center rounded-full bg-card text-danger-500 hover:bg-red-50"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Tablet/Desktop (>= md): tabla real, más densa. */}
            <div className="hidden overflow-x-auto rounded-2xl border border-border md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('menuMgmt.name')}</TableHead>
                    <TableHead>{t('rewardsAdmin.pointsRequired')}</TableHead>
                    <TableHead>{t('ordersAdmin.status')}</TableHead>
                    <TableHead className="text-right">{t('ordersAdmin.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <ItemThumb name={item.name} imageUrl={item.image_url} size="sm" />
                          <span className="font-semibold text-foreground">{item.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.points_cost} {t('account.pts')}
                        {item.expires_at ? ` · ${t('rewardsAdmin.expiresOn', { date: formatDate(item.expires_at) })}` : ''}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.active ? 'success' : 'neutral'}>
                          {item.active ? t('menuMgmt.activeF') : t('menuMgmt.inactiveF')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {canManage && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEdit(item)}
                              aria-label={t('rewardsAdmin.editRewardAria', { name: item.name })}
                              className="grid h-8 w-8 place-items-center rounded-full bg-muted text-muted-foreground hover:bg-muted/70"
                            >
                              <Pencil size={14} aria-hidden="true" />
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              aria-label={t('rewardsAdmin.deleteRewardAria', { name: item.name })}
                              className="grid h-8 w-8 place-items-center rounded-full bg-red-50 text-danger-500 hover:brightness-95"
                            >
                              <Trash2 size={14} aria-hidden="true" />
                            </button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Card>

      {canManage && redemptions.length > 0 && (
        <Card className="p-6">
          <h2 className="mb-4 text-sm font-bold text-foreground">{t('rewardsAdmin.recentRedemptions')}</h2>
          <div className="space-y-2">
            {redemptions.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-semibold text-foreground">{r.customer?.full_name ?? t('rewardsAdmin.customerFallback')}</span>
                  <span className="text-muted-foreground"> {t('rewardsAdmin.redeemedVerb')} </span>
                  <span className="font-semibold text-foreground">{r.reward?.name ?? t('rewardsAdmin.rewardFallback')}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDate(r.redeemed_at)} · {r.points_spent} {t('account.pts')}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-sm">
          <div className="p-6">
            <DialogTitle className="mb-4 text-lg font-extrabold text-ink-900">
              {form.id ? t('rewardsAdmin.editRewardTitle') : t('rewardsAdmin.newRewardTitle')}
            </DialogTitle>
            <div className="space-y-3">
              <div>
                <Label htmlFor="reward-name">{t('menuMgmt.name')}</Label>
                <Input
                  id="reward-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="reward-description">{t('rewardsAdmin.descriptionOptional')}</Label>
                <Textarea
                  id="reward-description"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('rewardsAdmin.photoOptional')}</Label>
                <div className="flex items-center gap-3">
                  <ItemThumb name={form.name || t('rewardsAdmin.rewardFallback')} imageUrl={form.imageUrl} size="md" />
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
                          <Loader2 size={14} className="animate-spin" /> {t('menuMgmt.uploading')}
                        </>
                      ) : (
                        <>
                          <Upload size={14} /> {form.imageUrl ? t('rewardsAdmin.changePhotoShort') : t('rewardsAdmin.uploadPhotoShort')}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="reward-points">{t('rewardsAdmin.pointsRequired')}</Label>
                  <Input
                    id="reward-points"
                    type="number"
                    min="1"
                    value={form.pointsCost}
                    onChange={(e) => setForm({ ...form, pointsCost: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="reward-expires">{t('rewardsAdmin.expiresOptional')}</Label>
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
                {t('rewardsAdmin.availableToRedeem')}
              </label>
              {error && (
                <p role="alert" className="text-xs font-semibold text-danger-500">
                  {error}
                </p>
              )}
              <Button fullWidth onClick={handleSave} disabled={saving}>
                {saving ? t('menuMgmt.savingButton') : t('rewardsAdmin.saveReward')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
