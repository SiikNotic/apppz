import { Pizza, Sandwich, Donut } from 'lucide-react'

// Ilustración sobre blob rosa arriba de Login/Registro — mismo espíritu
// que la referencia (comida a color sobre un semicírculo rosa), armada
// con los íconos de línea que ya usa el resto de la app en vez de arte
// fotográfico (no hay assets de foto de referencia disponibles). Las dos
// pantallas siguen siendo páginas separadas — esa parte del scope no
// cambió, solo la cabecera visual.
export function AuthHero() {
  return (
    <div className="relative -mx-7 -mt-7 mb-6 overflow-hidden rounded-t-3xl bg-brand-100 pb-8 pt-10">
      <div className="flex items-end justify-center gap-3">
        <Donut size={40} strokeWidth={1.5} className="mb-1 rotate-[-12deg] text-brand-400" aria-hidden="true" />
        <Sandwich size={68} strokeWidth={1.25} className="text-brand-600" aria-hidden="true" />
        <Pizza size={56} strokeWidth={1.25} className="mb-2 rotate-[14deg] text-brand-500" aria-hidden="true" />
      </div>
    </div>
  )
}
