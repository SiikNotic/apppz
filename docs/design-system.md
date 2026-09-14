# Sistema de diseño v3 — dark-first premium food delivery

Fundación creada en este lote. Define el lenguaje visual objetivo para
TODA la app (cliente + dashboard) inspirado en la calidad de producto de
Uber Eats/DoorDash, sin clonar a ninguna. **No implica que cada pantalla
ya esté migrada** — ver "Qué falta" al final.

## Dónde viven los tokens

Todo en `src/app/globals.css`, bajo `:root` (que ahora ES el tema oscuro
por defecto, no solo `.dark` — ver comentario grande al inicio del
archivo) y el bloque `@theme inline` que los expone como utilidades de
Tailwind.

| Rol | Variable CSS | Utilidad Tailwind |
|---|---|---|
| Fondo de página | `--background` (`--surface-bg`) | `bg-background` |
| Superficie de tarjeta | `--card` (`--surface-1`) | `bg-card` |
| Popover/modal | `--popover` (`--surface-3`) | `bg-popover` |
| Texto principal | `--foreground` | `text-foreground` |
| Texto secundario | `--muted-foreground` | `text-muted-foreground` |
| Borde sutil | `--border` | `border-border` |
| CTA principal | `--primary` (rojo-coral `brand-500`) | `bg-primary`, `bg-brand-500` |
| Éxito / disponible / en camino | `success-500` | `bg-success-500`, `text-success-300` |
| Advertencia | `warning-500` | `bg-warning-500` |
| Error | `destructive` / `danger-500` | `bg-destructive` |
| Rating / rewards / highlights | `gold-500` | `bg-gold-500`, `text-gold-300` |

Reglas de uso: **verde solo para éxito/disponible/entrega**, **dorado
solo para rating/rewards**, nunca intercambiados.

Los nombres viejos (`ink-*`, `cream-*`) se conservan para no romper lo
que no se tocó esta sesión — son la paleta CLARA original y siguen
funcionando igual que antes en las pantallas que aún los usan.

## Tipografía

Escala semántica agregada (además de la de Tailwind `xs`..`9xl`):
`text-display`, `text-h1`, `text-h2`, `text-h3`, `text-price`,
`text-body`, `text-caption` — cada una con su line-height emparejado.
El precio (`text-price`) es deliberadamente su propio tamaño: siempre
debe ser más prominente que la descripción de un producto.

## Radio, sombra y alturas

- `--radius` bajó de `1rem` a `0.875rem` → afecta `rounded-sm/md/lg/xl`
  en toda la app (más discreto, "redondeado pero no excesivo").
  `rounded-2xl`/`rounded-3xl`/`rounded-full` NO están tokenizados
  (siguen el default de Tailwind) — se ajustan a mano por componente.
- `--shadow-card` / `--shadow-pop` / `--shadow-elevated`: sombras
  sutiles a propósito, pensadas para superficies oscuras (nada de glow
  grande ni difuso).
- `--control-h-sm/md/lg` (36/44/52px): alturas compartidas de
  botón/input/select — úsalas vía `h-(--control-h-md)` para que nunca
  desalineen en una misma fila.

## Componentes

**Primitivos pulidos** (`src/components/ui/`): Button, Card, Badge
(nueva variante `rating`), Input, Select, Dialog, Sheet, Tabs, Table,
StatCard (nuevo tono `rating`), ThemeToggle, EmptyState.

**Primitivos nuevos**: `skeleton.tsx`, `toast.tsx` (+ `<Toaster />`
montado en `providers.tsx`, aún sin conectar a ninguna acción),
`price.tsx` (`<PriceDisplay>`), `quantity-stepper.tsx`.

**Chrome de cliente migrado a los tokens nuevos**: `(customer)/layout.tsx`,
`bottom-tab-bar.tsx`, `home-top-bar.tsx`, `active-order-banner.tsx`,
`screen-back-button.tsx`, `decorative-food-pattern.tsx`,
`store-status-banner.tsx`.

**Product card rediseñada**: `menu-grid.tsx` — foto real a toda la
celda en `aspect-square` (antes: ícono circular chico sobre fondo
pastel), fallback a ícono solo cuando no hay foto real, precio vía
`<PriceDisplay>`. `menu-skeleton.tsx` actualizado a juego.

## Qué falta (próxima sesión, en este orden)

1. **Auditoría de contraste** — al volver `bg-card`/`bg-popover`/
   `bg-muted` oscuros por defecto, cualquier texto que todavía use
   `text-ink-900` (pensado para fondo claro) A SECAS sobre esos fondos
   ahora es casi ilegible. Se encontró y corrigió un caso confirmado
   (`company/login/page.tsx`). Quedan **~30 archivos más** con
   `text-ink-900` dentro de un `<Card>` sin auditar uno por uno —
   varios probablemente están bien (texto dentro de su propio chip
   con fondo claro), pero esto hay que verificarlo antes de seguir
   puliendo visualmente. Ver lista con:
   `grep -rl "text-ink-900" src/app src/components | xargs grep -l "<Card"`
2. Migrar el resto de pantallas de cliente (checkout, producto,
   cuenta, login/registro) — hoy usan `bg-white`/`text-ink-900`
   literales, se ven como tarjetas claras sobre el fondo oscuro nuevo.
3. Migrar el resto del dashboard de compañía que aún no usa tokens
   semánticos (~13 archivos con `bg-white`/`bg-ink-900` literal).
4. Conectar `toast()` a acciones reales (agregar al carrito, guardar
   cambios, etc.) — el primitivo existe pero no se usa todavía.
5. Construir Category nav / Search como componentes propios si el
   negocio los pide — no existían antes de este lote.
