// Locale 'en-US' a propósito, aunque el resto de la app está en es-MX: con
// 'es-MX' + currency 'USD' (una moneda ajena a ese locale) Intl no tiene
// símbolo localizado y escribe el código completo con un espacio — "USD
// 10.25" en vez de "$10.25". Ese espacio es lo que partía el número en dos
// líneas feas ("USD 0" / ".00") en las tarjetas angostas del dashboard en
// celular — pasaba en cualquier pantalla con una tarjeta de estadística
// (Horas y pagos, Analítica, Conductores, etc.), no solo ahí. El
// agrupamiento de miles y el separador decimal son iguales en ambos
// locales, así que el único cambio real es el símbolo: más corto y sin
// espacio interno que romper.
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value)
}

export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value)
}
