import { NavLink, useLocation } from 'react-router-dom'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  BarChart3,
  UserCog,
  Settings,
  LogOut,
} from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import { usePermissions } from '@/hooks/usePermissions'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard' },
  { to: '/clientes', label: 'Clientes', icon: Users, permission: 'clientes' },
  { to: '/productos', label: 'Productos', icon: Package, permission: 'productos' },
  { to: '/ventas', label: 'Ventas', icon: ShoppingCart, permission: 'ventas' },
  { to: '/reportes', label: 'Reportes', icon: BarChart3, permission: 'reportes' },
  { to: '/usuarios', label: 'Usuarios', icon: UserCog, permission: 'usuarios' },
  { to: '/ajustes', label: 'Ajustes', icon: Settings, permission: 'ajustes' },
]

const ROL_LABEL: Record<string, string> = {
  admin: 'Administrador',
  encargado_stock: 'Enc. de Stock',
  vendedor: 'Vendedor',
}

export function AppSidebar() {
  const { profile, signOut } = useAuth()
  const { canAccess } = usePermissions()
  const location = useLocation()

  const initials = profile
    ? `${profile.nombre[0]}${profile.apellido[0]}`.toUpperCase()
    : 'CH'

  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-3 px-2 py-3">
          <img src="/logo.svg" alt="Centro Hogar" className="size-8 shrink-0" />
          <div className="flex flex-col leading-tight">
            <span className="font-semibold text-sm">Centro Hogar</span>
            <span className="text-xs text-muted-foreground">Panel de gestión</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarMenu>
            {NAV_ITEMS.filter((item) => canAccess(item.permission)).map((item) => {
              const isActive = location.pathname.startsWith(item.to)
              return (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    isActive={isActive}
                    render={<NavLink to={item.to} />}
                  >
                    <item.icon className={cn('size-4', isActive && 'text-primary')} />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <div className="flex items-center gap-3 p-2">
          <Avatar className="size-8">
            <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-1 min-w-0 leading-tight">
            <span className="text-sm font-medium truncate">
              {profile ? `${profile.nombre} ${profile.apellido}` : 'Usuario'}
            </span>
            <span className="text-xs text-muted-foreground">
              {profile ? ROL_LABEL[profile.rol] : ''}
            </span>
          </div>
          <button
            onClick={() => signOut()}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
