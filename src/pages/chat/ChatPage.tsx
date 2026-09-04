import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  MessageSquare,
  Send,
  Users,
  Megaphone,
  FolderTree,
  Loader2,
  Shield,
  Clock,
  Sparkles,
  Bell,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import {
  fetchAccessibleChannels,
  fetchChannelMessages,
  sendChatMessage,
  subscribeToChannelMessages,
  type ChatChannelWithGroup,
  type ChatMessageWithSender,
} from '@/services/chatService'
import { supabase } from '@/services/supabase'

export const ChatPage: React.FC = () => {
  const { user, isAdmin } = useAuth()
  const [searchParams] = useSearchParams()
  const targetChannelId = searchParams.get('channel')

  const [channels, setChannels] = useState<ChatChannelWithGroup[]>([])
  const [activeChannel, setActiveChannel] = useState<ChatChannelWithGroup | null>(null)
  const [messages, setMessages] = useState<ChatMessageWithSender[]>([])
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({})
  const [isLoadingChannels, setIsLoadingChannels] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Mark channel as read
  const markChannelAsRead = useCallback((channelId: string) => {
    localStorage.setItem(`chat_last_read_${channelId}`, new Date().toISOString())
    setUnreadMap((prev) => ({ ...prev, [channelId]: 0 }))
  }, [])

  // Check unread count for channels
  const checkUnreads = useCallback(async (channelList: ChatChannelWithGroup[]) => {
    const unreads: Record<string, number> = {}

    for (const ch of channelList) {
      const lastRead = localStorage.getItem(`chat_last_read_${ch.id}`)
      let query = supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('channel_id', ch.id)

      if (lastRead) {
        query = query.gt('created_at', lastRead)
      }

      const { count } = await query
      unreads[ch.id] = count || 0
    }

    setUnreadMap(unreads)
  }, [])

  // Load channels on mount
  useEffect(() => {
    let isMounted = true
    fetchAccessibleChannels().then((res) => {
      if (isMounted && res.data && res.data.length > 0) {
        setChannels(res.data)

        // Select target channel from query or first channel
        const matched = targetChannelId
          ? res.data.find((c) => c.id === targetChannelId)
          : null
        const initial = matched || res.data[0]

        setActiveChannel(initial)
        markChannelAsRead(initial.id)
        checkUnreads(res.data)
      }
      if (isMounted) setIsLoadingChannels(false)
    })

    return () => {
      isMounted = false
    }
  }, [targetChannelId, checkUnreads, markChannelAsRead])

  // Load messages whenever activeChannel changes
  const loadMessages = useCallback((channelId: string) => {
    setIsLoadingMessages(true)
    fetchChannelMessages(channelId).then((res) => {
      if (res.data) {
        setMessages(res.data)
      }
      setIsLoadingMessages(false)
      setTimeout(scrollToBottom, 100)
    })
  }, [])

  useEffect(() => {
    if (!activeChannel) return
    let isMounted = true

    markChannelAsRead(activeChannel.id)

    fetchChannelMessages(activeChannel.id).then((res) => {
      if (isMounted) {
        if (res.data) {
          setMessages(res.data)
        }
        setIsLoadingMessages(false)
        setTimeout(scrollToBottom, 100)
      }
    })

    // Subscribe to realtime messages in activeChannel
    const unsubscribe = subscribeToChannelMessages(activeChannel.id, () => {
      fetchChannelMessages(activeChannel.id).then((res) => {
        if (isMounted && res.data) {
          setMessages(res.data)
          markChannelAsRead(activeChannel.id)
          setTimeout(scrollToBottom, 100)
        }
      })
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [activeChannel, markChannelAsRead])

  // Listen to all channels for unread counter updates
  useEffect(() => {
    const channelListener = supabase
      .channel('chat-sidebar-unread-listener')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const inserted = payload.new as { channel_id: string; sender_id: string }
          if (inserted.sender_id === user?.id) return

          // If current channel is active, don't increment
          if (activeChannel && activeChannel.id === inserted.channel_id) {
            markChannelAsRead(activeChannel.id)
            return
          }

          setUnreadMap((prev) => ({
            ...prev,
            [inserted.channel_id]: (prev[inserted.channel_id] || 0) + 1,
          }))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channelListener)
    }
  }, [user?.id, activeChannel, markChannelAsRead])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id || !activeChannel || !newMessage.trim() || isSending) return

    const content = newMessage.trim()
    setNewMessage('')
    setIsSending(true)

    const res = await sendChatMessage(activeChannel.id, user.id, content)
    setIsSending(false)

    if (res.success) {
      loadMessages(activeChannel.id)
      markChannelAsRead(activeChannel.id)
    } else {
      alert(res.error || 'ไม่สามารถส่งข้อความได้')
    }
  }

  const renderChannelIcon = (type: string) => {
    switch (type) {
      case 'general':
        return <Users className="h-4 w-4 text-blue-600" />
      case 'announcement':
        return <Megaphone className="h-4 w-4 text-purple-600" />
      case 'group':
        return <FolderTree className="h-4 w-4 text-emerald-600" />
      default:
        return <MessageSquare className="h-4 w-4 text-slate-500" />
    }
  }

  const isAnnouncementChannel = activeChannel?.type === 'announcement'
  const canPostInActiveChannel = !isAnnouncementChannel || isAdmin

  return (
    <div className="flex h-[calc(100vh-9.5rem)] flex-col md:flex-row rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* Channels Sidebar */}
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/70 flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">ห้องสื่อสารภายใน</h2>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200">
            {channels.length} ห้อง
          </span>
        </div>

        {/* Channel List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoadingChannels ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            </div>
          ) : (
            channels.map((ch) => {
              const isActive = activeChannel?.id === ch.id
              const unreadCount = unreadMap[ch.id] || 0

              return (
                <button
                  key={ch.id}
                  onClick={() => {
                    setActiveChannel(ch)
                    markChannelAsRead(ch.id)
                  }}
                  className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs text-left transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 text-blue-900 border border-blue-200 font-semibold shadow-2xs'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900 border border-transparent'
                  }`}
                >
                  <div className="shrink-0">{renderChannelIcon(ch.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-semibold truncate">{ch.name}</p>
                      {unreadCount > 0 && (
                        <span className="shrink-0 inline-flex items-center gap-0.5 rounded-full bg-red-600 text-white font-bold px-2 py-0.2 text-[10px] animate-pulse">
                          <Bell className="h-2.5 w-2.5" />
                          <span>{unreadCount > 9 ? '9+' : unreadCount}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">
                      {ch.type === 'general'
                        ? 'สื่อสารทั่วไปทุกคน'
                        : ch.type === 'announcement'
                        ? 'ประกาศจากฝ่ายบริหาร'
                        : ch.user_groups?.name || 'ห้องกลุ่มสาระฯ'}
                    </p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-50/30">
        {/* Channel Header */}
        {activeChannel ? (
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 bg-white">
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-slate-100 p-2 border border-slate-200">
                {renderChannelIcon(activeChannel.type)}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>{activeChannel.name}</span>
                  {activeChannel.type === 'announcement' && (
                    <span className="rounded bg-purple-100 border border-purple-200 text-purple-700 px-2 py-0.2 text-[10px] font-semibold">
                      เฉพาะแอดมินโพสต์
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {activeChannel.type === 'general' && 'พื้นที่แลกเปลี่ยนและประสานงานระหว่างคณะครูและบุคลากร'}
                  {activeChannel.type === 'announcement' && 'แจ้งข่าวสารสำคัญและนโยบายจากผู้บริหาร'}
                  {activeChannel.type === 'group' && `พื้นที่สนทนาเฉพาะกลุ่มสาระการเรียนรู้ ${activeChannel.user_groups?.name || ''}`}
                </p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 font-medium">
              <Sparkles className="h-3 w-3 text-emerald-600" />
              <span>Realtime Sync</span>
            </div>
          </div>
        ) : (
          <div className="border-b border-slate-200 p-4 text-xs text-slate-500 bg-white">
            กรุณาเลือกห้องสนทนา
          </div>
        )}

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {isLoadingMessages ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600 mb-2" />
              <span>กำลังโหลดข้อความ...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 text-xs py-12">
              <MessageSquare className="h-10 w-10 text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">ยังไม่มีข้อความในห้องนี้</p>
              <p className="text-slate-500 mt-0.5">เริ่มพิมพ์ข้อความเพื่อสนทนากับเพื่อนครูได้ทันที</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === user?.id
              const sender = msg.profiles

              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Sender Avatar */}
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isMe
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-slate-700 border border-slate-200 shadow-2xs'
                    }`}
                  >
                    {sender?.name ? sender.name.charAt(0) : '?'}
                  </div>

                  {/* Message Bubble Container */}
                  <div className={`flex flex-col max-w-[75%] sm:max-w-[65%] ${isMe ? 'items-end' : 'items-start'}`}>
                    {/* Sender Name / Group */}
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-1 px-1">
                      <span className="font-medium text-slate-700">
                        {isMe ? 'ฉัน' : sender?.name || 'คุณครู'}
                      </span>
                      {sender?.role === 'admin' && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-purple-100 text-purple-700 px-1.5 py-0.2 text-[9px] font-semibold border border-purple-200">
                          <Shield className="h-2.5 w-2.5" /> แอดมิน
                        </span>
                      )}
                      {sender?.user_groups?.name && (
                        <span className="text-[10px] text-slate-400">
                          • {sender.user_groups.name}
                        </span>
                      )}
                    </div>

                    {/* Bubble */}
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                        isMe
                          ? 'bg-blue-600 text-white rounded-tr-xs shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-900 rounded-tl-xs shadow-2xs'
                      }`}
                    >
                      {msg.content}
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1 px-1">
                      <Clock className="h-2.5 w-2.5" />
                      <span>
                        {new Date(msg.created_at).toLocaleTimeString('th-TH', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-white">
          {canPostInActiveChannel ? (
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={`ส่งข้อความใน ${activeChannel?.name || 'ห้องนี้'}...`}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || isSending}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm hover:bg-blue-700 disabled:opacity-40 transition-colors cursor-pointer shrink-0"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </form>
          ) : (
            <div className="rounded-xl border border-purple-200 bg-purple-50 p-2.5 text-center text-xs text-purple-700 font-medium">
              ห้องนี้สงวนสิทธิ์ให้เฉพาะฝ่ายบริหารโพสต์ประกาศเท่านั้น
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
