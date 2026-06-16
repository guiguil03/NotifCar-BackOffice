import { supabase } from './supabase'

export interface UserProfile {
  id: string       // user_profiles row PK
  user_id: string  // auth user ID — used for filtering owned data
  email: string
  role: 'user' | 'admin'
  full_name?: string
  first_name?: string
  last_name?: string
}

/**
 * Récupère le profil de l'utilisateur connecté
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, user_id, email, role, first_name, last_name')
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Error fetching user profile:', error)
      return null
    }

    return data as UserProfile
  } catch (error) {
    console.error('Error in getCurrentUserProfile:', error)
    return null
  }
}

/**
 * Vérifie si l'utilisateur actuel est un admin
 */
export async function isAdmin(): Promise<boolean> {
  const profile = await getCurrentUserProfile()
  return profile?.role === 'admin'
}

/**
 * Filtre les données selon le rôle de l'utilisateur
 * - Admin: retourne toutes les données
 * - User: filtre par user_id
 */
export async function getFilteredQuery(
  tableName: string,
  userIdColumn: string = 'user_id'
): Promise<any> {
  const profile = await getCurrentUserProfile()

  if (!profile) {
    throw new Error('User not authenticated')
  }

  let query = supabase.from(tableName).select('*')

  // Si ce n'est pas un admin, filtrer par user_id
  if (profile.role !== 'admin') {
    query = query.eq(userIdColumn, profile.id)
  }

  return query
}
