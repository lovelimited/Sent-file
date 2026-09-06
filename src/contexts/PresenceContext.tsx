import React, { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { supabase } from '@/services/supabase'
import { useAuth } from '@/hooks/useAuth'

interface PresenceContextType {
  onlineUserIds: Set<string>
  isUserOnline: (userId?: string | null) => boolean
  onlineCount: number
}

const PresenceContext = createContext<PresenceContextType>({
  onlineUserIds: new Set(),
  isUserOnline: () => false,
  onlineCount: 0,
})

export const PresenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth()
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user?.id) {
      setOnlineUserIds(new Set())
      return
    }

    const channel = supabase.channel('online-presence', {
      config: {
        presence: {
          key: user.id,
        },
      },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const ids = new Set<string>()
        Object.keys(state).forEach((key) => {
          ids.add(key)
        })
        setOnlineUserIds(ids)
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        setOnlineUserIds((prev) => {
          const next = new Set(prev)
          next.add(key)
          return next
        })
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUserIds((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            name: profile?.name || user.email,
            online_at: new Date().toISOString(),
          })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, profile?.name, user?.email])

  const isUserOnline = useMemo(() => {
    return (userId?: string | null): boolean => {
      if (!userId) return false
      // Current user is always online if logged in
      if (user?.id && userId === user.id) return true
      return onlineUserIds.has(userId)
    }
  }, [onlineUserIds, user?.id])

  const value = useMemo(
    () => ({
      onlineUserIds,
      isUserOnline,
      onlineCount: Math.max(onlineUserIds.size, user?.id ? 1 : 0),
    }),
    [onlineUserIds, isUserOnline, user?.id]
  )

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>
}

export const usePresence = () => useContext(PresenceContext)
