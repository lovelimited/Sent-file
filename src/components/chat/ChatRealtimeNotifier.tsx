import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquare, X, ArrowRight, Volume2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/services/supabase'
import { formatChatDisplayName } from '@/utils/userUtils'

interface ActiveToast {
  id: string
  senderName: string
  channelName: string
  content: string
  channelId: string
  time: string
}

export const ChatRealtimeNotifier: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [toast, setToast] = useState<ActiveToast | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Web Audio API Synthesizer Chime - works 100% offline, zero external asset
  const playNotificationSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AudioContextClass) return
      const ctx = new AudioContextClass()

      // Primary chime note (pleasant higher bell)
      const now = ctx.currentTime
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()

      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(880, now) // A5
      osc1.frequency.exponentialRampToValueAtTime(1318.5, now + 0.12) // E6

      gain1.gain.setValueAtTime(0.2, now)
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4)

      osc1.connect(gain1)
      gain1.connect(ctx.destination)

      osc1.start(now)
      osc1.stop(now + 0.45)
    } catch {
      // Audio playback might be restricted if no user gesture yet, fail silently
    }
  }

  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel('global-chat-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        async (payload) => {
          const newMsg = payload.new as {
            id: string
            channel_id: string
            sender_id: string
            content: string
            created_at: string
          }

          // Don't notify for user's own sent messages
          if (newMsg.sender_id === user.id) {
            return
          }

          // Fetch sender and channel names
          try {
            const [senderRes, channelRes] = await Promise.all([
              supabase.from('profiles').select('name, role').eq('id', newMsg.sender_id).single(),
              supabase.from('chat_channels').select('name').eq('id', newMsg.channel_id).single(),
            ])

            const senderName = formatChatDisplayName(senderRes.data?.name, senderRes.data?.role)
            const channelName = channelRes.data?.name || 'ห้องสื่อสาร'

            // Play notification sound
            playNotificationSound()

            // Display toast in bottom-right corner
            setToast({
              id: newMsg.id,
              senderName,
              channelName,
              content: newMsg.content,
              channelId: newMsg.channel_id,
              time: new Date(newMsg.created_at).toLocaleTimeString('th-TH', {
                hour: '2-digit',
                minute: '2-digit',
              }),
            })

            // Auto-clear after 6 seconds
            if (timerRef.current) clearTimeout(timerRef.current)
            timerRef.current = setTimeout(() => {
              setToast(null)
            }, 6000)
          } catch {
            // Error handling
          }
        }
      )
      .subscribe()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  if (!toast) return null

  const handleOpenChat = () => {
    setToast(null)
    navigate(`/chat?channel=${toast.channelId}`)
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full animate-in slide-in-from-bottom-5 fade-in duration-200">
      <div className="rounded-2xl border border-purple-200 bg-white/95 backdrop-blur-md p-4 shadow-2xl shadow-purple-500/10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-purple-700">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900">{toast.senderName}</span>
                <span className="text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.2 rounded font-medium border border-purple-100">
                  {toast.channelName}
                </span>
              </div>
              <span className="text-[10px] text-slate-400">{toast.time}</span>
            </div>
          </div>

          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="ปิดการแจ้งเตือน"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-2 text-xs text-slate-700 line-clamp-2 leading-relaxed pl-10">
          {toast.content}
        </p>

        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between pl-10">
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <Volume2 className="h-3 w-3 text-purple-500" />
            <span>มีข้อความใหม่</span>
          </div>

          <button
            onClick={handleOpenChat}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 hover:text-purple-800 hover:underline cursor-pointer"
          >
            <span>เปิดห้องแชท</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  )
}
