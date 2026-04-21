import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { authService } from '@/features/auth/services/authService'
import type { Profile } from '@/types/app.types'

interface AuthUser {
  id: string
  email: string
}

interface AuthContextValue {
  user: AuthUser | null
  profile: Profile | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const initializedRef = useRef(false)
  // Cuando estamos en flujo de recuperación de contraseña, no tratamos
  // al usuario como autenticado aunque Supabase haya creado sesión temporal
  const isRecoveryModeRef = useRef(false)

  const loadProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const p = await authService.getProfile(userId)
      setProfile(p)
      return p
    } catch {
      setProfile(null)
      return null
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id)
  }, [user, loadProfile])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Supabase establece una sesión temporal para que updateUser() funcione.
        // No queremos que el usuario quede "logueado" — lo mandamos a resetear contraseña.
        isRecoveryModeRef.current = true
        setUser(null)
        setProfile(null)
        navigate('/reset-password', { replace: true })
        if (!initializedRef.current) {
          initializedRef.current = true
          setIsLoading(false)
        }
        return
      }

      // Ignorar el evento inicial que Supabase dispara al montar;
      // lo maneja getSession() abajo para esperar loadProfile antes de quitar el loader
      if (!initializedRef.current) return

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        // Si el usuario acaba de actualizar su contraseña, salir del modo recovery
        if (event === 'USER_UPDATED') isRecoveryModeRef.current = false

        if (session?.user && !isRecoveryModeRef.current) {
          setUser({ id: session.user.id, email: session.user.email ?? '' })
          await loadProfile(session.user.id)
        }
      } else if (event === 'SIGNED_OUT') {
        isRecoveryModeRef.current = false
        setUser(null)
        setProfile(null)
      }
    })

    // Inicialización: obtener sesión actual y cargar perfil ANTES de quitar el loader
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user && !isRecoveryModeRef.current) {
        setUser({ id: session.user.id, email: session.user.email ?? '' })
        await loadProfile(session.user.id)
      }
    }).catch(() => {
      // Sin sesión o error → quedamos como no autenticado
    }).finally(() => {
      if (!initializedRef.current) {
        initializedRef.current = true
        setIsLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [loadProfile, navigate])

  const signIn = useCallback(async (email: string, password: string) => {
    const data = await authService.signIn(email, password)
    if (data?.user) {
      setUser({ id: data.user.id, email: data.user.email ?? '' })
      await loadProfile(data.user.id)
    }
  }, [loadProfile])

  const signOut = useCallback(async () => {
    await authService.signOut()
    setUser(null)
    setProfile(null)
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    await authService.resetPassword(email)
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      isLoading,
      isAuthenticated: !!user && !!profile,
      signIn,
      signOut,
      refreshProfile,
      resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
