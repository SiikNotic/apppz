import { BRAND_NAME } from '@/lib/config'
import { PrivacyPageClient } from './privacy-page-client'

export const metadata = { title: `Política de privacidad · ${BRAND_NAME}` }

export default function PrivacyPage() {
  return <PrivacyPageClient />
}
