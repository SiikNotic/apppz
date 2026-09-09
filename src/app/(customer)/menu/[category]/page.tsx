// Esta ruta mostraba una vista de categoría separada (un back-link + esa
// categoría sola) — exactamente el "cambia de pantalla" que no queremos:
// las categorías del inicio deben aterrizar en el MISMO menú con filtro
// instantáneo, no en otra página. Se deja como redirect permanente hacia
// /menu?category=X para no romper enlaces/marcadores viejos.
import { supabase } from '@/lib/supabase'
import { CategoryRedirect } from './category-redirect'

export async function generateStaticParams() {
  try {
    const { data, error } = await supabase.from('categories').select('id').eq('active', true)
    if (error) throw error
    if (data && data.length > 0) return data.map((cat) => ({ category: cat.id }))
  } catch (err) {
    console.warn('[generateStaticParams] No se pudo consultar categories en build time:', err)
  }
  return [{ category: 'placeholder' }]
}

export default async function CategoryRedirectPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params
  return <CategoryRedirect categoryId={category} />
}
