import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { CartProvider } from './contexts/CartContext'
import { CustomerLayout } from './pages/customer/CustomerLayout'
import { MenuPage } from './pages/customer/MenuPage'
import { CheckoutPage } from './pages/customer/CheckoutPage'
import { OrderStatusPage } from './pages/customer/OrderStatusPage'
import { RequireAuth } from './pages/admin/RequireAuth'

// El panel administrativo se carga bajo demanda: los clientes que solo ordenan
// pizza nunca descargan este código.
const AdminLayout = lazy(() =>
  import('./pages/admin/AdminLayout').then((m) => ({ default: m.AdminLayout }))
)
const LoginPage = lazy(() => import('./pages/admin/LoginPage').then((m) => ({ default: m.LoginPage })))
const DashboardPage = lazy(() =>
  import('./pages/admin/DashboardPage').then((m) => ({ default: m.DashboardPage }))
)
const InventoryPage = lazy(() =>
  import('./pages/admin/InventoryPage').then((m) => ({ default: m.InventoryPage }))
)
const MenuManagementPage = lazy(() =>
  import('./pages/admin/MenuManagementPage').then((m) => ({ default: m.MenuManagementPage }))
)
const OrdersPage = lazy(() => import('./pages/admin/OrdersPage').then((m) => ({ default: m.OrdersPage })))
const ReportsPage = lazy(() =>
  import('./pages/admin/ReportsPage').then((m) => ({ default: m.ReportsPage }))
)

function AdminFallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-900">
      <p className="text-sm font-semibold text-white/70">Cargando panel…</p>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
            {/* App de pedidos para clientes */}
            <Route element={<CustomerLayout />}>
              <Route path="/" element={<MenuPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/pedido/:orderId" element={<OrderStatusPage />} />
            </Route>

            {/* Panel administrativo (dark kitchen) */}
            <Route
              path="/admin/login"
              element={
                <Suspense fallback={<AdminFallback />}>
                  <LoginPage />
                </Suspense>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireAuth>
                  <Suspense fallback={<AdminFallback />}>
                    <AdminLayout />
                  </Suspense>
                </RequireAuth>
              }
            >
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="inventario" element={<InventoryPage />} />
              <Route path="menu" element={<MenuManagementPage />} />
              <Route path="pedidos" element={<OrdersPage />} />
              <Route path="reportes" element={<ReportsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  )
}
