import Image from 'next/image'
import { categoryEmoji } from '@/lib/category-icon'

/**
 * Ícono de una píldora de categoría: si el staff subió una imagen para esa
 * categoría (categories.image_url) se muestra esa foto en miniatura; si no,
 * cae al emoji automático por palabra clave de siempre. Nunca al revés —
 * la imagen es opcional, el emoji sigue siendo el respaldo garantizado.
 */
export function CategoryPillIcon({ name, imageUrl }: { name: string; imageUrl?: string | null }) {
  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt=""
        width={20}
        height={20}
        unoptimized
        className="inline-block h-5 w-5 shrink-0 rounded-full object-cover align-middle"
      />
    )
  }
  return <span aria-hidden="true">{categoryEmoji(name)}</span>
}
