/**
 * Permission keys deben coincidir exactamente con la tabla `permissions`
 * en Supabase (ver migración rbac_schema). Esta lista es solo para
 * autocompletado/type-safety en el cliente — la verificación real ocurre
 * en el servidor vía RLS + has_permission(), nunca aquí.
 */
export const PERMISSIONS = {
  ORDERS_VIEW: 'orders.view',
  ORDERS_UPDATE_STATUS: 'orders.update_status',
  ORDERS_CANCEL: 'orders.cancel',
  ORDERS_REFUND: 'orders.refund',
  KITCHEN_VIEW: 'kitchen.view',
  PRODUCTS_VIEW: 'products.view',
  PRODUCTS_MANAGE: 'products.manage',
  MEDIA_MANAGE: 'media.manage',
  PROMOTIONS_MANAGE: 'promotions.manage',
  REWARDS_MANAGE: 'rewards.manage',
  REWARDS_REDEEM_OVERRIDE: 'rewards.redeem_override',
  CUSTOMERS_VIEW: 'customers.view',
  DRIVERS_MANAGE: 'drivers.manage',
  STAFF_MANAGE: 'staff.manage',
  SETTINGS_MANAGE: 'settings.manage',
  ANALYTICS_VIEW: 'analytics.view',
  INVENTORY_MANAGE: 'inventory.manage',
  AUDIT_VIEW: 'audit.view',
} as const

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

export type CompanyRole = 'owner' | 'admin' | 'manager' | 'kitchen' | 'cashier' | 'driver' | 'staff'

/**
 * Copia en el cliente de role_permissions, usada SOLO para decisiones de UI
 * (mostrar/ocultar un botón, deshabilitar una pestaña). Debe reflejar la
 * tabla real; si se desincroniza, lo peor que pasa es que la UI muestre un
 * botón que el servidor de todas formas va a rechazar — nunca al revés.
 */
const ROLE_PERMISSIONS: Record<CompanyRole, PermissionKey[]> = {
  owner: Object.values(PERMISSIONS),
  admin: [
    PERMISSIONS.ORDERS_VIEW, PERMISSIONS.ORDERS_UPDATE_STATUS, PERMISSIONS.ORDERS_CANCEL, PERMISSIONS.ORDERS_REFUND,
    PERMISSIONS.KITCHEN_VIEW, PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.PRODUCTS_MANAGE, PERMISSIONS.MEDIA_MANAGE,
    PERMISSIONS.PROMOTIONS_MANAGE, PERMISSIONS.REWARDS_MANAGE, PERMISSIONS.REWARDS_REDEEM_OVERRIDE,
    PERMISSIONS.CUSTOMERS_VIEW, PERMISSIONS.DRIVERS_MANAGE, PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.INVENTORY_MANAGE, PERMISSIONS.AUDIT_VIEW,
  ],
  manager: [
    PERMISSIONS.ORDERS_VIEW, PERMISSIONS.ORDERS_UPDATE_STATUS, PERMISSIONS.ORDERS_CANCEL,
    PERMISSIONS.KITCHEN_VIEW, PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.PRODUCTS_MANAGE, PERMISSIONS.MEDIA_MANAGE,
    PERMISSIONS.PROMOTIONS_MANAGE, PERMISSIONS.CUSTOMERS_VIEW, PERMISSIONS.DRIVERS_MANAGE,
    PERMISSIONS.ANALYTICS_VIEW, PERMISSIONS.INVENTORY_MANAGE, PERMISSIONS.STAFF_MANAGE,
  ],
  kitchen: [PERMISSIONS.ORDERS_VIEW, PERMISSIONS.ORDERS_UPDATE_STATUS, PERMISSIONS.KITCHEN_VIEW, PERMISSIONS.PRODUCTS_VIEW],
  cashier: [PERMISSIONS.ORDERS_VIEW, PERMISSIONS.ORDERS_UPDATE_STATUS, PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.CUSTOMERS_VIEW],
  // El conductor no ve el dashboard de ventas ni el listado general de
  // pedidos — solo sus propias entregas, en /company/driver, que se
  // muestra por rol y no por permiso (ver layout de /company).
  driver: [],
  staff: [PERMISSIONS.ORDERS_VIEW, PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.KITCHEN_VIEW],
}

export function roleHasPermission(role: CompanyRole | null | undefined, permission: PermissionKey): boolean {
  if (!role) return false
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export const NAV_ITEMS_BY_PERMISSION: { href: string; label: string; permission: PermissionKey }[] = [
  { href: '/company/dashboard', label: 'Dashboard', permission: PERMISSIONS.ORDERS_VIEW },
  { href: '/company/kitchen', label: 'Kitchen', permission: PERMISSIONS.KITCHEN_VIEW },
  { href: '/company/menu', label: 'Menu', permission: PERMISSIONS.PRODUCTS_VIEW },
  { href: '/company/customers', label: 'Customers', permission: PERMISSIONS.CUSTOMERS_VIEW },
  { href: '/company/support', label: 'Support', permission: PERMISSIONS.CUSTOMERS_VIEW },
  { href: '/company/team', label: 'Team', permission: PERMISSIONS.STAFF_MANAGE },
  { href: '/company/promotions', label: 'Promotions', permission: PERMISSIONS.PROMOTIONS_MANAGE },
  { href: '/company/rewards', label: 'Rewards', permission: PERMISSIONS.REWARDS_MANAGE },
  { href: '/company/drivers', label: 'Drivers', permission: PERMISSIONS.DRIVERS_MANAGE },
  { href: '/company/analytics', label: 'Analytics', permission: PERMISSIONS.ANALYTICS_VIEW },
  { href: '/company/settings', label: 'Settings', permission: PERMISSIONS.SETTINGS_MANAGE },
]
