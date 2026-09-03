import type { User, Session } from '@supabase/supabase-js'
import type { Profile, UserGroup, UserRole } from './index'

export interface LoginCredentials {
  username: string
  password: string
}

export interface ProfileWithGroup extends Profile {
  user_groups?: Pick<UserGroup, 'name'> | null
}

export interface AuthContextType {
  user: User | null
  profile: ProfileWithGroup | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  isTeacher: boolean
  role: UserRole | null
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
}
