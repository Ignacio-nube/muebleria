import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { AppLayout } from '@/components/layout/AppLayout'
import { Skeleton } from '@/components/ui/skeleton'

// Pages (lazy loaded)
const LoginPage = React.lazy(() => import('@/pages/LoginPage'))
const ResetPasswordPage = React.lazy(() => import('@/pages/ResetPasswordPage'))
const DashboardPage = React.lazy(() => import('@/pages/DashboardPage'))
const ClientesPage = React.lazy(() => import('@/pages/ClientesPage'))
const ClienteDetailPage = React.lazy(() => import('@/pages/ClienteDetailPage'))
const ProductosPage = React.lazy(() => import('@/pages/ProductosPage'))
const ProductoDetailPage = React.lazy(() => import('@/pages/ProductoDetailPage'))
const VentasPage = React.lazy(() => import('@/pages/VentasPage'))
const VentaDetailPage = React.lazy(() => import('@/pages/VentaDetailPage'))
const NuevaVentaPage = React.lazy(() => import('@/pages/NuevaVentaPage'))
const ReportesPage = React.lazy(() => import('@/pages/ReportesPage'))
const UsuariosPage = React.lazy(() => import('@/pages/UsuariosPage'))
const AjustesPage = React.lazy(() => import('@/pages/AjustesPage'))

function CatchAll() {
  const location = useLocation()
  // Si la URL tiene token de recovery en el hash (#access_token=...&type=recovery)
  // o en el query (?code=...), redirigir a reset-password conservando los params
  const hash = location.hash
  const search = location.search
  const isRecovery =
    (hash.includes('type=recovery')) ||
    (search.includes('code='))
  if (isRecovery) {
    return <Navigate to={`/reset-password${search}${hash}`} replace />
  }
  return <Navigate to="/dashboard" replace />
}

function PageLoader() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  )
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) return <PageLoader />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RedirectIfAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) return <PageLoader />
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export function Router() {
  return (
    <React.Suspense fallback={<PageLoader />}>
      <Routes>
          <Route
            path="/login"
            element={
              <RedirectIfAuth>
                <LoginPage />
              </RedirectIfAuth>
            }
          />

          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/clientes" element={<ClientesPage />} />
            <Route path="/clientes/:id" element={<ClienteDetailPage />} />
            <Route path="/productos" element={<ProductosPage />} />
            <Route path="/productos/:id" element={<ProductoDetailPage />} />
            <Route path="/ventas" element={<VentasPage />} />
            <Route path="/ventas/nueva" element={<NuevaVentaPage />} />
            <Route path="/ventas/:id" element={<VentaDetailPage />} />
            <Route path="/reportes" element={<ReportesPage />} />
            <Route path="/usuarios" element={<UsuariosPage />} />
            <Route path="/ajustes" element={<AjustesPage />} />
          </Route>

          <Route path="*" element={<CatchAll />} />
        </Routes>
    </React.Suspense>
  )
}
