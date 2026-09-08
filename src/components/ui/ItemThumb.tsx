import { Pizza, Salad, CupSoda, IceCreamBowl, UtensilsCrossed } from 'lucide-react'
import clsx from 'clsx'

const ICONS_BY_KEYWORD: { test: RegExp; Icon: typeof Pizza }[] = [
  { test: /pizza/i, Icon: Pizza },
  { test: /bebida|refresco|agua/i, Icon: CupSoda },
  { test: /postre|brownie|helado/i, Icon: IceCreamBowl },
  { test: /entrada|pan|alita|ensalada/i, Icon: Salad },
]

function pickIcon(name: string) {
  return ICONS_BY_KEYWORD.find((entry) => entry.test.test(name))?.Icon ?? UtensilsCrossed
}

interface ItemThumbProps {
  name: string
  imageUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'h-12 w-12',
  md: 'h-16 w-16',
  lg: 'h-28 w-28',
}

const iconSizes = { sm: 18, md: 24, lg: 40 }

export function ItemThumb({ name, imageUrl, size = 'md', className }: ItemThumbProps) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={clsx('rounded-2xl object-cover', sizeClasses[size], className)}
      />
    )
  }
  const Icon = pickIcon(name)
  return (
    <div
      className={clsx(
        'grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200 text-brand-600',
        sizeClasses[size],
        className
      )}
    >
      <Icon size={iconSizes[size]} strokeWidth={1.75} />
    </div>
  )
}
