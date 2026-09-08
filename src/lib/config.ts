export const BRAND_NAME = 'Nero Pizza Co.'
export const BRAND_TAGLINE = 'Dark kitchen · Solo delivery y pickup'

// El costo de envío, impuesto, puntos por dólar, etc. viven en la tabla
// `settings` de Supabase (configurables desde /company/settings) y se
// leen server-side dentro de calculate_cart_price() — no hardcodeados
// aquí. Ver src/lib/data-access/orders.ts.
