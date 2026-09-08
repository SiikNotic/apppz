import type { MetadataRoute } from 'next'
import { BASE_PATH } from '@/lib/base-path'

export const dynamic = 'force-static'

const SITE_URL = `https://siiknotic.github.io${BASE_PATH}`

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/account/', '/checkout', '/order', '/company/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
