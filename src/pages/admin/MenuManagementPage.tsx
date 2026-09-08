import { useState } from 'react'
import clsx from 'clsx'
import { ProductsTab } from './menu/ProductsTab'
import { CategoriesTab } from './menu/CategoriesTab'
import { ToppingsTab } from './menu/ToppingsTab'
import { SimpleOptionsManager } from './menu/SimpleOptionsManager'

const TABS = [
  { key: 'productos', label: 'Productos' },
  { key: 'categorias', label: 'Categorías' },
  { key: 'toppings', label: 'Toppings' },
  { key: 'masas', label: 'Masas' },
  { key: 'salsas', label: 'Salsas' },
] as const

type TabKey = (typeof TABS)[number]['key']

export function MenuManagementPage() {
  const [tab, setTab] = useState<TabKey>('productos')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Gestión de menú</h1>
        <p className="text-sm text-ink-400">
          Administra productos, categorías y las opciones de personalización de pizzas.
        </p>
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition',
              tab === t.key ? 'bg-brand-500 text-white shadow-card' : 'bg-white text-ink-600'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'productos' && <ProductsTab />}
      {tab === 'categorias' && <CategoriesTab />}
      {tab === 'toppings' && <ToppingsTab />}
      {tab === 'masas' && (
        <SimpleOptionsManager table="crusts" title="Masas" itemLabel="Masa" />
      )}
      {tab === 'salsas' && (
        <SimpleOptionsManager table="sauces" title="Salsas" itemLabel="Salsa" />
      )}
    </div>
  )
}
