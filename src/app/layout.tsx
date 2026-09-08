import type { Metadata, Viewport } from 'next'
import { Providers } from './providers'
import { BASE_PATH } from '@/lib/base-path'
import './globals.css'

export const metadata: Metadata = {
  title: 'Nero Pizza Co.',
  description: 'Dark kitchen de pizzas: pedidos para clientes y panel administrativo.',
  icons: { icon: `${BASE_PATH}/favicon.svg` },
}

export const viewport: Viewport = {
  themeColor: '#f2601c',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
