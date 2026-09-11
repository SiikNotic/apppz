'use client'

// Horario real de la tienda + cierres puntuales + anulación manual — todo
// lo que alimenta is_store_open()/get_store_status() en el servidor (ver
// migración add_store_hours_and_closures). create_order() ya rechaza
// pedidos nuevos si esto da cerrado; esta tarjeta es donde se configura.
import { useEffect, useState } from 'react'
import { Clock, Save, Plus, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate } from '@/lib/format'
import { useLanguage } from '@/contexts/LanguageContext'
import type { StoreHours, StoreClosure } from '@/lib/types'

type OverrideValue = 'auto' | 'open' | 'closed'

export function StoreHoursCard({ canManage }: { canManage: boolean }) {
  const { t } = useLanguage()
  const DAY_KEYS = [
    t('storeHoursAdmin.day0'),
    t('storeHoursAdmin.day1'),
    t('storeHoursAdmin.day2'),
    t('storeHoursAdmin.day3'),
    t('storeHoursAdmin.day4'),
    t('storeHoursAdmin.day5'),
    t('storeHoursAdmin.day6'),
  ]

  const [hours, setHours] = useState<StoreHours[]>([])
  const [override, setOverride] = useState<OverrideValue>('auto')
  const [closures, setClosures] = useState<StoreClosure[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [closureStart, setClosureStart] = useState('')
  const [closureEnd, setClosureEnd] = useState('')
  const [closureReason, setClosureReason] = useState('')
  const [closureError, setClosureError] = useState<string | null>(null)
  const [addingClosure, setAddingClosure] = useState(false)

  async function load() {
    setLoading(true)
    const [{ data: hoursData }, { data: overrideRow }, { data: closuresData }] = await Promise.all([
      supabase.from('store_hours').select('*').order('day_of_week'),
      supabase.from('settings').select('value').eq('key', 'store.manual_override').maybeSingle(),
      supabase.from('store_closures').select('*').gte('end_at', new Date().toISOString()).order('start_at'),
    ])
    setHours(hoursData ?? [])
    setOverride((overrideRow?.value as OverrideValue | undefined) ?? 'auto')
    setClosures(closuresData ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function updateHour(day: number, patch: Partial<StoreHours>) {
    setHours((prev) => prev.map((h) => (h.day_of_week === day ? { ...h, ...patch } : h)))
  }

  async function handleSaveHours() {
    setSaving(true)
    await Promise.all(
      hours.map((h) =>
        supabase
          .from('store_hours')
          .update({ open_time: h.open_time, close_time: h.close_time, is_closed: h.is_closed })
          .eq('day_of_week', h.day_of_week)
      )
    )
    if (override === 'auto') {
      await supabase.from('settings').delete().eq('key', 'store.manual_override')
    } else {
      await supabase.from('settings').upsert({ key: 'store.manual_override', value: override })
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function handleAddClosure() {
    setClosureError(null)
    if (!closureStart || !closureEnd) {
      setClosureError(t('storeHoursAdmin.closureMissingDates'))
      return
    }
    const startAt = new Date(closureStart)
    const endAt = new Date(closureEnd)
    if (endAt <= startAt) {
      setClosureError(t('storeHoursAdmin.closureInvalidRange'))
      return
    }
    setAddingClosure(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { error } = await supabase.from('store_closures').insert({
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      reason: closureReason.trim() || null,
      created_by: user?.id ?? null,
    })
    setAddingClosure(false)
    if (error) {
      setClosureError(t('storeHoursAdmin.closureSaveFailed'))
      return
    }
    setClosureStart('')
    setClosureEnd('')
    setClosureReason('')
    load()
  }

  async function handleDeleteClosure(id: string) {
    await supabase.from('store_closures').delete().eq('id', id)
    load()
  }

  if (loading) return null

  return (
    <Card className="max-w-2xl space-y-5 p-6">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Clock size={16} aria-hidden="true" /> {t('storeHoursAdmin.heading')}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">{t('storeHoursAdmin.hint')}</p>
      </div>

      <div className="space-y-2">
        {hours.map((h) => (
          <div
            key={h.day_of_week}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-border p-2.5"
          >
            <span className="w-24 shrink-0 text-sm font-semibold text-foreground">{DAY_KEYS[h.day_of_week]}</span>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <input
                type="checkbox"
                checked={h.is_closed}
                onChange={(e) => updateHour(h.day_of_week, { is_closed: e.target.checked })}
                disabled={!canManage}
                className="h-4 w-4 rounded border-ink-200"
              />
              {t('storeHoursAdmin.closedAllDay')}
            </label>
            {!h.is_closed && (
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={h.open_time.slice(0, 5)}
                  onChange={(e) => updateHour(h.day_of_week, { open_time: e.target.value })}
                  disabled={!canManage}
                  className="w-28"
                />
                <span className="text-xs text-muted-foreground">–</span>
                <Input
                  type="time"
                  value={h.close_time.slice(0, 5)}
                  onChange={(e) => updateHour(h.day_of_week, { close_time: e.target.value })}
                  disabled={!canManage}
                  className="w-28"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div>
        <Label>{t('storeHoursAdmin.manualOverride')}</Label>
        <Select value={override} onValueChange={(v) => setOverride(v as OverrideValue)} disabled={!canManage}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">{t('storeHoursAdmin.overrideAuto')}</SelectItem>
            <SelectItem value="open">{t('storeHoursAdmin.overrideOpen')}</SelectItem>
            <SelectItem value="closed">{t('storeHoursAdmin.overrideClosed')}</SelectItem>
          </SelectContent>
        </Select>
        <p className="mt-1 text-[11px] text-muted-foreground">{t('storeHoursAdmin.overrideHint')}</p>
      </div>

      {canManage && (
        <div className="flex items-center gap-3">
          <Button onClick={handleSaveHours} disabled={saving}>
            <Save size={16} aria-hidden="true" /> {saving ? t('account.saving') : t('account.saveChanges')}
          </Button>
          {saved && <span role="status" className="text-xs font-semibold text-success-500">{t('settingsAdmin.saved')}</span>}
        </div>
      )}

      <div className="border-t border-border pt-4">
        <h3 className="text-sm font-bold text-foreground">{t('storeHoursAdmin.closuresHeading')}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{t('storeHoursAdmin.closuresHint')}</p>

        <div className="mt-3 space-y-2">
          {closures.length === 0 && <p className="text-xs text-muted-foreground">{t('storeHoursAdmin.noClosures')}</p>}
          {closures.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 rounded-2xl bg-muted/50 p-3 text-xs">
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{c.reason || t('storeHoursAdmin.noReason')}</p>
                <p className="text-muted-foreground">
                  {formatDate(c.start_at)} – {formatDate(c.end_at)}
                </p>
              </div>
              {canManage && (
                <button
                  onClick={() => handleDeleteClosure(c.id)}
                  className="shrink-0 rounded-full bg-red-50 p-2 text-danger-500 hover:brightness-95"
                  aria-label={t('common.delete')}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              )}
            </div>
          ))}
        </div>

        {canManage && (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <Label htmlFor="closure-start">{t('storeHoursAdmin.closureStart')}</Label>
              <Input id="closure-start" type="datetime-local" value={closureStart} onChange={(e) => setClosureStart(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="closure-end">{t('storeHoursAdmin.closureEnd')}</Label>
              <Input id="closure-end" type="datetime-local" value={closureEnd} onChange={(e) => setClosureEnd(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="closure-reason">{t('storeHoursAdmin.closureReason')}</Label>
              <Input
                id="closure-reason"
                value={closureReason}
                onChange={(e) => setClosureReason(e.target.value)}
                placeholder={t('storeHoursAdmin.closureReasonPlaceholder')}
              />
            </div>
            <Button onClick={handleAddClosure} disabled={addingClosure} size="sm" className="sm:col-span-2">
              <Plus size={14} aria-hidden="true" /> {addingClosure ? t('storeHoursAdmin.addingClosure') : t('storeHoursAdmin.addClosure')}
            </Button>
          </div>
        )}
        {closureError && (
          <p role="alert" className="mt-2 text-xs font-semibold text-danger-500">
            {closureError}
          </p>
        )}
      </div>
    </Card>
  )
}
