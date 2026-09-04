import React, { useEffect, useState, useCallback, useMemo } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/services/supabase'
import type { AuthContextType, LoginCredentials, ProfileWithGroup } from '@/types/auth.types'

import { AuthContext } from './authContextValue'

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<ProfileWithGroup | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(isSupabaseConfigured)

  // Fetch full profile from database
  const fetchProfile = useCallback(async (userId: string): Promise<ProfileWithGroup | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, user_groups(name)')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('[AuthContext] Failed to fetch profile:', error.message)
        return null
      }

      return data as ProfileWithGroup | null
    } catch (err: unknown) {
      console.error('[AuthContext] Profile fetch error:', err)
      return null
    }
  }, [])

  // Sync profile on session load
  const syncSessionAndProfile = useCallback(async (currentSession: Session | null) => {
    setSession(currentSession)
    setUser(currentSession?.user ?? null)

    if (currentSession?.user) {
      const userProfile = await fetchProfile(currentSession.user.id)
      
      // If user account is deactivated, force logout
      if (userProfile && !userProfile.active) {
        console.warn('[AuthContext] User account is inactive. Logging out.')
        await supabase.auth.signOut()
        setUser(null)
        setProfile(null)
        setSession(null)
      } else {
        setProfile(userProfile)
      }
    } else {
      setProfile(null)
    }

    setIsLoading(false)
  }, [fetchProfile])

  // Initialize session and auth state listener
  useEffect(() => {
    if (!isSupabaseConfigured) {
      return
    }

    let isMounted = true

    async function initAuth() {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession()
        if (isMounted) {
          await syncSessionAndProfile(initialSession)
        }
      } catch (err) {
        console.error('[AuthContext] Session init error:', err)
        if (isMounted) setIsLoading(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (isMounted) {
        await syncSessionAndProfile(newSession)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [syncSessionAndProfile])

  // Login handler
  const login = useCallback(async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
    const normalizedUsername = credentials.username.trim().toLowerCase()
    const password = credentials.password

    if (!normalizedUsername || !password) {
      return { success: false, error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' }
    }

    setIsLoading(true)

    try {
      // 1. Try invoking the privileged auth-login Edge Function
      const { data, error } = await supabase.functions.invoke('auth-login', {
        body: { username: normalizedUsername, password },
      })

      if (!error && data?.session) {
        // Set received session tokens in browser client
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        })

        if (setSessionError) {
          setIsLoading(false)
          return { success: false, error: setSessionError.message }
        }

        if (data.profile) {
          setProfile(data.profile)
        }

        setIsLoading(false)
        return { success: true }
      }

      if (!error && data?.error) {
        setIsLoading(false)
        return { success: false, error: data.error }
      }

      // 2. Graceful Fallback: Direct Supabase Auth using internal email pattern <username>@school.local
      const directEmail = `${normalizedUsername}@school.local`
      const { data: directAuth, error: directAuthError } = await supabase.auth.signInWithPassword({
        email: directEmail,
        password,
      })

      if (directAuthError) {
        setIsLoading(false)
        return { success: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }
      }

      if (directAuth.session) {
        const userProfile = await fetchProfile(directAuth.session.user.id)
        if (userProfile && !userProfile.active) {
          await supabase.auth.signOut()
          setIsLoading(false)
          return { success: false, error: 'บัญชีผู้ใช้งานนี้ถูกระงับการใช้งาน' }
        }
        setProfile(userProfile)
        setSession(directAuth.session)
        setUser(directAuth.user)
        setIsLoading(false)
        return { success: true }
      }

      setIsLoading(false)
      return { success: false, error: 'ไม่พบข้อมูล Session จากระบบ' }
    } catch (err: unknown) {
      setIsLoading(false)
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ'
      return { success: false, error: message }
    }
  }, [])

  // Logout handler
  const logout = useCallback(async () => {
    setIsLoading(true)
    try {
      await supabase.auth.signOut()
    } finally {
      setUser(null)
      setProfile(null)
      setSession(null)
      setIsLoading(false)
    }
  }, [])

  // Refresh profile
  const refreshProfile = useCallback(async () => {
    if (user) {
      const refreshed = await fetchProfile(user.id)
      setProfile(refreshed)
    }
  }, [user, fetchProfile])

  const value = useMemo<AuthContextType>(() => ({
    user,
    profile,
    session,
    isLoading,
    isAuthenticated: Boolean(user && profile && profile.active),
    isAdmin: profile?.role === 'admin' && profile?.active === true,
    isTeacher: profile?.role === 'teacher' && profile?.active === true,
    role: profile?.role ?? null,
    login,
    logout,
    refreshProfile,
  }), [user, profile, session, isLoading, login, logout, refreshProfile])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
