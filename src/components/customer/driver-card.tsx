'use client'

// Tarjeta del repartidor en el seguimiento del cliente: foto o iniciales,
// nombre, vehículo (si el conductor lo tiene cargado), botón de llamar y
// el chat efímero ya existente (colapsado en un botón — se expande solo
// al tocarlo, para no competir con el mapa por espacio/atención).
// Deliberadamente sin calificación por estrellas — no existe ningún
// sistema de rating de repartidores en la base de datos todavía;
// agregarlo sería fabricar un dato que no es real.
import { Phone, Bike } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { DeliveryChat } from '@/components/shared/delivery-chat'
import { useLanguage } from '@/contexts/LanguageContext'
import type { DeliveryAssignment, Driver, Profile } from '@/lib/types'

function initialsFor(name?: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  const initials = (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')
  return initials.toUpperCase() || '?'
}

export type DriverVehicle = Pick<Driver, 'vehicle_type' | 'vehicle_year' | 'license_plate'> & {
  vehicle_makes: { name: string } | null
  vehicle_models: { name: string } | null
}

/** "Toyota Corolla (2021) · ABC-123" — cada parte solo aparece si el
 *  conductor de verdad la tiene cargada, nunca un valor de relleno. */
function vehicleLabel(vehicle: DriverVehicle | null): string | null {
  if (!vehicle) return null
  const makeModel = [vehicle.vehicle_makes?.name, vehicle.vehicle_models?.name].filter(Boolean).join(' ')
  const withYear = makeModel && vehicle.vehicle_year ? `${makeModel} (${vehicle.vehicle_year})` : makeModel
  return [withYear || null, vehicle.license_plate].filter(Boolean).join(' · ') || null
}

interface DriverCardProps {
  profile: Profile | null
  vehicle?: DriverVehicle | null
  assignment: DeliveryAssignment
}

export function DriverCard({ profile, vehicle, assignment }: DriverCardProps) {
  const { t } = useLanguage()
  const name = profile?.full_name || t('deliveryTracking.driverFallbackName')
  const isEnRoute = assignment.status === 'en_route'
  const vehicleText = vehicleLabel(vehicle ?? null)

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-success-500" aria-hidden="true" />
        <p className="text-sm font-bold text-foreground">
          {isEnRoute ? t('deliveryTracking.statusOnTheWay') : t('deliveryTracking.statusHeadingToPickup')}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar_url} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-border" />
        ) : (
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand-500 text-base font-extrabold text-white">
            {initialsFor(profile?.full_name)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-foreground">{name}</p>
          {vehicleText && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
              <Bike size={12} className="shrink-0" aria-hidden="true" /> {vehicleText}
            </p>
          )}
        </div>
        {profile?.phone && (
          <a
            href={`tel:${profile.phone}`}
            aria-label={t('deliveryTracking.callAria', { name })}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-500/15 text-brand-400 transition hover:bg-brand-500/25"
          >
            <Phone size={17} aria-hidden="true" />
          </a>
        )}
      </div>

      <DeliveryChat assignmentId={assignment.id} role="customer" active />
    </Card>
  )
}
