# Centro Hogar — Panel de Gestión

Panel de administración para una mueblería. Permite gestionar clientes, productos, ventas, usuarios y reportes desde una interfaz web.

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite + TypeScript |
| UI | shadcn/ui (nova preset) + Tailwind CSS v4 |
| Routing | React Router v7 |
| Estado servidor | TanStack Query v5 |
| Formularios | React Hook Form + Zod |
| Backend | InsForge (PostgreSQL + Auth + Storage) |
| PDF | @react-pdf/renderer |
| Deploy | Vercel |

## Funcionalidades

- **Dashboard** — métricas del día, alertas de stock bajo, últimas ventas
- **Clientes** — CRUD, historial de compras por cliente
- **Productos** — CRUD con categorías, control de stock, imágenes
- **Ventas** — wizard de nueva venta (cliente → carrito → pago → confirmar), listado con filtros, descarga de ticket PDF
- **Reportes** — KPIs del período, desglose por método de pago, exportación a PDF
- **Usuarios** — alta/edición de usuarios con cambio de email y contraseña, roles (admin / encargado_stock / vendedor)
- **Ajustes** — gestión de categorías de productos

## Permisos por rol

| Sección | admin | encargado_stock | vendedor |
|---------|-------|----------------|---------|
| Dashboard | ✓ | ✓ | ✓ |
| Clientes | lectura + escritura | lectura | lectura |
| Productos | lectura + escritura | lectura + escritura | lectura |
| Ventas | todas | todas | solo propias |
| Reportes | ✓ | ✓ | — |
| Usuarios | ✓ | — | — |
| Ajustes | ✓ | ✓ | — |


## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `VITE_INSFORGE_URL` | URL base del backend InsForge |
| `VITE_INSFORGE_ANON_KEY` | Clave anónima (pública, segura para el browser — respeta RLS) |

## Estructura del proyecto

```
src/
├── app/
│   ├── App.tsx               # Raíz de la aplicación
│   ├── Router.tsx            # Definición de rutas
│   └── providers/            # AuthProvider, QueryProvider
├── components/
│   ├── common/               # PageHeader, DataTable, ConfirmDialog, etc.
│   ├── layout/               # AppLayout, Sidebar, Header
│   └── ui/                   # Componentes shadcn/ui
├── features/
│   ├── auth/                 # authService, LoginForm
│   ├── clientes/             # clientesService
│   ├── productos/            # productosService
│   ├── ventas/               # ventasService, SaleWizard, PDF ticket
│   ├── reportes/             # PDF reportes
│   └── usuarios/             # UsuarioDialog
├── hooks/                    # usePermissions, useDebounce
├── lib/                      # insforge.ts, utils.ts, validaciones Zod
├── pages/                    # Una página por ruta
└── types/                    # app.types.ts
```
