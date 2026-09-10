'use client'

// Banner del hero del cliente — a propósito es un componente separado de
// la lista de promociones (page.tsx): un banner es contenido visual de
// marketing, nunca calcula ni aplica ningún descuento. Puede referenciar
// una promoción (para mostrar su código) o un producto, pero la validación
// real del descuento sigue siendo 100% de `promotions` +
// calculate_cart_price() — este componente nunca toca esa lógica.
import { useEffect, useRef, useState } from 'react'
import { Plus, Pencil, Trash2, Image as ImageIcon, Upload, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDate } from '@/lib/format'
import { useLanguage } from '@/contexts/LanguageContext'
import type { PromoBanner, Promotion, MenuItem } from '@/lib/types'

const NONE = '__none__'

interface FormState {
  title: string
  description: string
  imageUrl: string
  ctaLabel: string
  promotionId: string
  menuItemId: string
  originalPrice: string
  promoPrice: string
  discountPercent: string
  startsAt: string
  endsAt: string
  active: boolean
}

const EMPTY: FormState = {
  title: '',
  description: '',
  imageUrl: '',
  ctaLabel: '',
  promotionId: '',
  menuItemId: '',
  originalPrice: '',
  promoPrice: '',
  discountPercent: '',
  startsAt: '',
  endsAt: '',
  active: true,
}

