import React, { useState, useEffect, useRef, useCallback } from 'react'
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

export const ChatPage: React.FC = () => {
  const { user, isAdmin } = useAuth()

  const [channels, setChannels] = useState<ChatChannelWithGroup[]>([])
  const [activeChannel, setActiveChannel] = useState<ChatChannelWithGroup | null>(null)
  const [messages, setMessages] = useState<ChatMessageWithSender[]>([])
  const [isLoadingChannels, setIsLoadingChannels] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Load channels on mount
  useEffect(() => {
    let isMounted = true
    fetchAccessibleChannels().then((res) => {
      if (isMounted) {
        if (res.data && res.data.length > 0) {
          setChannels(res.data)
          setActiveChannel(res.data[0])
        }
        setIsLoadingChannels(false)
      }
    })
    return () => {
      isMounted = false
    }
  }, [])

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
          setTimeout(scrollToBottom, 100)
        }
      })
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [activeChannel])

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
    } else {
      alert(res.error || 'ไม่สามารถส่งข้อความได้')
    }
  }

  const renderChannelIcon = (type: string) => {
    switch (type) {
      case 'general':
        return <Users className="h-4 w-4 text-blue-400" />
      case 'announcement':
        return <Megaphone className="h-4 w-4 text-purple-400" />
      case 'group':
        return <FolderTree className="h-4 w-4 text-emerald-400" />
      default:
        return <MessageSquare className="h-4 w-4 text-slate-400" />
    }
  }

  const isAnnouncementChannel = activeChannel?.type === 'announcement'
  const canPostInActiveChannel = !isAnnouncementChannel || isAdmin

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col md:flex-row rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur overflow-hidden shadow-2xl">
      {/* Channels Sidebar */}
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-950/60 flex flex-col">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-400" />
            <h2 className="text-sm font-bold text-white">ห้องสื่อสารภายใน</h2>
          </div>
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
            {channels.length} ห้อง
          </span>
        </div>

        {/* Channel List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoadingChannels ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            </div>
          ) : (
            channels.map((ch) => {
              const isActive = activeChannel?.id === ch.id

              return (
                <button
                  key={ch.id}
                  onClick={() => setActiveChannel(ch)}
                  className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs text-left transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-blue-600/20 text-white border border-blue-500/30'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
                >
                  <div className="shrink-0">{renderChannelIcon(ch.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{ch.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">
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
      <div className="flex-1 flex flex-col bg-slate-950/30">
        {/* Channel Header */}
        {activeChannel ? (
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5 bg-slate-900/40">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-slate-800 p-2">
                {renderChannelIcon(activeChannel.type)}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{activeChannel.name}</span>
                  {activeChannel.type === 'announcement' && (
                    <span className="rounded bg-purple-500/10 border border-purple-500/30 text-purple-400 px-2 py-0.2 text-[10px]">
                      เฉพาะแอดมินโพสต์
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {activeChannel.type === 'general' && 'พื้นที่แลกเปลี่ยนและประสานงานระหว่างคณะครูและบุคลากร'}
                  {activeChannel.type === 'announcement' && 'แจ้งข่าวสารสำคัญและนโยบายจากผู้บริหาร'}
                  {activeChannel.type === 'group' && `พื้นที่สนทนาเฉพาะกลุ่มสาระการเรียนรู้ ${activeChannel.user_groups?.name || ''}`}
                </p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
              <Sparkles className="h-3 w-3 text-emerald-400" />
              <span>Realtime Sync</span>
            </div>
          </div>
        ) : (
          <div className="border-b border-slate-800 p-4 text-xs text-slate-400">
            กรุณาเลือกห้องสนทนา
          </div>
        )}

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {isLoadingMessages ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500 mb-2" />
              <span>กำลังโหลดข้อความ...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 text-xs py-12">
              <MessageSquare className="h-10 w-10 text-slate-700 mb-2" />
              <p className="font-medium text-slate-400">ยังไม่มีข้อความในห้องนี้</p>
              <p className="text-slate-600 mt-0.5">เริ่มพิมพ์ข้อความเพื่อสนทนากับเพื่อนครูได้ทันที</p>
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
                        : 'bg-slate-800 text-slate-200 border border-slate-700'
                    }`}
                  >
                    {sender?.name ? sender.name.charAt(0) : '?'}
                  </div>

                  {/* Message Bubble Container */}
                  <div className={`flex flex-col max-w-[75%] sm:max-w-[65%] ${isMe ? 'items-end' : 'items-start'}`}>
                    {/* Sender Name / Group */}
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1 px-1">
                      <span className="font-medium text-slate-300">
                        {isMe ? 'ฉัน' : sender?.name || 'คุณครู'}
                      </span>
                      {sender?.role === 'admin' && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-emerald-500/10 text-emerald-400 px-1.5 py-0.2 text-[9px]">
                          <Shield className="h-2.5 w-2.5" /> แอดมิน
                        </span>
                      )}
                      {sender?.user_groups?.name && (
                        <span className="text-[10px] text-slate-500">
                          • {sender.user_groups.name}
                        </span>
                      )}
                    </div>

                    {/* Bubble */}
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                        isMe
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-xs'
                          : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-xs'
                      }`}
                    >
                      {msg.content}
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1 px-1">
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
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/60">
          {canPostInActiveChannel ? (
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={`ส่งข้อความใน ${activeChannel?.name || 'ห้องนี้'}...`}
                className="flex-1 rounded-xl border border-slate-800 bg-slate-900/90 px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || isSending}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 disabled:opacity-40 transition-colors cursor-pointer shrink-0"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </form>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-2.5 text-center text-xs text-slate-400">
              ห้องนี้สงวนสิทธิ์ให้เฉพาะฝ่ายบริหารโพสต์ประกาศเท่านั้น
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
