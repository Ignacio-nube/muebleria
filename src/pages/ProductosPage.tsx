import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable, type Column } from '@/components/common/DataTable'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { ProductoDialog } from '@/features/productos/components/ProductoDialog'
import { productosService } from '@/features/productos/services/productosService'
import { usePermissions } from '@/hooks/usePermissions'
import { formatCurrency } from '@/lib/utils'
import type { Producto } from '@/types/app.types'

export default function ProductosPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { can } = usePermissions()
  const canWrite = can('productos.write')

  const [search, setSearch] = useState('')
  const [categoriaId, setCategoriaId] = useState<string>('')
  const [activoFilter, setActivoFilter] = useState<string>('all')
  const [stockFilter, setStockFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const PAGE_SIZE = 15

  const soloActivoParam =
    activoFilter === 'activo' ? true : activoFilter === 'inactivo' ? false : null

  const { data, isLoading } = useQuery({
    queryKey: ['productos', search, categoriaId, activoFilter, stockFilter, page],
    queryFn: () =>
      productosService.list({
        search,
        categoriaId: categoriaId || undefined,
        soloActivos: false,
        soloActivo: soloActivoParam,
        bajoStock: stockFilter === 'bajo',
        page,
        pageSize: PAGE_SIZE,
      }),
  })

  const { data: categorias } = useQuery({
    queryKey: ['categorias'],
    queryFn: () => productosService.listCategorias(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productosService.delete(id),
    onSuccess: () => {
      toast.success('Producto eliminado')
      qc.invalidateQueries({ queryKey: ['productos'] })
      setDeleteId(null)
    },
    onError: () => toast.error('No se pudo eliminar el producto'),
  })

  const toggleActivoMutation = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      productosService.toggleActivo(id, activo),
    onSuccess: (updated) => {
      toast.success(updated.activo ? 'Producto activado' : 'Producto desactivado')
      qc.invalidateQueries({ queryKey: ['productos'] })
    },
    onError: () => toast.error('No se pudo actualizar el estado'),
  })

  const columns: Column<Producto>[] = [
    {
      key: 'codigo',
      header: 'Código',
      className: 'w-28',
      cell: (p) => (
        <span className="font-mono text-sm text-muted-foreground">{p.codigo}</span>
      ),
    },
    {
      key: 'nombre',
      header: 'Producto',
      cell: (p) => (
        <div className="flex flex-col">
          <span className="font-medium">{p.nombre}</span>
          {p.categoria && (
            <span className="text-xs text-muted-foreground">{p.categoria.nombre}</span>
          )}
        </div>
      ),
    },
    {
      key: 'precio_venta',
      header: 'Precio venta',
      className: 'text-right',
      cell: (p) => (
        <span className="font-semibold">{formatCurrency(p.precio_venta)}</span>
      ),
    },
    {
      key: 'precio_costo',
      header: 'Costo',
      className: 'text-right',
      cell: (p) => (
        <span className="text-muted-foreground">{formatCurrency(p.precio_costo)}</span>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      className: 'text-center w-24',
      cell: (p) => (
        <Badge
          variant={p.stock_actual <= p.stock_minimo ? 'destructive' : p.stock_actual <= p.stock_minimo * 1.5 ? 'secondary' : 'outline'}
        >
          {p.stock_actual}
        </Badge>
      ),
    },
    {
      key: 'activo',
      header: 'Estado',
      className: 'w-24',
      cell: (p) => (
        <button
          className="cursor-pointer"
          title={p.activo ? 'Clic para desactivar' : 'Clic para activar'}
          onClick={(e) => {
            e.stopPropagation()
            if (canWrite) toggleActivoMutation.mutate({ id: p.id, activo: !p.activo })
          }}
        >
          <Badge
            variant={p.activo ? 'default' : 'secondary'}
            className={canWrite ? 'hover:opacity-80 transition-opacity' : ''}
          >
            {p.activo ? 'Activo' : 'Inactivo'}
          </Badge>
        </button>
      ),
    },
    ...(canWrite
      ? [{
          key: 'actions',
          header: '',
          className: 'w-20',
          cell: (p: Producto) => (
            <div className="flex items-center gap-1 justify-end">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={(e) => { e.stopPropagation(); setEditingProducto(p); setDialogOpen(true) }}
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-destructive hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); setDeleteId(p.id) }}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ),
        }]
      : []),
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Productos"
        description={`${data?.count ?? 0} productos en el catálogo`}
        action={
          canWrite ? (
            <Button onClick={() => { setEditingProducto(null); setDialogOpen(true) }}>
              <Plus data-icon="inline-start" />
              Nuevo producto
            </Button>
          ) : undefined
        }
      />

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o código..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <Select
          value={categoriaId || 'all'}
          onValueChange={(v) => { setCategoriaId((v as string) === 'all' ? '' : (v as string)); setPage(1) }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {(categorias ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={activoFilter}
          onValueChange={(v) => { setActivoFilter(v as string); setPage(1) }}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="activo">Activos</SelectItem>
            <SelectItem value="inactivo">Inactivos</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={stockFilter}
          onValueChange={(v) => { setStockFilter(v as string); setPage(1) }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Stock" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo el stock</SelectItem>
            <SelectItem value="bajo">Bajo stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        rowKey={(p) => p.id}
        emptyMessage="No se encontraron productos."
        onRowClick={(p) => navigate(`/productos/${p.id}`)}
      />

      {data && data.count > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Mostrando {Math.min((page - 1) * PAGE_SIZE + 1, data.count)}–
            {Math.min(page * PAGE_SIZE, data.count)} de {data.count}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page * PAGE_SIZE >= data.count}
              onClick={() => setPage(page + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      <ProductoDialog
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditingProducto(null) }}
        producto={editingProducto}
        onSuccess={() => { qc.invalidateQueries({ queryKey: ['productos'] }); setDialogOpen(false) }}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
        title="Eliminar producto"
        description="¿Estás seguro? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
