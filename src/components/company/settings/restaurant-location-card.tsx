'use client'

// Tarjeta separada del listado genérico de Configuración (igual que
// rewards.% tiene su propia sección) porque restaurant.lat/restaurant.lng
// no están pensados para editarse a mano — se calculan solos al guardar
// la dirección. Es el punto de recogida fijo que usa el mapa de
// seguimiento en vivo del cliente (LiveDeliveryMap).
import { useEffect, useState } from 'react'
import { MapPin, Save } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { geocodeAddress, MAPBOX_TOKEN } from '@/lib/mapbox'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/LanguageContext'

export function RestaurantLocationCard({ canManage }: { canManage: boolean }) {
  const { t } = useLanguage()
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase
      .from('settings')
      .select('key, value')
      .in('key', ['restaurant.address'])
      .then(({ data }) => {
        const value = data?.[0]?.value
        setAddress(typeof value === 'string' ? value : '')
        setLoading(false)
      })
  }, [])

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)

    const geocoded = await geocodeAddress(address)
    if (!geocoded) {
      setSaving(false)
      setError(t('restaurantLocation.geocodeFailed'))
      return
    }

    const now = new Date().toISOString()
    await Promise.all([
      supabase.from('settings').update({ value: address.trim(), updated_at: now }).eq('key', 'restaurant.address'),
      supabase.from('settings').update({ value: geocoded.lat, updated_at: now }).eq('key', 'restaurant.lat'),
      supabase.from('settings').update({ value: geocoded.lng, updated_at: now }).eq('key', 'restaurant.lng'),
    ])

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) return null

  return (
    <Card className="max-w-lg space-y-4 p-6">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <MapPin size={16} aria-hidden="true" /> {t('restaurantLocation.heading')}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">{t('restaurantLocation.hint')}</p>
      </div>

      {!MAPBOX_TOKEN && (
        <p className="rounded-2xl bg-amber-50 p-3 text-xs font-semibold text-warning-500">
          {t('restaurantLocation.noTokenWarning')}
        </p>
      )}

      <div>
        <Label htmlFor="restaurant-address">{t('restaurantLocation.addressLabel')}</Label>
        <Input
          id="restaurant-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder={t('restaurantLocation.addressPlaceholder')}
          disabled={!canManage}
        />
      </div>

      {error && (
        <p role="alert" className="text-xs font-semibold text-danger-500">
          {error}
        </p>
      )}

      {canManage && (
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving || !address.trim()}>
            <Save size={16} aria-hidden="true" />{' '}
            {saving ? t('restaurantLocation.locating') : t('restaurantLocation.saveAndLocate')}
          </Button>
          {saved && (
            <span role="status" className="text-xs font-semibold text-success-500">
              {t('restaurantLocation.locatedConfirm')}
            </span>
          )}
        </div>
      )}
    </Card>
  )
}
