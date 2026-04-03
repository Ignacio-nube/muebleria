import { insforge } from '@/lib/insforge'
import type { Profile } from '@/types/app.types'

export const authService = {
  async signIn(email: string, password: string) {
    const { data, error } = await insforge.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    return data
  },

  async signOut() {
    const { error } = await insforge.auth.signOut()
    if (error) throw new Error(error.message)
  },

  async getCurrentUser() {
    const { data, error } = await insforge.auth.getCurrentUser()
    if (error) throw new Error(error.message)
    return data.user
  },

  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await insforge.database
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return data as Profile | null
  },

  async createUser(
    email: string,
    password: string,
    profileData: { nombre: string; apellido: string; rol: Profile['rol'] }
  ) {
    const { data, error } = await insforge.auth.signUp({ email, password })
    if (error) throw new Error(error.message)
    if (!data?.user) throw new Error('No se pudo crear el usuario')

    const { error: profileError } = await insforge.database
      .from('profiles')
      .insert([{ id: data.user.id, ...profileData }])

    if (profileError) throw new Error(profileError.message)
    return data.user
  },

  async updateProfile(
    userId: string,
    updates: Partial<Pick<Profile, 'nombre' | 'apellido' | 'rol' | 'activo'>>
  ) {
    const { data, error } = await insforge.database
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as Profile
  },

  async listUsers(): Promise<Profile[]> {
    const [profilesResult, emailsResult] = await Promise.all([
      insforge.database.from('profiles').select('*').order('created_at', { ascending: false }),
      insforge.database.rpc('admin_get_user_emails'),
    ])
    if (profilesResult.error) throw new Error(profilesResult.error.message)
    if (emailsResult.error) throw new Error(emailsResult.error.message)
    const emailMap = new Map(
      ((emailsResult.data ?? []) as { id: string; email: string }[]).map((e) => [e.id, e.email])
    )
    return ((profilesResult.data ?? []) as Profile[]).map((p) => ({
      ...p,
      email: emailMap.get(p.id) ?? '',
    }))
  },

  async changePassword(userId: string, newPassword: string): Promise<void> {
    const { error } = await insforge.database.rpc('set_user_password', {
      p_user_id: userId,
      p_new_password: newPassword,
    })
    if (error) throw new Error(error.message)
  },

  async changeEmail(userId: string, newEmail: string): Promise<void> {
    const { error } = await insforge.database.rpc('admin_set_user_email', {
      p_user_id: userId,
      p_new_email: newEmail,
    })
    if (error) throw new Error(error.message)
  },
}
