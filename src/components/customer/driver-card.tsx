'use client'

// Tarjeta del repartidor en el seguimiento del cliente: foto o iniciales,
// nombre, botón de llamar y el chat efímero ya existente. Deliberadamente
// sin calificación por estrellas — no existe ningún sistema de rating de
// repartidores en la base de datos todavía; agregarlo sería fabricar un
// dato que no es real.
import { Phone } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { DeliveryChat } from '@/components/shared/delivery-chat'
import { useLanguage } from '@/contexts/LanguageContext'
import type { DeliveryAssignment, Profile } from '@/lib/types'

function initialsFor(name?: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  const initials = (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')
  return initials.toUpperCase() || '?'
}

interface DriverCardProps {
  profile: Profile | null
  assignment: DeliveryAssignment
}

export function DriverCard({ profile, assignment }: DriverCardProps) {
  const { t } = useLanguage()
  const name = profile?.full_name || t('deliveryTracking.driverFallbackName')
  const isEnRoute = assignment.status === 'en_route'

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-success-500" aria-hidden="true" />
        <p className="text-sm font-bold text-foreground">
          {isEnRoute ? t('deliveryTracking.statusOnTheWay') : t('deliveryTracking.statusHeadingToPickup')}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar_url} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-500 text-sm font-extrabold text-white">
            {initialsFor(profile?.full_name)}
          </span>
        )}
        <p className="min-w-0 flex-1 truncate text-base font-bold text-foreground">{name}</p>
        {profile?.phone && (
          <a
            href={`tel:${profile.phone}`}
            aria-label={t('deliveryTracking.callAria', { name })}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-900 hover:brightness-95"
          >
            <Phone size={16} aria-hidden="true" />
          </a>
        )}
      </div>

      <DeliveryChat assignmentId={assignment.id} role="customer" active />
    </Card>
  )
}
