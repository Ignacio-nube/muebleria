import JSZip from 'jszip'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

// ─── CSV helpers ─────────────────────────────────────────────────────────────

function escapeCell(val: unknown): string {
  if (val === null || val === undefined) return ''
  const s = String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function flattenRow(row: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (Array.isArray(value)) continue
    if (value !== null && typeof value === 'object') {
      for (const [subKey, subVal] of Object.entries(value as Record<string, unknown>)) {
        result[`${key}_${subKey}`] = subVal
      }
    } else {
      result[key] = value
    }
  }
  return result
}

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return 'sin_datos\n'
  const flat = rows.map(flattenRow)
  const headers = Object.keys(flat[0])
  const lines = flat.map((row) => headers.map((h) => escapeCell(row[h])).join(','))
  return [headers.join(','), ...lines].join('\n')
}

// ─── Fetch con paginación automática ─────────────────────────────────────────
// Supabase limita a 1000 filas por request. Paginamos hasta traer todo.

async function fetchAll(table: string, select = '*'): Promise<Record<string, unknown>[]> {
  const PAGE_SIZE = 1000
  const allRows: Record<string, unknown>[] = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .order('created_at', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw new Error(`Error al exportar "${table}": ${error.message}`)

    const rows = (data ?? []) as unknown as Record<string, unknown>[]
    allRows.push(...rows)

    // Si trajo menos de PAGE_SIZE, llegamos al final
    if (rows.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return allRows
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function downloadBackup(): Promise<void> {
  // Fetch todas las tablas — de forma secuencial para no saturar la conexión
  // y con manejo de error individual para saber exactamente qué tabla falla
  const results = await Promise.allSettled([
    fetchAll('clientes'),
    fetchAll('productos', '*, categoria:categorias(nombre)'),
    fetchAll('categorias'),
    fetchAll('ventas', '*, cliente:clientes(nombre,apellido), vendedor:profiles(nombre,apellido)'),
    fetchAll('venta_items', '*, producto:productos(codigo,nombre)'),
    fetchAll('profiles'),
    fetchAll('movimientos_stock', '*, producto:productos(codigo,nombre), usuario:profiles(nombre,apellido)'),
  ])

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map((r) => r.reason?.message ?? 'Error desconocido')

  if (errors.length > 0) {
    throw new Error(errors.join(' | '))
  }

  const [
    clientes,
    productos,
    categorias,
    ventas,
    ventaItems,
    usuarios,
    movimientos,
  ] = results.map((r) => (r as PromiseFulfilledResult<Record<string, unknown>[]>).value)

  // Build ZIP
  const zip = new JSZip()
  const date = format(new Date(), 'yyyy-MM-dd')
  const folder = zip.folder(`centro-hogar-backup-${date}`)!

  folder.file('clientes.csv', toCSV(clientes))
  folder.file('productos.csv', toCSV(productos))
  folder.file('categorias.csv', toCSV(categorias))
  folder.file('ventas.csv', toCSV(ventas))
  folder.file('venta_items.csv', toCSV(ventaItems))
  folder.file('usuarios.csv', toCSV(usuarios))
  folder.file('movimientos_stock.csv', toCSV(movimientos))

  // Trigger download
  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `centro-hogar-backup-${date}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
