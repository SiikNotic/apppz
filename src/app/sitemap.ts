import type { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'
import { BASE_PATH } from '@/lib/base-path'

export const dynamic = 'force-static'

const SITE_URL = `https://siiknotic.github.io${BASE_PATH}`

const STATIC_ROUTES = ['', '/menu', '/login', '/register', '/help', '/terms', '/privacy', '/accessibility']

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
  }))

  try {
    const [{ data: categories }, { data: items }] = await Promise.all([
      supabase.from('categories').select('id').eq('active', true),
      supabase.from('menu_items').select('id').eq('active', true),
    ])
    for (const cat of categories ?? []) {
      entries.push({ url: `${SITE_URL}/menu/${cat.id}`, lastModified: new Date() })
    }
    for (const item of items ?? []) {
      entries.push({ url: `${SITE_URL}/product/${item.id}`, lastModified: new Date() })
    }
  } catch {
    // Sin acceso a red en build time (ver nota en product/[id]/page.tsx):
    // el sitemap sale solo con las rutas estáticas: se regenera completo
    // en el próximo build con red normal.
  }

  return entries
}
