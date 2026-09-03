import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '@/services/supabase'

export interface SupabaseStatus {
  isConfigured: boolean
  isConnected: boolean
  isLoading: boolean
  error: string | null
}

export function useSupabaseStatus(): SupabaseStatus {
  const [status, setStatus] = useState<SupabaseStatus>({
    isConfigured: isSupabaseConfigured,
    isConnected: false,
    isLoading: isSupabaseConfigured,
    error: null,
  })

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return
    }

    let isMounted = true

    async function checkConnection() {
      try {
        const { error } = await supabase.auth.getSession()
        if (isMounted) {
          if (error) {
            setStatus({
              isConfigured: true,
              isConnected: false,
              isLoading: false,
              error: error.message,
            })
          } else {
            setStatus({
              isConfigured: true,
              isConnected: true,
              isLoading: false,
              error: null,
            })
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          setStatus({
            isConfigured: true,
            isConnected: false,
            isLoading: false,
            error: err instanceof Error ? err.message : 'Unknown connection error',
          })
        }
      }
    }

    checkConnection()

    return () => {
      isMounted = false
    }
  }, [])

  return status
}
