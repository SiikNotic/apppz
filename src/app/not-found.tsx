import Link from 'next/link'
import { ChefHat } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-cream-100 px-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-500 text-ink-900">
          <ChefHat size={26} aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-extrabold text-ink-900">Página no encontrada</h1>
        <p className="max-w-sm text-sm text-ink-600">
          El enlace que seguiste no existe o el producto ya no está disponible.
        </p>
        <Button asChild>
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>
    </div>
  )
}
