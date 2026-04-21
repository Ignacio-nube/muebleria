import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { authService } from '@/features/auth/services/authService'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Caso PKCE: llegamos con ?code= en la URL
    const hasCode = searchParams.has('code')
    // Caso implicit: llegamos con #access_token=...&type=recovery en el hash
    const hasRecoveryHash = location.hash.includes('type=recovery')

    if (hasCode || hasRecoveryHash) {
      // Supabase procesa el token automáticamente, solo esperar la sesión
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setIsReady(true)
        }
      })
      // También escuchar por si la sesión llega un poco después
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
          setIsReady(true)
        }
      })
      return () => subscription.unsubscribe()
    }

    // Sin token en URL: puede que AuthProvider ya manejó el evento y estamos acá por navigate()
    // Verificar sesión activa directamente
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsReady(true)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setIsReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [searchParams, location.hash])

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
    } catch {
      toast.error('No se pudo actualizar la contraseña', {
        description: 'El link puede haber expirado. Solicitá uno nuevo.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!isReady) {
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
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-center text-muted-foreground">
                Si este mensaje persiste, el link puede haber expirado.{' '}
                <button
                  onClick={() => navigate('/login')}
                  className="underline underline-offset-2 hover:text-foreground transition-colors"
                >
                  Volver al inicio de sesión
                </button>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

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
