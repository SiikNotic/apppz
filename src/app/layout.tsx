import type { Metadata, Viewport } from 'next'
import { Providers } from './providers'
import { BASE_PATH } from '@/lib/base-path'
import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/config'
import './globals.css'

export const metadata: Metadata = {
  title: { default: BRAND_NAME, template: `%s · ${BRAND_NAME}` },
  description: `${BRAND_TAGLINE}. Pide pizza en línea, arma la tuya con toppings frescos y da seguimiento a tu pedido en tiempo real.`,
  icons: { icon: `${BASE_PATH}/favicon.svg` },
  openGraph: {
    title: BRAND_NAME,
    description: BRAND_TAGLINE,
    type: 'website',
    locale: 'es_MX',
  },
  twitter: {
    card: 'summary',
    title: BRAND_NAME,
    description: BRAND_TAGLINE,
  },
}

export const viewport: Viewport = {
  themeColor: '#f2601c',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
