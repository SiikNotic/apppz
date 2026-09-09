'use client'

import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'

import { cn } from '@/lib/utils'

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn('flex flex-col gap-4', className)}
      {...props}
    />
  )
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        // `flex` (no `inline-flex`/`w-fit`) para que el elemento se acote al
        // ancho del contenedor en vez de crecer con su contenido — así
        // `overflow-x-auto` puede recortar/scrollear internamente los tabs
        // que no caben, en lugar de empujar el ancho de toda la página
        // (el bug de "Producto/Categoría/Topping/Masa" se saliendo en Mobile).
        'no-scrollbar flex max-w-full items-center gap-2 overflow-x-auto',
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'shrink-0 rounded-full bg-card px-4 py-2 text-sm font-semibold text-muted-foreground transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-card disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn('flex-1', className)} {...props} />
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
