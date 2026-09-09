import { BRAND_NAME } from '@/lib/config'
import { HelpPageClient } from './help-page-client'

export const metadata = { title: `Ayuda · ${BRAND_NAME}` }

export default function HelpPage() {
  return <HelpPageClient />
}
