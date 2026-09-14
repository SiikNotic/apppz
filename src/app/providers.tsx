'use client'

import type { ReactNode } from 'react'
import { ThemeProvider } from 'next-themes'
import { AuthProvider } from '@/contexts/AuthContext'
import { CartProvider } from '@/contexts/CartContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { Toaster } from '@/components/ui/toast'

export function Providers({ children }: { children: ReactNode }) {
  return (
    // Sistema de diseño v3: dark-first (ver globals.css). Los tokens
    // semánticos (bg-background, text-foreground, bg-card...) ya son
    // oscuros por defecto en :root, así que basta con forzar la clase
    // "dark" para que TODO lo que ya usa esos tokens (ui/, buena parte
    // del dashboard, y las piezas de chrome/cliente migradas en este
    // lote) se vea con la paleta nueva de una — sin esperar a que cada
    // pantalla tenga su propia variante dark:.
    // Sigue forzado (no hay selector claro/oscuro real todavía) porque
    // muchas pantallas de cliente aún usan colores fijos claros
    // (bg-white, text-ink-900) que no reaccionan a este cambio — se ven
    // como tarjetas claras dentro del nuevo fondo oscuro hasta que se
    // migren en un próximo lote. Forzar evita además que el tema del
    // sistema operativo mande a alguien a un estado a medio migrar.
    <ThemeProvider attribute="class" forcedTheme="dark" disableTransitionOnChange>
      <LanguageProvider>
        <AuthProvider>
          <CartProvider>
            {children}
            <Toaster />
          </CartProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
