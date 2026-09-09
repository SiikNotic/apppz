'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Gift, Save } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RewardCatalogManager } from '@/components/company/rewards/reward-catalog-manager'
import type { RewardTier, Setting } from '@/lib/types'

interface TierForm {
  name: string
  minLifetimePoints: string
  sortOrder: string
  benefits: string
}

const EMPTY_TIER: TierForm = { name: '', minLifetimePoints: '0', sortOrder: '0', benefits: '' }

export default function RewardsSettingsPage() {
  const { can } = useAuth()
  const canManage = can('rewards.manage')

  const [tiers, setTiers] = useState<RewardTier[]>([])
  const [settings, setSettings] = useState<Record<string, Setting>>({})
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<TierForm>(EMPTY_TIER)

  const [settingsDraft, setSettingsDraft] = useState<Record<string, string>>({})
  const [savingSettings, setSavingSettings] = useState(false)
  const [savedNotice, setSavedNotice] = useState(false)

  async function load() {
    setLoading(true)
    const [tiersRes, settingsRes] = await Promise.all([
      supabase.from('reward_tiers').select('*').order('sort_order'),
      supabase.from('settings').select('*').like('key', 'rewards.%'),
    ])
    setTiers(tiersRes.data ?? [])
    const map: Record<string, Setting> = {}
    const draft: Record<string, string> = {}
    for (const s of settingsRes.data ?? []) {
      map[s.key] = s
      draft[s.key] = typeof s.value === 'number' ? String(s.value) : JSON.stringify(s.value)
    }
    setSettings(map)
    setSettingsDraft(draft)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_TIER)
    setFormOpen(true)
  }

  function openEdit(tier: RewardTier) {
    setEditingId(tier.id)
    setForm({
      name: tier.name,
      minLifetimePoints: String(tier.min_lifetime_points),
      sortOrder: String(tier.sort_order),
      benefits: Array.isArray(tier.benefits) ? (tier.benefits as string[]).join('\n') : '',
    })
    setFormOpen(true)
  }

  async function handleSaveTier() {
    const payload = {
      name: form.name.trim(),
      min_lifetime_points: Number(form.minLifetimePoints) || 0,
      sort_order: Number(form.sortOrder) || 0,
      benefits: form.benefits.split('\n').map((b) => b.trim()).filter(Boolean),
    }
    if (editingId) await supabase.from('reward_tiers').update(payload).eq('id', editingId)
    else await supabase.from('reward_tiers').insert(payload)
    setFormOpen(false)
    load()
  }

  async function handleDeleteTier(tier: RewardTier) {
    if (!confirm(`¿Eliminar el nivel "${tier.name}"?`)) return
    await supabase.from('reward_tiers').delete().eq('id', tier.id)
    load()
  }

  async function handleSaveSettings() {
    setSavingSettings(true)
    for (const key of Object.keys(settingsDraft)) {
      const raw = settingsDraft[key]
      const numeric = Number(raw)
      await supabase
        .from('settings')
        .update({ value: Number.isNaN(numeric) ? raw : numeric, updated_at: new Date().toISOString() })
        .eq('key', key)
    }
    setSavingSettings(false)
    setSavedNotice(true)
    setTimeout(() => setSavedNotice(false), 2000)
    load()
  }

  if (loading) return <p className="text-sm text-ink-400">Cargando…</p>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Rewards</h1>
        <p className="text-sm text-ink-400">Configura cómo tus clientes ganan y canjean puntos.</p>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-sm font-bold text-ink-900">Reglas de puntos</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {Object.entries(settings).map(([key, setting]) => (
            <div key={key}>
              <Label htmlFor={key}>{setting.description ?? key}</Label>
              <Input
                id={key}
                value={settingsDraft[key] ?? ''}
                onChange={(e) => setSettingsDraft({ ...settingsDraft, [key]: e.target.value })}
                disabled={!canManage}
              />
            </div>
          ))}
        </div>
        {canManage && (
          <div className="mt-4 flex items-center gap-3">
            <Button onClick={handleSaveSettings} disabled={savingSettings}>
              <Save size={16} aria-hidden="true" /> {savingSettings ? 'Guardando…' : 'Guardar reglas'}
            </Button>
            {savedNotice && <span role="status" className="text-xs font-semibold text-success-500">Guardado.</span>}
          </div>
        )}
      </Card>

      <RewardCatalogManager canManage={canManage} />

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink-900">Niveles</h2>
          {canManage && (
            <Button size="sm" onClick={openCreate}>
              <Plus size={14} aria-hidden="true" /> Nivel
            </Button>
          )}
        </div>
        <div className="space-y-3">
          {tiers.map((tier) => (
            <div key={tier.id} className="flex items-center justify-between rounded-2xl bg-ink-50 p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-900">
                  <Gift size={16} aria-hidden="true" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-ink-900">{tier.name}</span>
                    <Badge variant="brand">{tier.min_lifetime_points}+ pts</Badge>
                  </div>
                  {Array.isArray(tier.benefits) && tier.benefits.length > 0 && (
                    <p className="text-xs text-ink-400">{(tier.benefits as string[]).join(' · ')}</p>
                  )}
                </div>
              </div>
              {canManage && (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => openEdit(tier)}
                    aria-label={`Editar nivel ${tier.name}`}
                    className="grid h-8 w-8 place-items-center rounded-full bg-white text-ink-600 hover:bg-ink-100"
                  >
                    <Pencil size={14} aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => handleDeleteTier(tier)}
                    aria-label={`Eliminar nivel ${tier.name}`}
                    className="grid h-8 w-8 place-items-center rounded-full bg-white text-danger-500 hover:bg-red-50"
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-sm">
          <div className="p-6">
            <DialogTitle className="mb-4 text-lg font-extrabold text-ink-900">
              {editingId ? 'Editar nivel' : 'Nuevo nivel'}
            </DialogTitle>
            <div className="space-y-3">
              <div>
                <Label htmlFor="tier-name">Nombre</Label>
                <Input id="tier-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="tier-points">Puntos mínimos</Label>
                  <Input
                    id="tier-points"
                    type="number"
                    value={form.minLifetimePoints}
                    onChange={(e) => setForm({ ...form, minLifetimePoints: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="tier-order">Orden</Label>
                  <Input id="tier-order" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
                </div>
              </div>
              <div>
                <Label htmlFor="tier-benefits">Beneficios (uno por línea)</Label>
                <Textarea
                  id="tier-benefits"
                  rows={3}
                  value={form.benefits}
                  onChange={(e) => setForm({ ...form, benefits: e.target.value })}
                />
              </div>
              <Button fullWidth onClick={handleSaveTier}>
                Guardar nivel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
