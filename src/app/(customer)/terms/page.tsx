import { BRAND_NAME } from '@/lib/config'
import { TermsPageClient } from './terms-page-client'

export const metadata = { title: `Términos de servicio · ${BRAND_NAME}` }

export default function TermsPage() {
  return <TermsPageClient />
}
