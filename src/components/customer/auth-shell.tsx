import type { ReactNode } from 'react'
import { Pizza, Sandwich, Donut } from 'lucide-react'
import { DecorativeFoodPattern } from './decorative-food-pattern'
import { BRAND_NAME } from '@/lib/config'

// Reemplaza el blob rosa de AuthHero (sistema visual viejo) por el
// tratamiento premium dark-first: en vez de fotografía (no hay assets
// de foto reales en el proyecto — ver nota que tenía AuthHero), un
// bloque de color sólido y fuerte con la misma ilustración de línea que
// ya usa el resto de la app, nunca un degradado ni efecto de vidrio.
// En escritorio ocupa un lado completo (split layout); en mobile se
// reduce a una franja compacta arriba del formulario para no competir
// por espacio vertical con los campos.
function FoodIllustration({ size }: { size: 'lg' | 'sm' }) {
  const big = size === 'lg'
  return (
    <div className="flex items-end justify-center gap-3">
      <Donut size={big ? 44 : 32} strokeWidth={1.5} className="mb-1 rotate-[-12deg] text-white/70" aria-hidden="true" />
      <Sandwich size={big ? 76 : 56} strokeWidth={1.25} className="text-white" aria-hidden="true" />
      <Pizza size={big ? 62 : 46} strokeWidth={1.25} className="mb-2 rotate-[14deg] text-white/85" aria-hidden="true" />
    </div>
  )
}

interface AuthShellProps {
  /** Frase corta reutilizada de un texto de marca ya existente (nunca
   *  copy nuevo inventado acá) — ver usos en login/register/etc. */
  tagline: string
  children: ReactNode
}

export function AuthShell({ tagline, children }: AuthShellProps) {
  return (
    <div className="mx-auto max-w-5xl py-4 sm:py-8">
      <div className="grid grid-cols-1 overflow-hidden rounded-3xl border border-border bg-card shadow-elevated lg:grid-cols-2">
        {/* Franja compacta — solo mobile/tablet */}
        <div className="relative overflow-hidden bg-brand-600 px-6 py-7 lg:hidden">
          <DecorativeFoodPattern />
          <FoodIllustration size="sm" />
        </div>

        {/* Panel completo — solo escritorio */}
        <div className="relative hidden flex-col items-center justify-center overflow-hidden bg-brand-600 px-10 py-12 lg:flex">
          <DecorativeFoodPattern />
          <FoodIllustration size="lg" />
          <p className="mt-8 text-center text-display font-extrabold leading-tight text-white">{BRAND_NAME}</p>
          <p className="mt-3 max-w-xs text-center text-sm font-medium text-white/80">{tagline}</p>
        </div>

        <div className="flex flex-col justify-center px-6 py-8 sm:px-10 sm:py-10">{children}</div>
      </div>
    </div>
  )
}
