import { supabase } from '@/lib/supabase'
import type { Producto, Categoria } from '@/types/app.types'
import type { ProductoFormValues } from '@/lib/validations/producto.schema'

export const productosService = {
  async list(params?: {
    search?: string
    categoriaId?: string
    soloActivos?: boolean
    soloActivo?: boolean | null
    bajoStock?: boolean
    conStock?: boolean
    page?: number
    pageSize?: number
  }): Promise<{ data: Producto[]; count: number }> {
    const { search, categoriaId, soloActivos = true, soloActivo, bajoStock, conStock, page = 1, pageSize = 20 } = params ?? {}
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('productos')
      .select('*, categoria:categorias(id, nombre)', { count: 'exact' })
      .range(from, to)
      .order('nombre', { ascending: true })

    // soloActivo (explicit tri-state) takes priority over soloActivos
    if (soloActivo !== undefined && soloActivo !== null) {
      query = query.eq('activo', soloActivo)
    } else if (soloActivos) {
      query = query.eq('activo', true)
    }
    if (search) query = query.or(`nombre.ilike.%${search}%,codigo.ilike.%${search}%`)
    if (categoriaId) query = query.eq('categoria_id', categoriaId)
    if (conStock) query = query.gt('stock_actual', 0)

    const { data, error, count } = await query
    if (error) throw new Error(error.message)
    let result = (data ?? []) as Producto[]
    if (bajoStock) result = result.filter((p) => p.stock_actual <= p.stock_minimo)
    return { data: result, count: bajoStock ? result.length : (count ?? 0) }
  },

  async getById(id: string): Promise<Producto> {
    const { data, error } = await supabase
      .from('productos')
      .select('*, categoria:categorias(id, nombre)')
      .eq('id', id)
      .single()

    if (error) throw new Error(error.message)
    return data as Producto
  },

  async create(values: ProductoFormValues): Promise<Producto> {
    const { data, error } = await supabase
      .from('productos')
      .insert([values])
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as Producto
  },

  async update(id: string, values: Partial<ProductoFormValues>): Promise<Producto> {
    const { data, error } = await supabase
      .from('productos')
      .update(values)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as Producto
  },

  async toggleActivo(id: string, activo: boolean): Promise<Producto> {
    const { data, error } = await supabase
      .from('productos')
      .update({ activo })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as Producto
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('productos').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },

  async updateStock(
    productoId: string,
    delta: number,
    usuarioId: string,
    tipo: 'entrada' | 'salida' | 'ajuste',
    motivo?: string
  ): Promise<void> {
    const { data: producto, error: fetchError } = await supabase
      .from('productos')
      .select('stock_actual')
      .eq('id', productoId)
      .single()

    if (fetchError) throw new Error(fetchError.message)

    const nuevoStock = (producto as { stock_actual: number }).stock_actual + delta

    const { error: updateError } = await supabase
      .from('productos')
      .update({ stock_actual: nuevoStock })
      .eq('id', productoId)

    if (updateError) throw new Error(updateError.message)

    const { error: movError } = await supabase
      .from('movimientos_stock')
      .insert([{
        producto_id: productoId,
        usuario_id: usuarioId,
        tipo,
        cantidad: delta,
        motivo: motivo ?? null,
      }])

    if (movError) throw new Error(movError.message)
  },

  async listCategorias(): Promise<Categoria[]> {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .order('nombre', { ascending: true })

    if (error) throw new Error(error.message)
    return (data ?? []) as Categoria[]
  },

  async getBajoStock(): Promise<Producto[]> {
    const { data, error } = await supabase
      .from('productos')
      .select('*, categoria:categorias(id, nombre)')
      .eq('activo', true)

    if (error) throw new Error(error.message)
    const productos = (data ?? []) as Producto[]
    return productos.filter((p) => p.stock_actual <= p.stock_minimo)
  },

  async createCategoria(nombre: string, descripcion?: string): Promise<Categoria> {
    const { data, error } = await supabase
      .from('categorias')
      .insert([{ nombre, descripcion: descripcion ?? null }])
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as Categoria
  },

  async updateCategoria(id: string, values: { nombre: string; descripcion?: string }): Promise<Categoria> {
    const { data, error } = await supabase
      .from('categorias')
      .update({ nombre: values.nombre, descripcion: values.descripcion ?? null })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as Categoria
  },

  async deleteCategoria(id: string): Promise<void> {
    const { error } = await supabase
      .from('categorias')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
  },
}
