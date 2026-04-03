import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, UserPlus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { clientesService } from '@/features/clientes/services/clientesService'
import { ClienteDialog } from '@/features/clientes/components/ClienteDialog'
import { useQueryClient } from '@tanstack/react-query'
import type { Cliente } from '@/types/app.types'

interface Step1Props {
  selectedCliente: Cliente | null
  onSelect: (cliente: Cliente) => void
  onSkip: () => void
}

export function Step1ClienteSelect({ onSelect, onSkip }: Step1Props) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [newClienteOpen, setNewClienteOpen] = useState(false)

  const { data: clientes, isLoading } = useQuery({
    queryKey: ['clientes-search', search],
    queryFn: () =>
      search.length >= 2
        ? clientesService.search(search)
        : clientesService.list({ pageSize: 8 }).then((r) => r.data),
    enabled: true,
  })

  const handleNewCliente = useCallback(
    (cliente?: Cliente) => {
      qc.invalidateQueries({ queryKey: ['clientes'] })
      if (cliente) onSelect(cliente)
    },
    [qc, onSelect]
  )

  return (
    <div className="flex flex-col gap-4 max-w-lg">
      <div>
        <h3 className="text-lg font-semibold">Seleccionar cliente</h3>
        <p className="text-sm text-muted-foreground">Buscá un cliente existente o continuá sin uno.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, DNI..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : (
        <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
          {(clientes ?? []).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c)}
              className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 text-left transition-colors border border-transparent hover:border-border"
            >
              <div className="flex flex-col">
                <span className="font-medium text-sm">{c.nombre} {c.apellido}</span>
                <span className="text-xs text-muted-foreground">
                  {[c.dni, c.telefono].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
                </span>
              </div>
            </button>
          ))}
          {(clientes ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No se encontraron clientes
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 pt-2 border-t">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => setNewClienteOpen(true)}
        >
          <UserPlus data-icon="inline-start" />
          Nuevo cliente
        </Button>
        <Button type="button" variant="outline" className="flex-1" onClick={onSkip}>
          Continuar sin cliente
        </Button>
      </div>

      <ClienteDialog
        open={newClienteOpen}
        onOpenChange={setNewClienteOpen}
        cliente={null}
        onSuccess={() => { setNewClienteOpen(false); handleNewCliente() }}
      />
    </div>
  )
}
