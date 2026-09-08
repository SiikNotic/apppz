import { supabase } from '@/lib/supabase'
import { CategoryMenuClient } from './category-menu-client'

export async function generateStaticParams() {
  try {
    const { data, error } = await supabase.from('categories').select('id').eq('active', true)
    if (error) throw error
    if (data && data.length > 0) return data.map((cat) => ({ category: cat.id }))
  } catch (err) {
    console.warn('[generateStaticParams] No se pudo consultar categories en build time:', err)
  }
  // Ver nota equivalente en product/[id]/page.tsx.
  return [{ category: 'placeholder' }]
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params
  return <CategoryMenuClient categoryId={category} />
}
