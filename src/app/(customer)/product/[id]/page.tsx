import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import { BASE_PATH } from '@/lib/base-path'
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

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const { data: item } = await supabase.from('menu_items').select('*').eq('id', id).maybeSingle()
  if (!item) return { title: 'Producto' }
  return {
    title: item.name,
    description: item.description ?? `Pide ${item.name} en línea.`,
    openGraph: item.image_url
      ? { images: [{ url: item.image_url }], title: item.name, description: item.description ?? undefined }
      : undefined,
  }
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: item } = await supabase.from('menu_items').select('*').eq('id', id).maybeSingle()

  const jsonLd = item
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: item.name,
        description: item.description ?? undefined,
        image: item.image_url ?? undefined,
        offers: {
          '@type': 'Offer',
          price: item.base_price,
          priceCurrency: 'USD',
          availability: item.active ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          url: `https://siiknotic.github.io${BASE_PATH}/product/${item.id}`,
        },
      }
    : null

  return (
    <>
      {jsonLd && (
        // eslint-disable-next-line react/no-danger -- JSON-LD estructurado, no HTML de usuario
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      )}
      <ProductDetailClient menuItemId={id} />
    </>
  )
}
