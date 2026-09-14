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
      {withHero && <div className="h-40 animate-pulse rounded-2xl bg-muted sm:h-48" />}
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 w-28 shrink-0 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
      {/* Mismo aspect-square + rounded-2xl que la tarjeta real
          (menu-grid.tsx) para que la foto no "salte" de tamaño al
          terminar de cargar. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className="aspect-square w-full animate-pulse bg-muted" />
            <div className="space-y-2 p-3">
              <div className="h-3.5 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-3 w-full animate-pulse rounded bg-muted" />
              <div className="h-6 w-full animate-pulse rounded-full bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
