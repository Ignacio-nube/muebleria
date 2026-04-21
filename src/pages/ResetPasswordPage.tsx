import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { authService } from '@/features/auth/services/authService'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  // null = verificando, true = listo, false = link inválido/expirado
  const [isReady, setIsReady] = useState<boolean | null>(null)

  useEffect(() => {
    // Supabase detecta automáticamente el token en la URL (sea ?code= o #access_token=)
    // y dispara onAuthStateChange. PASSWORD_RECOVERY o SIGNED_IN indican sesión activa.
    // Suscribirse ANTES de cualquier otra cosa para no perder el evento.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      console.log('[ResetPasswordPage] auth event:', event)
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setIsReady(true)
      }
    })

    // También verificar si la sesión ya fue procesada antes de montar
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[ResetPasswordPage] getSession:', session?.user?.email ?? 'null')
      if (session) {
        setIsReady(true)
      } else {
        // Dar 3 segundos al evento antes de mostrar error
        setTimeout(() => {
          setIsReady((prev) => (prev === null ? false : prev))
        }, 3000)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setIsLoading(true)
    try {
      await authService.updatePassword(password)
      toast.success('Contraseña actualizada', {
        description: 'Ya podés ingresar con tu nueva contraseña.',
      })
      navigate('/login', { replace: true })
    } catch (err) {
      console.error('[ResetPasswordPage] updatePassword error:', err)
      toast.error('No se pudo actualizar la contraseña', {
        description: 'El link puede haber expirado. Solicitá uno nuevo.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Verificando...
  if (isReady === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <img src="/logo.svg" alt="Centro Hogar" className="size-16" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Centro Hogar</h1>
              <p className="text-sm text-muted-foreground">Verificando link...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Link inválido o expirado
  if (isReady === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <img src="/logo.svg" alt="Centro Hogar" className="size-16" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Centro Hogar</h1>
            </div>
          </div>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-center text-muted-foreground">
                El link expiró o ya fue usado.{' '}
                <button
                  onClick={() => navigate('/login')}
                  className="underline underline-offset-2 hover:text-foreground transition-colors"
                >
                  Solicitá uno nuevo
                </button>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Listo — mostrar formulario
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <img src="/logo.svg" alt="Centro Hogar" className="size-16" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Centro Hogar</h1>
            <p className="text-sm text-muted-foreground">Panel de gestión interno</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nueva contraseña</CardTitle>
            <CardDescription>Elegí una nueva contraseña para tu cuenta</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Nueva contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  minLength={6}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="confirm">Confirmar contraseña</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full mt-2" disabled={isLoading}>
                {isLoading ? 'Actualizando...' : 'Actualizar contraseña'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
