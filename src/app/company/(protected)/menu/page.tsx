'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ProductsTab } from '@/components/company/menu/products-tab'
import { CategoriesTab } from '@/components/company/menu/categories-tab'
import { ToppingsTab } from '@/components/company/menu/toppings-tab'
import { SimpleOptionsManager } from '@/components/company/menu/simple-options-manager'

export default function MenuManagementPage() {
  const [tab, setTab] = useState('productos')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Gestión de menú</h1>
        <p className="text-sm text-ink-400">
          Administra productos, categorías y las opciones de personalización de pizzas.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="productos">Productos</TabsTrigger>
          <TabsTrigger value="categorias">Categorías</TabsTrigger>
          <TabsTrigger value="toppings">Toppings</TabsTrigger>
          <TabsTrigger value="masas">Masas</TabsTrigger>
          <TabsTrigger value="salsas">Salsas</TabsTrigger>
        </TabsList>

        <TabsContent value="productos">
          <ProductsTab />
        </TabsContent>
        <TabsContent value="categorias">
          <CategoriesTab />
        </TabsContent>
        <TabsContent value="toppings">
          <ToppingsTab />
        </TabsContent>
        <TabsContent value="masas">
          <SimpleOptionsManager table="crusts" title="Masas" itemLabel="Masa" />
        </TabsContent>
        <TabsContent value="salsas">
          <SimpleOptionsManager table="sauces" title="Salsas" itemLabel="Salsa" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
