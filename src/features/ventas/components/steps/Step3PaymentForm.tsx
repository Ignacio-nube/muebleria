import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreditCard, Banknote, ArrowLeftRight, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { cn, formatCurrency } from '@/lib/utils'
import { ventaSchema, type VentaFormValues } from '@/lib/validations/venta.schema'
import type { SaleWizardState } from '@/types/app.types'

interface Step3Props {
  state: SaleWizardState
  computed: { subtotal: number; base: number; interesMonto: number; totalFinal: number; cuotaMonto: number }
  onSetPayment: (p: Partial<SaleWizardState>) => void
  onBack: () => void
  onNext: () => void
}

const METODOS = [
  { value: 'efectivo', label: 'Efectivo', icon: Banknote },
  { value: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
  { value: 'transferencia', label: 'Transferencia', icon: ArrowLeftRight },
] as const

const TARJETAS = [
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'naranja', label: 'Naranja X' },
  { value: 'debito', label: 'Débito' },
] as const

const CUOTAS_OPTS = [1, 3, 6, 12, 18, 24]

export function Step3PaymentForm({ state, computed, onSetPayment, onBack, onNext }: Step3Props) {
  const form = useForm<VentaFormValues>({
    resolver: zodResolver(ventaSchema) as Resolver<VentaFormValues>,
    defaultValues: {
      metodo_pago: state.metodo_pago,
      tarjeta_tipo: state.tarjeta_tipo,
      cuotas: state.cuotas,
      interes_porcentaje: state.interes_porcentaje,
      descuento: state.descuento,
      notas: state.notas,
    },
  })

  const metodo = form.watch('metodo_pago')
  const cuotas = form.watch('cuotas') ?? 1
  const interesP = form.watch('interes_porcentaje') ?? 0
  const descuento = form.watch('descuento') ?? 0
  const tarjeta = form.watch('tarjeta_tipo')

  const base = computed.subtotal - descuento
  const interesMonto = base * (interesP / 100)
  const totalFinal = base + interesMonto
  const cuotaMonto = cuotas > 1 ? totalFinal / cuotas : totalFinal

  function handleSubmit(values: VentaFormValues) {
    onSetPayment({
      metodo_pago: values.metodo_pago,
      tarjeta_tipo: values.tarjeta_tipo ?? null,
      cuotas: values.cuotas ?? 1,
      interes_porcentaje: values.interes_porcentaje ?? 0,
      descuento: values.descuento ?? 0,
      notas: values.notas ?? '',
    })
    onNext()
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <form
        onSubmit={form.handleSubmit((values: VentaFormValues) => handleSubmit(values))}
        className="flex flex-col gap-5 flex-1 max-w-md"
      >
        {/* Método de pago */}
        <div className="flex flex-col gap-2">
          <Label>Método de pago</Label>
          <div className="grid grid-cols-3 gap-2">
            {METODOS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => {
                  form.setValue('metodo_pago', m.value)
                  if (m.value !== 'tarjeta') {
                    form.setValue('tarjeta_tipo', null)
                    form.setValue('cuotas', 1)
                    form.setValue('interes_porcentaje', 0)
                  }
                }}
                className={cn(
                  'flex flex-col items-center gap-1 p-3 rounded-md border-2 text-sm font-medium transition-all',
                  metodo === m.value
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <m.icon className="size-5" />
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tarjeta options */}
        {metodo === 'tarjeta' && (
          <>
            <div className="flex flex-col gap-2">
              <Label>Tipo de tarjeta</Label>
              <div className="grid grid-cols-2 gap-2">
                {TARJETAS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => {
                      form.setValue('tarjeta_tipo', t.value)
                      if (t.value === 'debito') {
                        form.setValue('cuotas', 1)
                        form.setValue('interes_porcentaje', 0)
                      }
                    }}
                    className={cn(
                      'p-2.5 rounded-md border-2 text-sm font-medium transition-all text-center',
                      tarjeta === t.value
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {form.formState.errors.tarjeta_tipo && (
                <p className="text-xs text-destructive">{form.formState.errors.tarjeta_tipo.message}</p>
              )}
            </div>

            {tarjeta !== 'debito' && (
              <div className="flex flex-col gap-2">
                <Label>Cuotas</Label>
                <div className="flex flex-wrap gap-2">
                  {CUOTAS_OPTS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => form.setValue('cuotas', c)}
                      className={cn(
                        'px-3 py-1.5 rounded-md border text-sm font-medium transition-all',
                        cuotas === c
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      {c === 1 ? 'Contado' : `${c}x`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {cuotas > 1 && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="interes">Interés % (del postnet)</Label>
                  <span title="Ingresá el % que muestra el postnet al procesar la tarjeta">
                    <Info className="size-3.5 text-muted-foreground" />
                  </span>
                </div>
                <Input
                  id="interes"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="0.00"
                  {...form.register('interes_porcentaje')}
                />
                <p className="text-xs text-muted-foreground">
                  Solo para registrar el costo financiero. El cobro lo realiza el postnet.
                </p>
              </div>
            )}
          </>
        )}

        {/* Descuento */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="descuento">Descuento ($)</Label>
          <Input
            id="descuento"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            {...form.register('descuento')}
          />
        </div>

        {/* Notas */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="notas">Notas (opcional)</Label>
          <Input id="notas" placeholder="Observaciones de la venta..." {...form.register('notas')} />
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
            Atrás
          </Button>
          <Button type="submit" className="flex-1">
            Revisar venta
          </Button>
        </div>
      </form>

      {/* Resumen en tiempo real */}
      <div className="w-full lg:w-64 shrink-0">
        <div className="rounded-lg border p-4 flex flex-col gap-2 sticky top-4">
          <h4 className="font-semibold text-sm mb-1">Resumen</h4>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(computed.subtotal)}</span>
          </div>
          {descuento > 0 && (
            <div className="flex items-center justify-between text-sm text-destructive">
              <span>Descuento</span>
              <span>- {formatCurrency(descuento)}</span>
            </div>
          )}
          {interesP > 0 && (
            <div className="flex items-center justify-between text-sm text-amber-600">
              <span>Interés ({interesP}%)</span>
              <span>+ {formatCurrency(interesMonto)}</span>
            </div>
          )}
          <Separator />
          <div className="flex items-center justify-between font-bold">
            <span>Total</span>
            <span className="text-lg">{formatCurrency(totalFinal)}</span>
          </div>
          {cuotas > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{cuotas} cuotas de</span>
              <span>{formatCurrency(cuotaMonto)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
