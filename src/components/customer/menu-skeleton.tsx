/**
 * Placeholder de carga para pantallas que dependen de un fetch de menú en
 * el cliente (home, /menu) — el loading.tsx de la ruta solo cubre la
 * transición de navegación, no el fetch que corre después de montar la
 * página, así que sin esto se veía un simple "Cargando…" de texto plano.
 */
export function MenuSkeleton({ withHero = false }: { withHero?: boolean }) {
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando el menú…</span>
      {withHero && <div className="h-40 animate-pulse rounded-3xl bg-ink-100/60 sm:h-48" />}
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 w-28 shrink-0 animate-pulse rounded-2xl bg-ink-100" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-3xl bg-white shadow-card">
            <div className="flex items-center justify-center bg-ink-50 p-4 pb-3">
              <div className="h-28 w-28 shrink-0 animate-pulse rounded-full bg-ink-100" />
            </div>
            <div className="space-y-2 p-3">
              <div className="h-3.5 w-2/3 animate-pulse rounded bg-ink-100" />
              <div className="h-3 w-full animate-pulse rounded bg-ink-100" />
              <div className="h-6 w-full animate-pulse rounded-full bg-ink-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
