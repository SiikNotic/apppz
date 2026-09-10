// Textura de marca: el mismo "papel tapiz" de íconos de comida en línea
// (rosa clarito) que aparece detrás de casi cada pantalla interior en la
// referencia (Perfil, Menú, Login/Registro, Chat, Order details). Es
// puramente decorativo — nunca contenido real — por eso va aria-hidden y
// sin interacción. El padre debe ser `relative overflow-hidden`.
import { Pizza, Donut, Croissant, IceCreamCone, Popsicle, Cookie, Carrot, Sandwich, CakeSlice } from 'lucide-react'

const ICONS: Array<{
  Icon: typeof Pizza
  top: string
  left: string
  size: number
  rotate: number
}> = [
  { Icon: Sandwich, top: '-6%', left: '86%', size: 34, rotate: -10 },
  { Icon: Carrot, top: '4%', left: '70%', size: 26, rotate: 18 },
  { Icon: Donut, top: '-4%', left: '58%', size: 30, rotate: -14 },
  { Icon: Pizza, top: '10%', left: '92%', size: 24, rotate: 12 },
  { Icon: Croissant, top: '-2%', left: '8%', size: 26, rotate: 8 },
  { Icon: Popsicle, top: '8%', left: '24%', size: 22, rotate: -16 },
  { Icon: CakeSlice, top: '2%', left: '40%', size: 22, rotate: 20 },
  { Icon: Cookie, top: '14%', left: '4%', size: 20, rotate: -6 },
  { Icon: IceCreamCone, top: '16%', left: '52%', size: 20, rotate: 10 },
]

export function DecorativeFoodPattern() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-28 overflow-hidden" aria-hidden="true">
      {ICONS.map(({ Icon, top, left, size, rotate }, i) => (
        <Icon
          key={i}
          size={size}
          strokeWidth={1.5}
          className="absolute text-brand-100"
          style={{ top, left, transform: `rotate(${rotate}deg)` }}
        />
      ))}
    </div>
  )
}
