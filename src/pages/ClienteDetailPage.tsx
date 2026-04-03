import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pencil, User, Phone, Mail, MapPin, CreditCard, ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { DataTable, type Column } from '@/components/common/DataTable'
import { ClienteDialog } from '@/features/clientes/components/ClienteDialog'
import { clientesService } from '@/features/clientes/services/clientesService'
import { usePermissions } from '@/hooks/usePermissions'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { useState } from 'react'
import type { Venta } from '@/types/app.types'

const ESTADO_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  completada: 'default',
  pendiente: 'secondary',
  cancelada: 'destructive',
}

const METODO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
}

export default function ClienteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { can } = usePermissions()
  const canWrite = can('clientes.write')
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data: cliente, isLoading } = useQuery({
    queryKey: ['cliente', id],
    queryFn: () => clientesService.getById(id!),
    enabled: !!id,
  })

  const { data: historial, isLoading: loadingHistorial } = useQuery({
    queryKey: ['cliente-historial', id],
    queryFn: () => clientesService.getHistorial(id!),
    enabled: !!id,
  })

  const toggleActivoMutation = useMutation({
    mutationFn: ({ activo }: { activo: boolean }) =>
      clientesService.toggleActivo(id!, activo),
    onSuccess: (updated) => {
      toast.success(updated.activo ? 'Cliente activado' : 'Cliente desactivado')
      qc.invalidateQueries({ queryKey: ['cliente', id] })
      qc.invalidateQueries({ queryKey: ['clientes'] })
    },
    onError: () => toast.error('No se pudo actualizar el estado'),
  })

  const ventasCompletadas = (historial ?? []).filter((v) => v.estado === 'completada')
  const totalCompras = ventasCompletadas.reduce((acc, v) => acc + v.total_final, 0)
  const ticketPromedio = ventasCompletadas.length > 0 ? totalCompras / ventasCompletadas.length : 0

  const columns: Column<Venta>[] = [
    {
      key: 'numero_venta',
      header: '#',
      className: 'w-20',
      cell: (v) => (
        <span className="font-mono text-muted-foreground">
          #{String(v.numero_venta).padStart(4, '0')}
        </span>
      ),
    },
    {
      key: 'fecha',
      header: 'Fecha',
      cell: (v) => <span className="text-sm">{formatDateTime(v.created_at)}</span>,
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
      cell: (v) => <span className="text-sm">{METODO_LABEL[v.metodo_pago]}</span>,
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
  ]

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded" />
          <Skeleton className="h-7 w-48" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!cliente) {
    return (
      <div className="flex flex-col gap-4 items-center justify-center py-16">
        <p className="text-muted-foreground">Cliente no encontrado.</p>
        <Button variant="outline" onClick={() => navigate('/clientes')}>
          <ArrowLeft data-icon="inline-start" />
          Volver a Clientes
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => navigate('/clientes')}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">
              {cliente.apellido}, {cliente.nombre}
            </h1>
            <button
              className="cursor-pointer"
              title={cliente.activo ? 'Clic para desactivar' : 'Clic para activar'}
              onClick={() => {
                if (canWrite) toggleActivoMutation.mutate({ activo: !cliente.activo })
              }}
            >
              <Badge
                variant={cliente.activo ? 'default' : 'secondary'}
                className={canWrite ? 'hover:opacity-80 transition-opacity' : ''}
              >
                {cliente.activo ? 'Activo' : 'Inactivo'}
              </Badge>
            </button>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Cliente desde {formatDate(cliente.created_at)}
          </p>
        </div>
        {canWrite && (
          <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
            <Pencil data-icon="inline-start" className="size-3.5" />
            Editar
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Compras realizadas</CardTitle>
            <ShoppingBag className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ventasCompletadas.length}</div>
            <p className="text-xs text-muted-foreground mt-1">ventas completadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total comprado</CardTitle>
            <CreditCard className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCompras)}</div>
            <p className="text-xs text-muted-foreground mt-1">acumulado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ticket promedio</CardTitle>
            <ShoppingBag className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(ticketPromedio)}</div>
            <p className="text-xs text-muted-foreground mt-1">por compra</p>
          </CardContent>
        </Card>
      </div>

      {/* Info card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="size-4" />
            Información de contacto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {cliente.dni && (
              <div className="flex items-start gap-2">
                <CreditCard className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">DNI</p>
                  <p className="font-medium">{cliente.dni}</p>
                </div>
              </div>
            )}
            {cliente.telefono && (
              <div className="flex items-start gap-2">
                <Phone className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Teléfono</p>
                  <p className="font-medium">{cliente.telefono}</p>
                </div>
              </div>
            )}
            {cliente.email && (
              <div className="flex items-start gap-2">
                <Mail className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium">{cliente.email}</p>
                </div>
              </div>
            )}
            {cliente.direccion && (
              <div className="flex items-start gap-2">
                <MapPin className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Dirección</p>
                  <p className="font-medium">{cliente.direccion}</p>
                </div>
              </div>
            )}
            {!cliente.dni && !cliente.telefono && !cliente.email && !cliente.direccion && (
              <p className="text-sm text-muted-foreground col-span-2">
                No hay datos de contacto registrados.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Historial */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Historial de compras</h2>
        <DataTable
          columns={columns}
          data={historial ?? []}
          isLoading={loadingHistorial}
          rowKey={(v) => v.id}
          emptyMessage="Este cliente no tiene compras registradas."
          onRowClick={(v) => navigate(`/ventas/${v.id}`)}
        />
      </div>

      <ClienteDialog
        open={dialogOpen}
        onOpenChange={(v) => setDialogOpen(v)}
        cliente={cliente}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['cliente', id] })
          qc.invalidateQueries({ queryKey: ['clientes'] })
          setDialogOpen(false)
        }}
      />
    </div>
  )
}
