'use client'

import type { ReactNode } from 'react'
import { ThemeProvider } from 'next-themes'
import { AuthProvider } from '@/contexts/AuthContext'
import { CartProvider } from '@/contexts/CartContext'
import { LanguageProvider } from '@/contexts/LanguageContext'

export function Providers({ children }: { children: ReactNode }) {
  return (
    // El dark mode queda en pausa: muchas pantallas todavía usan colores de
    // texto/fondo fijos (no los tokens semánticos), así que activar el tema
    // oscuro del sistema producía combinaciones ilegibles (texto oscuro
    // sobre tarjetas oscuras). Con forcedTheme="light" la app siempre se ve
    // con la paleta naranja/crema pensada en el diseño, sin importar el
    // tema del dispositivo, hasta terminar esa migración.
    <ThemeProvider attribute="class" forcedTheme="light" disableTransitionOnChange>
      <LanguageProvider>
        <AuthProvider>
          <CartProvider>{children}</CartProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
