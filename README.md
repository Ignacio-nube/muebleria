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

## Configuración local

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/centro-hogar.git
cd centro-hogar
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` con los valores de tu proyecto InsForge:

```env
VITE_INSFORGE_URL=https://yourproject.region.insforge.app
VITE_INSFORGE_ANON_KEY=your-anon-key
```

### 4. Correr en desarrollo

```bash
npm run dev
```

### 5. Build de producción

```bash
npm run build
```

## Deploy en Vercel

### Opción A — desde la UI de Vercel

1. Importar el repositorio desde GitHub en [vercel.com/new](https://vercel.com/new)
2. Vercel detecta automáticamente que es un proyecto Vite
3. En **Environment Variables**, agregar:
   - `VITE_INSFORGE_URL`
   - `VITE_INSFORGE_ANON_KEY`
4. Hacer clic en **Deploy**

> El archivo `vercel.json` ya está configurado para que todas las rutas del SPA sean manejadas por `index.html`.

### Opción B — desde la CLI

```bash
npm install -g vercel
vercel --prod
```

Seguir el asistente e ingresar las variables de entorno cuando se solicite.

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
