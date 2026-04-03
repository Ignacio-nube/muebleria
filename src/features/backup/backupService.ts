import JSZip from 'jszip'
import { insforge } from '@/lib/insforge'
import { format } from 'date-fns'

// ─── CSV helpers ─────────────────────────────────────────────────────────────

function escapeCell(val: unknown): string {
  if (val === null || val === undefined) return ''
  const s = String(val)
  // Wrap in quotes if contains comma, quote, or newline
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

/**
 * Flatten one level of nested objects (e.g. joined relations).
 * { cliente: { nombre: 'Juan', apellido: 'Perez' } }
 * becomes { cliente_nombre: 'Juan', cliente_apellido: 'Perez' }
 */
function flattenRow(row: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (Array.isArray(value)) {
      // Skip array relations (e.g. items[]) — they have their own CSV file
      continue
    }
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

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchAll(table: string, select = '*'): Promise<Record<string, unknown>[]> {
  const { data, error } = await insforge.database
    .from(table)
    .select(select)
    .order('created_at', { ascending: true })
    .limit(50000)
  if (error) throw new Error(`Error al exportar ${table}: ${error.message}`)
  return (data ?? []) as unknown as Record<string, unknown>[]
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function downloadBackup(): Promise<void> {
  // Fetch all tables in parallel
  const [
    clientes,
    productos,
    categorias,
    ventas,
    ventaItems,
    usuarios,
    movimientos,
  ] = await Promise.all([
    fetchAll('clientes'),
    fetchAll('productos', '*, categoria:categorias(nombre)'),
    fetchAll('categorias'),
    fetchAll('ventas', '*, cliente:clientes(nombre,apellido), vendedor:profiles(nombre,apellido)'),
    fetchAll('venta_items', '*, producto:productos(codigo,nombre)'),
    fetchAll('profiles'),
    fetchAll('movimientos_stock', '*, producto:productos(codigo,nombre), usuario:profiles(nombre,apellido)'),
  ])

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
