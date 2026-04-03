import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Download } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable, type Column } from '@/components/common/DataTable'
import { TicketPDF } from '@/features/reportes/pdf/TicketPDF'
import { ventasService } from '@/features/ventas/services/ventasService'
import { authService } from '@/features/auth/services/authService'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { usePermissions } from '@/hooks/usePermissions'
import type { Venta, CartItem } from '@/types/app.types'

const ESTADO_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  completada: 'default',
  pendiente: 'secondary',
  cancelada: 'destructive',
}

const METODO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transf.',
}

function ventaItemsToCartItems(venta: Venta): CartItem[] {
  return (venta.items ?? []).map((item) => ({
    producto: item.producto ?? { id: item.producto_id, codigo: '', nombre: 'Producto', precio_venta: item.precio_unitario, descripcion: null, categoria_id: null, categoria: undefined, precio_costo: 0, stock_actual: 0, stock_minimo: 0, imagen_url: null, activo: true, created_at: '', updated_at: '' },
    cantidad: item.cantidad,
    precio_unitario: item.precio_unitario,
    subtotal: item.subtotal,
  }))
}

export default function VentasPage() {
  const { can } = usePermissions()
  const navigate = useNavigate()
  const canWrite = can('ventas.write')
  const [page, setPage] = useState(1)
  const [estado, setEstado] = useState('')
  const [metodoPago, setMetodoPago] = useState('')
  const [vendedorId, setVendedorId] = useState('')
  const PAGE_SIZE = 20

  const { data, isLoading } = useQuery({
    queryKey: ['ventas', page, estado, metodoPago, vendedorId],
    queryFn: () => ventasService.list({
      page,
      pageSize: PAGE_SIZE,
      estado: estado || undefined,
      metodoPago: metodoPago || undefined,
      vendedorId: vendedorId || undefined,
    }),
  })

  const { data: usuarios } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => authService.listUsers(),
  })

  // For PDF download we need items. We fetch them lazily via getById, but
  // to keep the list fast we only show a download button for ventas that have items loaded.
  // We use a separate query per-venta approach via a DownloadCell wrapper.
  const columns: Column<Venta>[] = [
    {
      key: 'numero',
      header: '#',
      className: 'w-20',
      cell: (v) => <span className="font-mono text-muted-foreground">#{v.numero_venta}</span>,
    },
    {
      key: 'fecha',
      header: 'Fecha',
      cell: (v) => <span className="text-sm">{formatDateTime(v.created_at)}</span>,
    },
    {
      key: 'cliente',
      header: 'Cliente',
      cell: (v) =>
        v.cliente ? (
          <span className="font-medium">{v.cliente.nombre} {v.cliente.apellido}</span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    {
      key: 'vendedor',
      header: 'Vendedor',
      cell: (v) =>
        v.vendedor ? (
          <span className="text-sm">{v.vendedor.nombre} {v.vendedor.apellido}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'metodo',
      header: 'Pago',
      cell: (v) => (
        <span className="text-sm">{METODO_LABEL[v.metodo_pago]}</span>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      className: 'text-right font-semibold',
      cell: (v) => formatCurrency(v.total_final),
    },
    {
      key: 'estado',
      header: 'Estado',
      cell: (v) => (
        <Badge variant={ESTADO_VARIANT[v.estado] ?? 'outline'}>
          {v.estado.charAt(0).toUpperCase() + v.estado.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'ticket',
      header: '',
      className: 'w-12',
      cell: (v) => <TicketDownloadButton venta={v} />,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ventas"
        description={`${data?.count ?? 0} ventas registradas`}
        action={
          canWrite ? (
            <Button render={<Link to="/ventas/nueva" />} nativeButton={false}>
              <Plus data-icon="inline-start" />
              Nueva venta
            </Button>
          ) : undefined
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select
          value={estado || 'all'}
          onValueChange={(v) => { setEstado((v as string) === 'all' ? '' : (v as string)); setPage(1) }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="completada">Completada</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={metodoPago || 'all'}
          onValueChange={(v) => { setMetodoPago((v as string) === 'all' ? '' : (v as string)); setPage(1) }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Método de pago" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los métodos</SelectItem>
            <SelectItem value="efectivo">Efectivo</SelectItem>
            <SelectItem value="tarjeta">Tarjeta</SelectItem>
            <SelectItem value="transferencia">Transferencia</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={vendedorId || 'all'}
          onValueChange={(v) => { setVendedorId((v as string) === 'all' ? '' : (v as string)); setPage(1) }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Vendedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los vendedores</SelectItem>
            {(usuarios ?? []).map((u) => (
              <SelectItem key={u.id} value={u.id}>{u.nombre} {u.apellido}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        rowKey={(v) => v.id}
        emptyMessage="No hay ventas registradas."
        onRowClick={(v) => navigate(`/ventas/${v.id}`)}
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
    </div>
  )
}

// Lazy ticket download button — fetches full venta with items on first click
function TicketDownloadButton({ venta }: { venta: Venta }) {
  const [ready, setReady] = useState(false)
  const [ventaFull, setVentaFull] = useState<Venta | null>(null)

  async function loadAndDownload(e: React.MouseEvent) {
    e.stopPropagation()
    if (ventaFull) return // already loaded, PDFDownloadLink will handle it
    const full = await ventasService.getById(venta.id)
    setVentaFull(full)
    setReady(true)
  }

  if (ready && ventaFull) {
    const items = ventaItemsToCartItems(ventaFull)
    return (
      <PDFDownloadLink
        document={<TicketPDF venta={ventaFull} items={items} />}
        fileName={`ticket-${ventaFull.numero_venta}.pdf`}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {({ loading }) => (
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            title="Descargar ticket"
            onClick={(e) => e.stopPropagation()}
          >
            <Download className={`size-3.5 ${loading ? 'opacity-50' : ''}`} />
          </Button>
        )}
      </PDFDownloadLink>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8"
      title="Descargar ticket"
      onClick={loadAndDownload}
    >
      <Download className="size-3.5" />
    </Button>
  )
}
