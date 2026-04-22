import { supabase } from '@/lib/supabase'
import type { Cliente, Venta } from '@/types/app.types'
import type { ClienteFormValues } from '@/lib/validations/cliente.schema'

export const clientesService = {
  async list(params?: {
    search?: string
    activo?: boolean
    page?: number
    pageSize?: number
  }): Promise<{ data: Cliente[]; count: number }> {
    const { search, activo, page = 1, pageSize = 20 } = params ?? {}
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('clientes')
      .select('*', { count: 'exact' })
      .range(from, to)
      .order('activo', { ascending: false })
      .order('apellido', { ascending: true })

    if (activo !== undefined) query = query.eq('activo', activo)
    if (search) {
      query = query.or(
        `nombre.ilike.%${search}%,apellido.ilike.%${search}%,dni.ilike.%${search}%`
      )
    }

    const { data, error, count } = await query
    if (error) throw new Error(error.message)
    return { data: (data ?? []) as Cliente[], count: count ?? 0 }
  },

  async getById(id: string): Promise<Cliente> {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw new Error(error.message)
    return data as Cliente
  },

  async create(values: ClienteFormValues): Promise<Cliente> {
    const { data, error } = await supabase
      .from('clientes')
      .insert([values])
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as Cliente
  },

  async update(id: string, values: Partial<ClienteFormValues>): Promise<Cliente> {
    const { data, error } = await supabase
      .from('clientes')
      .update(values)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as Cliente
  },

  async toggleActivo(id: string, activo: boolean): Promise<Cliente> {
    const { data, error } = await supabase
      .from('clientes')
      .update({ activo })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as Cliente
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },

  async search(query: string): Promise<Cliente[]> {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .or(`nombre.ilike.%${query}%,apellido.ilike.%${query}%,dni.ilike.%${query}%`)
      .eq('activo', true)
      .limit(10)
      .order('apellido', { ascending: true })

    if (error) throw new Error(error.message)
    return (data ?? []) as Cliente[]
  },

  async getHistorial(clienteId: string): Promise<Venta[]> {
    const { data, error } = await supabase
      .from('ventas')
      .select('*, vendedor:profiles(id, nombre, apellido)')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return (data ?? []) as Venta[]
  },
}
