import { useQuery } from '@tanstack/react-query'
import { TrendingUp, ShoppingCart, Users, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ventasService } from '@/features/ventas/services/ventasService'
import { productosService } from '@/features/productos/services/productosService'
import { clientesService } from '@/features/clientes/services/clientesService'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useAuth } from '@/app/providers/AuthProvider'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import type { ChartConfig } from '@/components/ui/chart'

const chartConfig: ChartConfig = {
  total: { label: 'Ventas', color: 'var(--color-chart-1)' },
}

function KpiCard({
  title,
  value,
  description,
  icon: Icon,
  isLoading,
}: {
  title: string
  value: string
  description?: string
  icon: React.ElementType
  isLoading?: boolean
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-32" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { profile } = useAuth()

  const { data: statsHoy, isLoading: loadingStats } = useQuery({
    queryKey: ['stats-hoy'],
    queryFn: () => ventasService.getStatsHoy(),
  })

  const { data: ventasPorDia, isLoading: loadingChart } = useQuery({
    queryKey: ['ventas-por-dia'],
    queryFn: () => ventasService.getVentasPorDia(14),
  })

  const { data: bajoStock, isLoading: loadingStock } = useQuery({
    queryKey: ['bajo-stock'],
    queryFn: () => productosService.getBajoStock(),
  })

  const { data: ultimasVentas, isLoading: loadingVentas } = useQuery({
    queryKey: ['ultimas-ventas'],
    queryFn: () => ventasService.list({ page: 1, pageSize: 5 }),
  })

  const { data: clientesData } = useQuery({
    queryKey: ['clientes-count'],
    queryFn: () => clientesService.list({ pageSize: 1 }),
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold">
          Buen día, {profile?.nombre} 👋
        </h2>
        <p className="text-sm text-muted-foreground">Resumen del día de hoy</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Ventas hoy"
          value={String(statsHoy?.totalVentas ?? 0)}
          description="transacciones completadas"
          icon={ShoppingCart}
          isLoading={loadingStats}
        />
        <KpiCard
          title="Recaudado hoy"
          value={formatCurrency(statsHoy?.montoTotal ?? 0)}
          description="monto total"
          icon={TrendingUp}
          isLoading={loadingStats}
        />
        <KpiCard
          title="Ticket promedio"
          value={formatCurrency(statsHoy?.ticketPromedio ?? 0)}
          description="por venta"
          icon={TrendingUp}
          isLoading={loadingStats}
        />
        <KpiCard
          title="Clientes"
          value={String(clientesData?.count ?? 0)}
          description="registrados en el sistema"
          icon={Users}
        />
      </div>

      {/* Chart + Bajo stock */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Ventas últimos 14 días</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingChart ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ChartContainer config={chartConfig} className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ventasPorDia ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="fecha"
                      tickFormatter={(v) => v.slice(5)}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => formatCurrency(Number(value))}
                        />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="var(--color-chart-1)"
                      fill="var(--color-chart-1)"
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Stock bajo mínimo</CardTitle>
            <AlertTriangle className="size-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {loadingStock ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : bajoStock?.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todo el stock está OK</p>
            ) : (
              <div className="flex flex-col gap-2">
                {(bajoStock ?? []).slice(0, 6).map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="truncate text-foreground">{p.nombre}</span>
                    <Badge variant="destructive" className="shrink-0 ml-2">
                      {p.stock_actual}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Últimas ventas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimas ventas</CardTitle>
          <CardDescription>Las 5 ventas más recientes</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingVentas ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {(ultimasVentas?.data ?? []).map((venta) => (
                <div
                  key={venta.id}
                  className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/50 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-muted-foreground">#{venta.numero_venta}</span>
                    <span>
                      {venta.cliente
                        ? `${venta.cliente.nombre} ${venta.cliente.apellido}`
                        : 'Cliente sin nombre'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-xs">{formatDate(venta.created_at)}</span>
                    <span className="font-semibold">{formatCurrency(venta.total_final)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
