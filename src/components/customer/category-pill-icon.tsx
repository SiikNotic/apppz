import Image from 'next/image'
import { cn } from '@/lib/utils'
import { categoryEmoji } from '@/lib/category-icon'

const PX = { sm: 20, lg: 56 }

/**
 * Ícono de una categoría: si el staff subió una imagen (categories.image_url)
 * se muestra esa foto en miniatura; si no, cae al emoji automático por
 * palabra clave de siempre. Nunca al revés — la imagen es opcional, el
 * emoji sigue siendo el respaldo garantizado.
 *
 * `size="sm"` (default) es la píldora inline de siempre (Menú). `size="lg"`
 * es el círculo grande del carril de categorías de Home — mismo
 * componente, solo cambia el tamaño y que el emoji de respaldo se pinta
 * dentro de un círculo en vez de suelto junto al texto.
 */
export function CategoryPillIcon({
  name,
  imageUrl,
  size = 'sm',
  className,
}: {
  name: string
  imageUrl?: string | null
  size?: 'sm' | 'lg'
  /** Solo aplica en size="lg" — para que quien llama pueda agregar, p.ej.,
   *  un ring de selección directo sobre el círculo sin cambiar su tamaño. */
  className?: string
}) {
  const px = PX[size]
  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt=""
        width={px}
        height={px}
        unoptimized
        className={cn(
          'shrink-0 rounded-full object-cover',
          size === 'sm' ? 'inline-block h-5 w-5 align-middle' : 'h-14 w-14',
          size === 'lg' && className
        )}
      />
    )
  }
  if (size === 'lg') {
    return (
      <span
        className={cn('grid h-14 w-14 shrink-0 place-items-center rounded-full bg-surface-2 text-2xl', className)}
        aria-hidden="true"
      >
        {categoryEmoji(name)}
      </span>
    )
  }
  return <span aria-hidden="true">{categoryEmoji(name)}</span>
}
