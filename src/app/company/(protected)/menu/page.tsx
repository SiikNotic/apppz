'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ProductsTab } from '@/components/company/menu/products-tab'
import { CategoriesTab } from '@/components/company/menu/categories-tab'
import { ToppingsTab } from '@/components/company/menu/toppings-tab'
import { SimpleOptionsManager } from '@/components/company/menu/simple-options-manager'
import { useLanguage } from '@/contexts/LanguageContext'

export default function MenuManagementPage() {
  const [tab, setTab] = useState('productos')
  const { t } = useLanguage()

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">{t('menuMgmt.title')}</h1>
        <p className="text-sm text-ink-400">{t('menuMgmt.subtitle')}</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="productos">{t('menuMgmt.tabProducts')}</TabsTrigger>
          <TabsTrigger value="categorias">{t('menuMgmt.tabCategories')}</TabsTrigger>
          <TabsTrigger value="toppings">{t('menuMgmt.tabToppings')}</TabsTrigger>
          <TabsTrigger value="masas">{t('menuMgmt.tabCrusts')}</TabsTrigger>
          <TabsTrigger value="salsas">{t('menuMgmt.tabSauces')}</TabsTrigger>
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
          <SimpleOptionsManager table="crusts" title={t('menuMgmt.tabCrusts')} itemLabel={t('menuMgmt.crustItemLabel')} />
        </TabsContent>
        <TabsContent value="salsas">
          <SimpleOptionsManager table="sauces" title={t('menuMgmt.tabSauces')} itemLabel={t('menuMgmt.sauceItemLabel')} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
