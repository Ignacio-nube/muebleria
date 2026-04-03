import { useLocation } from 'react-router-dom'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/clientes': 'Clientes',
  '/productos': 'Productos',
  '/ventas': 'Ventas',
  '/ventas/nueva': 'Nueva Venta',
  '/reportes': 'Reportes',
  '/usuarios': 'Usuarios',
  '/ajustes': 'Ajustes',
}

export function AppHeader() {
  const { pathname } = useLocation()
  const title = PAGE_TITLES[pathname] ?? 'Centro Hogar'

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <h1 className="text-sm font-semibold">{title}</h1>
    </header>
  )
}
