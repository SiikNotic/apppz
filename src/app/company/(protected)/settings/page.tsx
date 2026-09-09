'use client'

import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import type { Setting } from '@/lib/types'
import type { Json } from '@/lib/database.types'

export default function CompanySettingsPage() {
  const { can } = useAuth()
  const canManage = can('settings.manage')
  const [settings, setSettings] = useState<Setting[]>([])
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase
      .from('settings')
      .select('*')
      .not('key', 'like', 'rewards.%')
      .then(({ data }) => {
        setSettings(data ?? [])
        const d: Record<string, string> = {}
        for (const s of data ?? []) {
          d[s.key] = s.value === null ? '' : typeof s.value === 'string' ? s.value : JSON.stringify(s.value)
        }
        setDraft(d)
        setLoading(false)
      })
  }, [])

  async function handleSave() {
    setSaving(true)
    for (const setting of settings) {
      const raw = draft[setting.key]
      let value: Json = raw
      if (raw === '' || raw === 'null') value = null
      else if (raw === 'true' || raw === 'false') value = raw === 'true'
      else {
        const numeric = Number(raw)
        value = Number.isNaN(numeric) ? raw : numeric
      }
      await supabase.from('settings').update({ value, updated_at: new Date().toISOString() }).eq('key', setting.key)
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <p className="text-sm text-ink-400">Cargando…</p>

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Configuración</h1>
        <p className="text-sm text-ink-400">
          Estos valores los usa <code>calculate_cart_price</code> en cada checkout — cambian el
          costo real que se cobra, no solo lo que se muestra.
        </p>
      </div>

      <Card className="max-w-lg space-y-4 p-6">
        {settings.map((setting) => {
          const isBoolean = typeof setting.value === 'boolean'
          if (isBoolean) {
            return (
              <label key={setting.key} className="flex items-center gap-2.5 text-sm font-semibold text-ink-600">
                <input
                  type="checkbox"
                  checked={draft[setting.key] === 'true'}
                  onChange={(e) => setDraft({ ...draft, [setting.key]: String(e.target.checked) })}
                  disabled={!canManage}
                  className="h-4 w-4 rounded border-ink-200"
                />
                {setting.description ?? setting.key}
              </label>
            )
          }
          return (
            <div key={setting.key}>
              <Label htmlFor={setting.key}>{setting.description ?? setting.key}</Label>
              <Input
                id={setting.key}
                value={draft[setting.key] ?? ''}
                onChange={(e) => setDraft({ ...draft, [setting.key]: e.target.value })}
                disabled={!canManage}
                placeholder={setting.key.includes('threshold') ? 'null = desactivado' : undefined}
              />
            </div>
          )
        })}

        {canManage && (
          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              <Save size={16} aria-hidden="true" /> {saving ? 'Guardando…' : 'Guardar cambios'}
            </Button>
            {saved && <span role="status" className="text-xs font-semibold text-success-500">Guardado.</span>}
          </div>
        )}
      </Card>
    </div>
  )
}
