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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-3xl bg-white p-3.5 shadow-card">
            <div className="h-16 w-16 shrink-0 animate-pulse rounded-2xl bg-ink-100" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-2/3 animate-pulse rounded bg-ink-100" />
              <div className="h-3 w-full animate-pulse rounded bg-ink-100" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-ink-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