export function BannersManager({ canManage }: { canManage: boolean }) {
  const { t } = useLanguage()
  const [banners, setBanners] = useState<PromoBanner[]>([])
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    const [bannersRes, promotionsRes, itemsRes] = await Promise.all([
      supabase.from('promo_banners').select('*').order('sort_order'),
      supabase.from('promotions').select('*').order('name'),
      supabase.from('menu_items').select('*').order('name'),
    ])
    setBanners(bannersRes.data ?? [])
    setPromotions(promotionsRes.data ?? [])
    setMenuItems(itemsRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function openCreate() {
    setEditingId(null)
    setForm({ ...EMPTY })
    setError(null)
    setFormOpen(true)
  }

  function openEdit(banner: PromoBanner) {
    setEditingId(banner.id)
    setForm({
      title: banner.title,
      description: banner.description ?? '',
      imageUrl: banner.image_url ?? '',
      ctaLabel: banner.cta_label ?? '',
      promotionId: banner.promotion_id ?? '',
      menuItemId: banner.menu_item_id ?? '',
      originalPrice: banner.original_price != null ? String(banner.original_price) : '',
      promoPrice: banner.promo_price != null ? String(banner.promo_price) : '',
      discountPercent: banner.discount_percent != null ? String(banner.discount_percent) : '',
      startsAt: banner.starts_at?.slice(0, 10) ?? '',
      endsAt: banner.ends_at?.slice(0, 10) ?? '',
      active: banner.active,
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
    const path = `banners/${crypto.randomUUID()}.${ext}`
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
    if (!form.title.trim()) return setError(t('promotionsAdmin.titleRequired'))
    setSaving(true)
    setError(null)
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      image_url: form.imageUrl.trim() || null,
      cta_label: form.ctaLabel.trim() || null,
      promotion_id: form.promotionId || null,
      menu_item_id: form.menuItemId || null,
      original_price: form.originalPrice.trim() ? Number(form.originalPrice) : null,
      promo_price: form.promoPrice.trim() ? Number(form.promoPrice) : null,
      discount_percent: form.discountPercent.trim() ? Number(form.discountPercent) : null,
      starts_at: form.startsAt || null,
      ends_at: form.endsAt || null,
      active: form.active,
    }
    const { error: saveError } = editingId
      ? await supabase.from('promo_banners').update(payload).eq('id', editingId)
      : await supabase.from('promo_banners').insert(payload)
    setSaving(false)
    if (saveError) return setError(saveError.message)
    setFormOpen(false)
    load()
  }

  async function toggleActive(banner: PromoBanner) {
    await supabase.from('promo_banners').update({ active: !banner.active }).eq('id', banner.id)
    load()
  }

  async function handleDelete(banner: PromoBanner) {
    if (!confirm(t('promotionsAdmin.confirmDeleteBanner', { title: banner.title }))) return
    await supabase.from('promo_banners').delete().eq('id', banner.id)
    load()
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-foreground">{t('promotionsAdmin.bannerHeading')}</h2>
          <p className="text-xs text-muted-foreground">{t('promotionsAdmin.bannerSubtitle')}</p>
        </div>
        {canManage && (
          <Button size="sm" onClick={openCreate}>
            <Plus size={14} /> {t('promotionsAdmin.newBanner')}
          </Button>
        )}
      </div>

      {loading && <p className="py-8 text-center text-sm text-muted-foreground">{t('common.loading')}</p>}
      {!loading && banners.length === 0 && (
        <EmptyState icon={<ImageIcon size={28} aria-hidden="true" />} message={t('promotionsAdmin.noBanners')} />
      )}

      {!loading && banners.length > 0 && (
        <>
          {/* Mobile (< md): tarjeta por banner. */}
          <div className="space-y-3 md:hidden">
            {banners.map((banner) => (
              <Card key={banner.id} className="space-y-3 p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted text-muted-foreground">
                    {banner.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={banner.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon size={16} aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-bold text-foreground">{banner.title}</span>
                      <button onClick={() => canManage && toggleActive(banner)} disabled={!canManage}>
                        <Badge variant={banner.active ? 'success' : 'neutral'}>
                          {banner.active ? t('menuMgmt.activeM') : t('menuMgmt.inactiveM')}
                        </Badge>
                      </button>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {banner.ends_at ? t('promotionsAdmin.expiresOnly', { date: formatDate(banner.ends_at) }) : t('promotionsAdmin.noExpiryDate')}
                    </p>
                  </div>
                </div>
                {canManage && (
                  <div className="flex items-center gap-2 border-t border-border pt-3">
                    <Button size="sm" variant="secondary" onClick={() => openEdit(banner)} className="flex-1">
                      <Pencil size={14} aria-hidden="true" /> {t('common.edit')}
                    </Button>
                    <button
                      onClick={() => handleDelete(banner)}
                      aria-label={t('promotionsAdmin.deleteAria', { name: banner.title })}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-red-50 text-danger-500 hover:brightness-95"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Tablet/Desktop (>= md): tabla real, más densa. */}
          <Card className="hidden overflow-x-auto p-0 md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('promotionsAdmin.bannerTitleLabel')}</TableHead>
                  <TableHead>{t('promotionsAdmin.endsOptional')}</TableHead>
                  <TableHead>{t('ordersAdmin.status')}</TableHead>
                  <TableHead className="text-right">{t('ordersAdmin.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {banners.map((banner) => (
                  <TableRow key={banner.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted text-muted-foreground">
                          {banner.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={banner.image_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <ImageIcon size={16} aria-hidden="true" />
                          )}
                        </span>
                        <span className="font-semibold text-foreground">{banner.title}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {banner.ends_at ? formatDate(banner.ends_at) : t('promotionsAdmin.noExpiryDate')}
                    </TableCell>
                    <TableCell>
                      <button onClick={() => canManage && toggleActive(banner)} disabled={!canManage}>
                        <Badge variant={banner.active ? 'success' : 'neutral'}>
                          {banner.active ? t('menuMgmt.activeM') : t('menuMgmt.inactiveM')}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell>
                      {canManage && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEdit(banner)}
                            aria-label={t('promotionsAdmin.editAria', { name: banner.title })}
                            className="grid h-8 w-8 place-items-center rounded-full bg-muted text-muted-foreground hover:bg-muted/70"
                          >
                            <Pencil size={14} aria-hidden="true" />
                          </button>
                          <button
                            onClick={() => handleDelete(banner)}
                            aria-label={t('promotionsAdmin.deleteAria', { name: banner.title })}
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
          </Card>
        </>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <div className="p-6">
            <DialogTitle className="mb-4 text-lg font-extrabold text-ink-900">
              {editingId ? t('promotionsAdmin.editBannerTitle') : t('promotionsAdmin.newBannerTitle')}
            </DialogTitle>
            <div className="space-y-3">
              <div>
                <Label htmlFor="banner-title">{t('promotionsAdmin.bannerTitleLabel')}</Label>
                <Input
                  id="banner-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="banner-desc">{t('rewardsAdmin.descriptionOptional')}</Label>
                <Textarea
                  id="banner-desc"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('menuMgmt.imageOptional')}</Label>
                <div className="flex items-center gap-3">
                  <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-ink-50 text-ink-400">
                    {form.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon size={20} aria-hidden="true" />
                    )}
                  </span>
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
              <div>
                <Label htmlFor="banner-cta">{t('promotionsAdmin.ctaLabel')}</Label>
                <Input
                  id="banner-cta"
                  value={form.ctaLabel}
                  onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })}
                  placeholder={t('promotionsAdmin.ctaPlaceholder')}
                />
              </div>
              {/* Precios de exhibición: solo se MUESTRAN en el banner, nunca
                  aplican el descuento — eso sigue siendo exclusivo de
                  calculate_cart_price() con el código de la promoción. */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <Label htmlFor="banner-original-price">{t('promotionsAdmin.originalPrice')}</Label>
                  <Input
                    id="banner-original-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.originalPrice}
                    onChange={(e) => setForm({ ...form, originalPrice: e.target.value })}
                    placeholder="299.00"
                  />
                </div>
                <div>
                  <Label htmlFor="banner-promo-price">{t('promotionsAdmin.promoPrice')}</Label>
                  <Input
                    id="banner-promo-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.promoPrice}
                    onChange={(e) => setForm({ ...form, promoPrice: e.target.value })}
                    placeholder="199.00"
                  />
                </div>
                <div>
                  <Label htmlFor="banner-discount-percent">{t('promotionsAdmin.discountPercentLabel')}</Label>
                  <Input
                    id="banner-discount-percent"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={form.discountPercent}
                    onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
                    placeholder="30"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label>{t('promotionsAdmin.associatedPromo')}</Label>
                  <Select
                    value={form.promotionId || NONE}
                    onValueChange={(v) => setForm({ ...form, promotionId: v === NONE ? '' : v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>{t('promotionsAdmin.none')}</SelectItem>
                      {promotions.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                          {p.code ? ` (${p.code})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('promotionsAdmin.featuredProduct')}</Label>
                  <Select
                    value={form.menuItemId || NONE}
                    onValueChange={(v) => setForm({ ...form, menuItemId: v === NONE ? '' : v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>{t('promotionsAdmin.noneM')}</SelectItem>
                      {menuItems.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="banner-starts">{t('promotionsAdmin.startsOptional')}</Label>
                  <Input
                    id="banner-starts"
                    type="date"
                    value={form.startsAt}
                    onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="banner-ends">{t('promotionsAdmin.endsOptional')}</Label>
                  <Input
                    id="banner-ends"
                    type="date"
                    value={form.endsAt}
                    onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-ink-600">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="h-4 w-4 rounded border-ink-200"
                />
                {t('promotionsAdmin.visibleOnHome')}
              </label>

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
