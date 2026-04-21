import { supabase } from '@/lib/supabase'
import type { Venta, VentaItem, CartItem } from '@/types/app.types'
import type { VentaFormValues } from '@/lib/validations/venta.schema'
import { calcularTotalConInteres } from '@/lib/utils'

interface CreateVentaInput extends VentaFormValues {
  vendedor_id: string
  items: CartItem[]
}

export const ventasService = {
  async list(params?: {
    vendedorId?: string
    estado?: string
    metodoPago?: string
    fechaDesde?: string
    fechaHasta?: string
    page?: number
    pageSize?: number
  }): Promise<{ data: Venta[]; count: number }> {
    const { vendedorId, estado, metodoPago, fechaDesde, fechaHasta, page = 1, pageSize = 20 } = params ?? {}
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('ventas')
      .select('*, cliente:clientes(id, nombre, apellido), vendedor:profiles(id, nombre, apellido)', {
        count: 'exact',
      })
      .range(from, to)
      .order('created_at', { ascending: false })

    if (vendedorId) query = query.eq('vendedor_id', vendedorId)
    if (estado) query = query.eq('estado', estado)
    if (metodoPago) query = query.eq('metodo_pago', metodoPago)
    if (fechaDesde) query = query.gte('created_at', fechaDesde)
    if (fechaHasta) query = query.lte('created_at', fechaHasta)

    const { data, error, count } = await query
    if (error) throw new Error(error.message)
    return { data: (data ?? []) as Venta[], count: count ?? 0 }
  },

  async getById(id: string): Promise<Venta> {
    const { data, error } = await supabase
      .from('ventas')
      .select(`
        *,
        cliente:clientes(id, nombre, apellido, dni, telefono),
        vendedor:profiles(id, nombre, apellido),
        items:venta_items(*, producto:productos(id, codigo, nombre, precio_venta))
      `)
      .eq('id', id)
      .single()

    if (error) throw new Error(error.message)
    return data as Venta
  },

  async create(input: CreateVentaInput): Promise<Venta> {
    const { vendedor_id, items, ...formValues } = input

    const subtotal = items.reduce((acc, item) => acc + item.subtotal, 0)
    const { interesMonto, totalFinal } = calcularTotalConInteres(
      subtotal,
      formValues.descuento ?? 0,
      formValues.interes_porcentaje ?? 0
    )

    const ventaPayload = {
      vendedor_id,
      cliente_id: formValues.cliente_id ?? null,
      subtotal,
      descuento: formValues.descuento ?? 0,
      interes_porcentaje: formValues.interes_porcentaje ?? 0,
      interes_monto: interesMonto,
      total_final: totalFinal,
      metodo_pago: formValues.metodo_pago,
      tarjeta_tipo: formValues.tarjeta_tipo ?? null,
      cuotas: formValues.cuotas ?? 1,
      estado: 'completada' as const,
      notas: formValues.notas ?? null,
    }

    const { data: venta, error: ventaError } = await supabase
      .from('ventas')
      .insert([ventaPayload])
      .select()
      .single()

    if (ventaError) throw new Error(ventaError.message)
    const ventaId = (venta as { id: string }).id

    const itemsPayload = items.map((item) => ({
      venta_id: ventaId,
      producto_id: item.producto.id,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      subtotal: item.subtotal,
    }))

    const { error: itemsError } = await supabase
      .from('venta_items')
      .insert(itemsPayload)

    if (itemsError) throw new Error(itemsError.message)

    // Actualizar stock de cada producto
    for (const item of items) {
      const nuevoStock = Math.max(0, item.producto.stock_actual - item.cantidad)
      const { error: stockError } = await supabase
        .from('productos')
        .update({ stock_actual: nuevoStock })
        .eq('id', item.producto.id)

      if (stockError) {
        console.error('Stock update error for product', item.producto.id, stockError.message)
      }

      // Registrar movimiento de stock
      await supabase.from('movimientos_stock').insert([{
        producto_id: item.producto.id,
        usuario_id: vendedor_id,
        tipo: 'salida',
        cantidad: -item.cantidad,
        motivo: `Venta #${ventaId}`,
      }])
    }

    return this.getById(ventaId)
  },

  async cancelar(id: string): Promise<void> {
    const { error } = await supabase
      .from('ventas')
      .update({ estado: 'cancelada' })
      .eq('id', id)

    if (error) throw new Error(error.message)
  },

  async getStatsHoy(): Promise<{
    totalVentas: number
    montoTotal: number
    ticketPromedio: number
  }> {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('ventas')
      .select('total_final')
      .eq('estado', 'completada')
      .gte('created_at', hoy.toISOString())

    if (error) throw new Error(error.message)
    const ventas = (data ?? []) as { total_final: number }[]
    const montoTotal = ventas.reduce((acc, v) => acc + v.total_final, 0)
    return {
      totalVentas: ventas.length,
      montoTotal,
      ticketPromedio: ventas.length > 0 ? montoTotal / ventas.length : 0,
    }
  },

  async getVentasPorDia(dias = 30): Promise<{ fecha: string; total: number; cantidad: number }[]> {
    const desde = new Date()
    desde.setDate(desde.getDate() - dias)

    const { data, error } = await supabase
      .from('ventas')
      .select('created_at, total_final')
      .eq('estado', 'completada')
      .gte('created_at', desde.toISOString())
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    const ventas = (data ?? []) as { created_at: string; total_final: number }[]

    const grouped: Record<string, { total: number; cantidad: number }> = {}
    for (const v of ventas) {
      const fecha = v.created_at.slice(0, 10)
      if (!grouped[fecha]) grouped[fecha] = { total: 0, cantidad: 0 }
      grouped[fecha].total += v.total_final
      grouped[fecha].cantidad += 1
    }

    return Object.entries(grouped).map(([fecha, stats]) => ({ fecha, ...stats }))
  },

  async getItemsFromVenta(ventaId: string): Promise<VentaItem[]> {
    const { data, error } = await supabase
      .from('venta_items')
      .select('*, producto:productos(id, codigo, nombre, precio_venta)')
      .eq('venta_id', ventaId)

    if (error) throw new Error(error.message)
    return (data ?? []) as VentaItem[]
  },
}
