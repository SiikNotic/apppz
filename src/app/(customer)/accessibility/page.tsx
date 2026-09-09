import { BRAND_NAME } from '@/lib/config'
import { AccessibilityPageClient } from './accessibility-page-client'

export const metadata = { title: `Accesibilidad · ${BRAND_NAME}` }

export default function AccessibilityPage() {
  return <AccessibilityPageClient />
}
