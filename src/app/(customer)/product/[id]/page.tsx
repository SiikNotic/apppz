import { supabase } from '@/lib/supabase'
import { ProductDetailClient } from './product-detail-client'

// Export estático: los productos se conocen en build time, así que
// pre-renderizamos una página por cada uno. Un producto creado después
// del último deploy no tendrá página hasta el siguiente build — es la
// limitación esperada de un sitio 100% estático (ver README).
export async function generateStaticParams() {
  try {
    const { data, error } = await supabase.from('menu_items').select('id').eq('active', true)
    if (error) throw error
    if (data && data.length > 0) return data.map((item) => ({ id: item.id }))
  } catch (err) {
    console.warn('[generateStaticParams] No se pudo consultar menu_items en build time:', err)
  }
  // output:'export' exige al menos una ruta. Si Supabase no es alcanzable
  // durante el build (ej. red restringida), esta página placeholder evita
  // que falle todo el build; en un build con red normal (CI) se reemplaza
  // por los productos reales.
  return [{ id: 'placeholder' }]
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ProductDetailClient menuItemId={id} />
}
