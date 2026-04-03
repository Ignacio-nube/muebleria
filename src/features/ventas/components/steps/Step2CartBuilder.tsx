import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Plus, Minus, Trash2, ShoppingCart } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { productosService } from '@/features/productos/services/productosService'
import { formatCurrency } from '@/lib/utils'
import type { CartItem, Producto } from '@/types/app.types'

interface Step2Props {
  items: CartItem[]
  onAddItem: (item: CartItem) => void
  onUpdateQty: (productoId: string, cantidad: number) => void
  onRemoveItem: (productoId: string) => void
  onBack: () => void
  onNext: () => void
  subtotal: number
}

export function Step2CartBuilder({
  items,
  onAddItem,
  onUpdateQty,
  onRemoveItem,
  onBack,
  onNext,
  subtotal,
}: Step2Props) {
  const [search, setSearch] = useState('')

  const { data: productos, isLoading } = useQuery({
    queryKey: ['productos-search', search],
    queryFn: () =>
      productosService.list({ search, soloActivos: true, conStock: true, pageSize: 8 }).then((r) => r.data),
  })

  function handleAdd(producto: Producto) {
    onAddItem({
      producto,
      cantidad: 1,
      precio_unitario: producto.precio_venta,
      subtotal: producto.precio_venta,
    })
  }

  const isInCart = (productoId: string) => items.some((i) => i.producto.id === productoId)
  const getCartItem = (productoId: string) => items.find((i) => i.producto.id === productoId)

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* Product search */}
      <div className="flex flex-col gap-3 flex-1">
        <h3 className="text-lg font-semibold">Agregar productos</h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o código..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1 max-h-72 overflow-y-auto">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
            : (productos ?? []).map((p) => {
                const cartItem = getCartItem(p.id)
                const cantidadEnCarrito = cartItem?.cantidad ?? 0
                const stockAgotado = p.stock_actual <= 0
                const limiteAlcanzado = cantidadEnCarrito >= p.stock_actual
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-md border border-transparent hover:border-border hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-sm truncate">{p.nombre}</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono">{p.codigo}</span>
                        <span>·</span>
                        <span className={p.stock_actual <= p.stock_minimo ? 'text-destructive font-medium' : ''}>
                          Stock: {p.stock_actual}
                        </span>
                        {limiteAlcanzado && cantidadEnCarrito > 0 && (
                          <Badge variant="destructive" className="text-[10px] px-1 py-0">Sin stock</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <span className="font-semibold text-sm">{formatCurrency(p.precio_venta)}</span>
                      <Button
                        type="button"
                        size="icon"
                        variant={isInCart(p.id) ? 'secondary' : 'outline'}
                        className="size-8"
                        disabled={stockAgotado || limiteAlcanzado}
                        title={limiteAlcanzado ? `Stock máximo: ${p.stock_actual}` : undefined}
                        onClick={() => handleAdd(p)}
                      >
                        <Plus className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
        </div>
      </div>

      {/* Cart */}
      <div className="flex flex-col gap-3 w-full lg:w-80 shrink-0">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ShoppingCart className="size-5" />
          Carrito
          {items.length > 0 && (
            <Badge className="ml-auto">{items.length}</Badge>
          )}
        </h3>

        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm border rounded-md">
            El carrito está vacío
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((item) => {
              const atLimit = item.cantidad >= item.producto.stock_actual
              return (
                <div key={item.producto.id} className="flex items-center gap-2 p-2 rounded-md border">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.producto.nombre}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(item.precio_unitario)} c/u</p>
                    {atLimit && (
                      <p className="text-xs text-destructive">Máx. {item.producto.stock_actual}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      onClick={() => onUpdateQty(item.producto.id, item.cantidad - 1)}
                    >
                      <Minus className="size-3" />
                    </Button>
                    <span className="w-6 text-center text-sm font-medium">{item.cantidad}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      disabled={atLimit}
                      title={atLimit ? `Stock máximo: ${item.producto.stock_actual}` : undefined}
                      onClick={() => onUpdateQty(item.producto.id, item.cantidad + 1)}
                    >
                      <Plus className="size-3" />
                    </Button>
                  </div>
                  <span className="text-sm font-semibold w-20 text-right">
                    {formatCurrency(item.subtotal)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive hover:text-destructive shrink-0"
                    onClick={() => onRemoveItem(item.producto.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}

        <Separator />
        <div className="flex items-center justify-between font-semibold">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
            Atrás
          </Button>
          <Button
            type="button"
            className="flex-1"
            disabled={items.length === 0}
            onClick={onNext}
          >
            Continuar
          </Button>
        </div>
      </div>
    </div>
  )
}
