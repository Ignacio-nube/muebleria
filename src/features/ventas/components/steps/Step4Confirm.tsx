import { CheckCircle, Download, RotateCcw, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { TicketPDF } from '@/features/reportes/pdf/TicketPDF'
import { PDFDownloadLink } from '@react-pdf/renderer'
import type { SaleWizardState, Venta } from '@/types/app.types'

interface Step4Props {
  state: SaleWizardState
  computed: { subtotal: number; base: number; interesMonto: number; totalFinal: number; cuotaMonto: number }
  completedVenta: Venta | null
  isLoading: boolean
  onConfirm: () => void
  onBack: () => void
  onNewSale: () => void
  onGoToVentas: () => void
}

const METODO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
}

const TARJETA_LABEL: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  naranja: 'Naranja X',
  debito: 'Débito',
}

export function Step4Confirm({
  state,
  computed,
  completedVenta,
  isLoading,
  onConfirm,
  onBack,
  onNewSale,
  onGoToVentas,
}: Step4Props) {
  if (completedVenta) {
    return (
      <div className="flex flex-col items-center gap-6 max-w-md mx-auto text-center py-8">
        <div className="flex flex-col items-center gap-3">
          <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle className="size-8 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold">¡Venta registrada!</h3>
            <p className="text-muted-foreground text-sm">
              Venta #{completedVenta.numero_venta} · {formatDateTime(completedVenta.created_at)}
            </p>
          </div>
        </div>

        <div className="w-full rounded-lg border p-4 text-left">
          <div className="flex items-center justify-between font-bold text-lg">
            <span>Total cobrado</span>
            <span>{formatCurrency(completedVenta.total_final)}</span>
          </div>
          {completedVenta.cuotas > 1 && (
            <p className="text-sm text-muted-foreground mt-1">
              {completedVenta.cuotas} cuotas de {formatCurrency(completedVenta.total_final / completedVenta.cuotas)}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 w-full">
          <PDFDownloadLink
            document={<TicketPDF venta={completedVenta} items={state.items} />}
            fileName={`ticket-${completedVenta.numero_venta}.pdf`}
          >
            {({ loading }) => (
              <Button variant="outline" className="w-full" disabled={loading}>
                <Download data-icon="inline-start" />
                {loading ? 'Generando...' : 'Descargar ticket'}
              </Button>
            )}
          </PDFDownloadLink>
          <Button className="w-full" onClick={onNewSale}>
            <RotateCcw data-icon="inline-start" />
            Nueva venta
          </Button>
          <Button variant="ghost" className="w-full" onClick={onGoToVentas}>
            <List data-icon="inline-start" />
            Ver todas las ventas
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div>
        <h3 className="text-lg font-semibold">Confirmar venta</h3>
        <p className="text-sm text-muted-foreground">Revisá los datos antes de confirmar.</p>
      </div>

      {/* Cliente */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          {state.cliente ? (
            <p className="font-medium">{state.cliente.nombre} {state.cliente.apellido}</p>
          ) : (
            <p className="text-muted-foreground text-sm">Venta sin cliente</p>
          )}
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Productos ({state.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1.5">
          {state.items.map((item) => (
            <div key={item.producto.id} className="flex items-center justify-between text-sm">
              <span className="truncate">
                {item.producto.nombre}
                <span className="text-muted-foreground ml-2">× {item.cantidad}</span>
              </span>
              <span className="font-medium shrink-0 ml-2">{formatCurrency(item.subtotal)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Pago */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Pago</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Método</span>
            <div className="flex items-center gap-2">
              <span>{METODO_LABEL[state.metodo_pago]}</span>
              {state.tarjeta_tipo && (
                <Badge variant="outline">{TARJETA_LABEL[state.tarjeta_tipo]}</Badge>
              )}
            </div>
          </div>
          {state.cuotas > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Cuotas</span>
              <span>{state.cuotas}x de {formatCurrency(computed.cuotaMonto)}</span>
            </div>
          )}
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(computed.subtotal)}</span>
          </div>
          {state.descuento > 0 && (
            <div className="flex items-center justify-between text-sm text-destructive">
              <span>Descuento</span>
              <span>- {formatCurrency(state.descuento)}</span>
            </div>
          )}
          {state.interes_porcentaje > 0 && (
            <div className="flex items-center justify-between text-sm text-amber-600">
              <span>Interés ({state.interes_porcentaje}%)</span>
              <span>+ {formatCurrency(computed.interesMonto)}</span>
            </div>
          )}
          <Separator />
          <div className="flex items-center justify-between font-bold text-base">
            <span>Total</span>
            <span>{formatCurrency(computed.totalFinal)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack} disabled={isLoading}>
          Atrás
        </Button>
        <Button className="flex-1" onClick={onConfirm} disabled={isLoading}>
          {isLoading ? 'Registrando...' : 'Confirmar venta'}
        </Button>
      </div>
    </div>
  )
}
