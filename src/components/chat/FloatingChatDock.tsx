import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  MessageSquare,
  Minimize2,
  Send,
  Loader2,
  Volume2,
  VolumeX,
  ExternalLink,
  Search,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { usePresence } from '@/contexts/PresenceContext'
import {
  fetchAccessibleChannels,
  fetchChannelMessages,
  sendChatMessage,
  subscribeToChannelMessages,
  fetchChannelsLastMessageTimes,
  sortChannelsByLatestMessage,
  type ChatChannelWithGroup,
  type ChatMessageWithSender,
} from '@/services/chatService'
import { supabase } from '@/services/supabase'
import { getAvatarUrl } from '@/utils/avatarUtils'
import { formatChatDisplayName } from '@/utils/userUtils'

export const FloatingChatDock: React.FC = () => {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Do not render dock if already on full /chat page
  const isFullChatPage = location.pathname.startsWith('/chat')

  const [isOpen, setIsOpen] = useState(false)
  const [channels, setChannels] = useState<ChatChannelWithGroup[]>([])
  const [, setLastMessageMap] = useState<Record<string, string>>({})
  const [activeChannel, setActiveChannel] = useState<ChatChannelWithGroup | null>(null)
  const [messages, setMessages] = useState<ChatMessageWithSender[]>([])
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({})
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [channelSearch, setChannelSearch] = useState('')
  const { isUserOnline } = usePresence()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatScrollContainerRef = useRef<HTMLDivElement>(null)

  // References to keep realtime incoming subscription stable and prevent channel recreation on state updates
  const activeChannelRef = useRef(activeChannel)
  activeChannelRef.current = activeChannel
  const isOpenRef = useRef(isOpen)
  isOpenRef.current = isOpen

  // Total unread count derived directly from unreadMap
  const totalUnreadCount = useMemo(() => {
    return Object.entries(unreadMap).reduce((acc, [chId, count]) => {
      // If dock is currently open and this channel is currently active, it is read
      if (isOpen && activeChannel?.id === chId) return acc
      return acc + (count || 0)
    }, 0)
  }, [unreadMap, isOpen, activeChannel?.id])

  // Web Audio Synthesizer bell
  const playChime = useCallback(() => {
    if (!soundEnabled) return
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, now)
      osc.frequency.exponentialRampToValueAtTime(1318.5, now + 0.12)
      gain.gain.setValueAtTime(0.18, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.4)
    } catch {
      // Audio might be muted
    }
  }, [soundEnabled])

  const playChimeRef = useRef(playChime)
  playChimeRef.current = playChime

  // Scroll container strictly without moving window
  const scrollToBottom = () => {
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTop = chatScrollContainerRef.current.scrollHeight
    }
  }

  // Check unreads
  const refreshUnreads = useCallback(async (channelList: ChatChannelWithGroup[]) => {
    if (!user?.id) return
    const map: Record<string, number> = {}
    for (const ch of channelList) {
      if (isOpenRef.current && activeChannelRef.current?.id === ch.id) {
        map[ch.id] = 0
        localStorage.setItem(`chat_last_read_${ch.id}`, new Date().toISOString())
        continue
      }

      let lastRead = localStorage.getItem(`chat_last_read_${ch.id}`)
      if (!lastRead) {
        // Baseline to now if never recorded, so past historical messages don't falsely badge
        lastRead = new Date().toISOString()
        localStorage.setItem(`chat_last_read_${ch.id}`, lastRead)
      }

      const { count } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('channel_id', ch.id)
        .gt('created_at', lastRead)
        .neq('sender_id', user.id)

      map[ch.id] = count || 0
    }
    setUnreadMap(map)
  }, [user?.id])

  // Load channels with latest active sorting (Requirement 5)
  useEffect(() => {
    if (!user?.id) return
    let isMounted = true

    Promise.all([
      fetchAccessibleChannels(),
      fetchChannelsLastMessageTimes(),
    ]).then(([channelsRes, timesMap]) => {
      if (isMounted && channelsRes.data && channelsRes.data.length > 0) {
        setLastMessageMap(timesMap)
        const sorted = sortChannelsByLatestMessage(channelsRes.data, timesMap)
        setChannels(sorted)

        // Requirement 2: Show latest active group
        const savedChannelId = localStorage.getItem('last_active_chat_channel')
        const initial = sorted.find((c) => c.id === savedChannelId) || sorted[0]
        setActiveChannel(initial)
        refreshUnreads(sorted)
      }
    })
    return () => { isMounted = false }
  }, [user?.id, refreshUnreads])

  // Load messages when channel active and dock open
  useEffect(() => {
    if (!activeChannel || !isOpen) return
    let isMounted = true

    // Mark active channel as read
    localStorage.setItem(`chat_last_read_${activeChannel.id}`, new Date().toISOString())
    setUnreadMap((prev) => ({ ...prev, [activeChannel.id]: 0 }))

    fetchChannelMessages(activeChannel.id).then((res) => {
      if (isMounted && res.data) {
        setMessages(res.data)
        setTimeout(scrollToBottom, 50)
      }
    })

    const unsubscribe = subscribeToChannelMessages(activeChannel.id, () => {
      fetchChannelMessages(activeChannel.id).then((res) => {
        if (isMounted && res.data) {
          setMessages(res.data)
          localStorage.setItem(`chat_last_read_${activeChannel.id}`, new Date().toISOString())
          setUnreadMap((prev) => ({ ...prev, [activeChannel.id]: 0 }))
          setTimeout(scrollToBottom, 50)
        }
      })
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [activeChannel, isOpen])

  // Global realtime incoming message detector for dock & dynamic sorting (Requirement 5)
  useEffect(() => {
    if (!user?.id) return
    const channelName = `floating-chat-incoming-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const newMsg = payload.new as { sender_id: string; channel_id: string; created_at: string }

          // Update latest message timestamp & re-sort channels dynamically
          if (newMsg?.channel_id) {
            setLastMessageMap((prev) => {
              const updated = { ...prev, [newMsg.channel_id]: newMsg.created_at || new Date().toISOString() }
              setChannels((prevCh) => sortChannelsByLatestMessage(prevCh, updated))
              return updated
            })
          }

          if (newMsg.sender_id === user.id) return

          // Play sound (ข้อ 1)
          playChimeRef.current()

          // Requirement 1 & 2: Auto-open floating chat dock & switch to incoming message channel
          setIsOpen(true)
          localStorage.setItem('last_active_chat_channel', newMsg.channel_id)
          setChannels((prevChannels) => {
            const target = prevChannels.find((c) => c.id === newMsg.channel_id)
            if (target) {
              setActiveChannel(target)
            }
            return prevChannels
          })

          // If docked and chatting in this channel, mark as read
          if (isOpenRef.current && activeChannelRef.current?.id === newMsg.channel_id) {
            localStorage.setItem(`chat_last_read_${newMsg.channel_id}`, new Date().toISOString())
            setUnreadMap((prev) => ({ ...prev, [newMsg.channel_id]: 0 }))
          } else {
            // Increment unread count for this specific channel
            setUnreadMap((prev) => ({ ...prev, [newMsg.channel_id]: (prev[newMsg.channel_id] || 0) + 1 }))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = newMessage.trim()
    if (!text || !activeChannel || !user?.id || isSending) return

    setIsSending(true)
    const res = await sendChatMessage(activeChannel.id, user.id, text)
    setIsSending(false)

    if (res.success) {
      setNewMessage('')
      setLastMessageMap((prev) => {
        const updated = { ...prev, [activeChannel.id]: new Date().toISOString() }
        setChannels((prevCh) => sortChannelsByLatestMessage(prevCh, updated))
        return updated
      })
      fetchChannelMessages(activeChannel.id).then((m) => {
        if (m.data) setMessages(m.data)
        setTimeout(scrollToBottom, 50)
      })
    }
  }

  const handleOpenFullChat = () => {
    setIsOpen(false)
    if (activeChannel) {
      navigate(`/chat?channel=${activeChannel.id}`)
    } else {
      navigate('/chat')
    }
  }

  if (isFullChatPage) {
    return null
  }

  return (
    /* Requirement 4: Lower positioning (bottom-5 sm:bottom-6) so it never blocks or overlaps top */
    <div className="fixed bottom-5 sm:bottom-6 right-4 sm:right-6 z-50">
      {/* Floating Window (Expanded) with max height constrained */}
      {isOpen ? (
        <div className="w-[340px] sm:w-[370px] h-[440px] sm:h-[460px] max-h-[calc(100dvh-5rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative">
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-white">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate leading-tight">
                  {activeChannel?.name || 'ห้องสื่อสาร'}
                </p>
                <p className="text-[10px] text-purple-200 truncate">
                  {activeChannel?.user_groups?.name || 'สื่อสารเรียลไทม์'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-purple-100">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? 'ปิดเสียงแจ้งเตือน' : 'เปิดเสียงแจ้งเตือน'}
                className="p-1.5 rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
              >
                {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5 text-purple-300" />}
              </button>

              <button
                onClick={handleOpenFullChat}
                title="เปิดหน้าต่างเต็ม"
                className="p-1.5 rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={() => setIsOpen(false)}
                title="ย่อหน้าต่างแชท"
                className="p-1.5 rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
              >
                <Minimize2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Channel Selector Chips Bar (ข้อ 3) */}
          {channels.length > 1 && (
            <div className="bg-slate-50 border-b border-slate-200 px-3 py-1.5 space-y-1.5">
              {channels.length > 4 && (
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                  <input
                    type="text"
                    value={channelSearch}
                    onChange={(e) => setChannelSearch(e.target.value)}
                    placeholder="ค้นหาห้องสื่อสาร..."
                    className="w-full bg-white border border-slate-200 rounded-lg pl-7 pr-2 py-0.5 text-[10px] text-slate-700 placeholder-slate-400 focus:outline-none focus:border-purple-400"
                  />
                </div>
              )}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {channels
                  .filter((ch) => !channelSearch.trim() || ch.name.toLowerCase().includes(channelSearch.toLowerCase()))
                  .map((ch) => {
                    const isSelected = activeChannel?.id === ch.id
                    const unread = unreadMap[ch.id] || 0
                    return (
                      <button
                        key={ch.id}
                        onClick={() => {
                          setActiveChannel(ch)
                          localStorage.setItem('last_active_chat_channel', ch.id)
                          localStorage.setItem(`chat_last_read_${ch.id}`, new Date().toISOString())
                          setUnreadMap((prev) => ({ ...prev, [ch.id]: 0 }))
                        }}
                        className={`text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition-colors cursor-pointer flex items-center gap-1 shrink-0 ${
                          isSelected
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span>{ch.name}</span>
                        {unread > 0 && !isSelected && (
                          <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                            {unread}
                          </span>
                        )}
                      </button>
                    )
                  })}
              </div>
            </div>
          )}

          {/* Messages Scroll Container (Isolated from window scroll) */}
          <div
            ref={chatScrollContainerRef}
            className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/50 text-xs"
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-8 text-center">
                <MessageSquare className="h-8 w-8 text-slate-300 mb-2" />
                <p className="font-medium text-slate-500">ยังไม่มีข้อความในห้องนี้</p>
                <p className="text-[11px] text-slate-400">ทักทายคุณครูและเพื่อนร่วมงานได้เลย</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.sender_id === user?.id
                const senderName = formatChatDisplayName(msg.profiles?.name, msg.profiles?.role)
                const avatar = getAvatarUrl(msg.profiles?.avatar_url, senderName)
                const timeStr = new Date(msg.created_at).toLocaleTimeString('th-TH', {
                  hour: '2-digit',
                  minute: '2-digit',
                })

                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isMe && (
                      <div className="relative shrink-0 mb-0.5">
                        <img
                          src={avatar}
                          alt={senderName}
                          className="h-6 w-6 rounded-full border border-slate-200 bg-white object-cover"
                        />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-1 ring-white ${
                            isUserOnline(msg.sender_id) ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                          title={isUserOnline(msg.sender_id) ? 'ออนไลน์' : 'ออฟไลน์'}
                        />
                      </div>
                    )}
                    <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                      {!isMe && (
                        <p className="text-[10px] text-slate-500 font-semibold mb-0.5 pl-1">
                          {senderName}
                        </p>
                      )}
                      <div
                        className={`rounded-2xl px-3 py-1.5 break-words ${
                          isMe
                            ? 'bg-purple-600 text-white rounded-br-xs shadow-xs'
                            : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs shadow-xs'
                        }`}
                      >
                        <p className="leading-relaxed">{msg.content}</p>
                      </div>
                      <p className={`text-[9px] text-slate-400 mt-0.5 ${isMe ? 'text-right pr-1' : 'pl-1'}`}>
                        {timeStr}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer: Input Form or Read-Only Notice */}
          {activeChannel?.type === 'announcement' && !isAdmin ? (
            <div className="p-2.5 bg-white border-t border-slate-200">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-center text-[11px] text-amber-700 font-medium">
                📢 ห้องนี้สำหรับอ่านประกาศเท่านั้น
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSendMessage}
              className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-1.5"
            >
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="พิมพ์ข้อความ..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
              />
              <button
                type="submit"
                disabled={isSending || !newMessage.trim()}
                className="h-8 w-8 rounded-xl bg-purple-600 text-white flex items-center justify-center hover:bg-purple-700 disabled:opacity-40 transition-colors cursor-pointer shrink-0"
              >
                {isSending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </button>
            </form>
          )}
        </div>
      ) : (
        /* Floating Launcher Pill/Button (Collapsed) - Classic Facebook Style */
        <button
          onClick={() => {
            setIsOpen(true)
            if (activeChannel) {
              localStorage.setItem(`chat_last_read_${activeChannel.id}`, new Date().toISOString())
              setUnreadMap((prev) => ({ ...prev, [activeChannel.id]: 0 }))
            }
          }}
          className="group flex items-center gap-2.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white pl-3.5 pr-4 py-2.5 shadow-xl shadow-purple-600/30 hover:from-purple-500 hover:to-indigo-500 transition-all cursor-pointer border-2 border-white hover:scale-105"
          title="เปิดห้องสื่อสาร"
        >
          <div className="relative">
            <MessageSquare className="h-5 w-5 text-white" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>
          </div>

          <span className="text-xs font-bold tracking-tight">
            ห้องสื่อสาร
          </span>

          {totalUnreadCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-xs">
              {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
            </span>
          )}
        </button>
      )}
    </div>
  )
}
