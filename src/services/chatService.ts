import { supabase } from './supabase'
import type { ChatChannel, ChatMessage, UserRole } from '@/types/index'

export interface ChatChannelWithGroup extends ChatChannel {
  user_groups?: { name: string } | null
}

export interface ChatMessageWithSender extends ChatMessage {
  profiles?: {
    id: string
    name: string
    username: string
    avatar_url: string | null
    role: UserRole
    user_groups?: { name: string } | null
  } | null
}

/**
 * Fetch all chat channels accessible by current user
 */
export async function fetchAccessibleChannels(): Promise<{
  data: ChatChannelWithGroup[] | null
  error: string | null
}> {
  try {
    const { data, error } = await supabase
      .from('chat_channels')
      .select('*, user_groups(name)')
      .neq('type', 'announcement')
      .order('type', { ascending: false })
      .order('name', { ascending: true })

    if (error) {
      return { data: null, error: error.message }
    }

    return { data: data as ChatChannelWithGroup[], error: null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch channels'
    return { data: null, error: message }
  }
}

/**
 * Fetch recent messages for a channel
 */
export async function fetchChannelMessages(
  channelId: string
): Promise<{ data: ChatMessageWithSender[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*, profiles(id, name, username, avatar_url, role, user_groups(name))')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })
      .limit(100)

    if (error) {
      return { data: null, error: error.message }
    }

    return { data: (data as unknown) as ChatMessageWithSender[], error: null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch messages'
    return { data: null, error: message }
  }
}

/**
 * Send message to a channel
 */
export async function sendChatMessage(
  channelId: string,
  senderId: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanContent = content.trim()
    if (!cleanContent) {
      return { success: false, error: 'กรุณากรอกข้อความ' }
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        channel_id: channelId,
        sender_id: senderId,
        content: cleanContent,
      })
      .select('id')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    // Log action
    if (data) {
      await supabase.from('activity_logs').insert({
        user_id: senderId,
        action: 'send_message',
        target_type: 'chat_message',
        target_id: data.id,
        details: { channel_id: channelId },
      })
    }

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send message'
    return { success: false, error: message }
  }
}

/**
 * Subscribe to realtime messages in a channel
 */
export function subscribeToChannelMessages(
  channelId: string,
  onNewMessage: (msg: ChatMessage) => void
) {
  const channel = supabase
    .channel(`chat-room-${channelId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `channel_id=eq.${channelId}`,
      },
      (payload) => {
        if (payload.new) {
          onNewMessage(payload.new as ChatMessage)
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Fetch latest message timestamps for all channels (Requirement 5)
 */
export async function fetchChannelsLastMessageTimes(): Promise<Record<string, string>> {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('channel_id, created_at')
      .order('created_at', { ascending: false })
      .limit(300)

    if (error || !data) return {}

    const map: Record<string, string> = {}
    for (const msg of data) {
      if (!map[msg.channel_id]) {
        map[msg.channel_id] = msg.created_at
      }
    }
    return map
  } catch {
    return {}
  }
}

/**
 * Sort channels: School general room pinned at top, followed by latest active channels (Requirement 5)
 */
export function sortChannelsByLatestMessage(
  channels: ChatChannelWithGroup[],
  lastMessageMap: Record<string, string>
): ChatChannelWithGroup[] {
  return [...channels].sort((a, b) => {
    // 1. General room always pinned at top (#1)
    const isAGeneral = a.id === '00000000-0000-0000-0000-000000000001' || a.type === 'general'
    const isBGeneral = b.id === '00000000-0000-0000-0000-000000000001' || b.type === 'general'
    if (isAGeneral && !isBGeneral) return -1
    if (!isAGeneral && isBGeneral) return 1

    // 2. Latest chat message first
    const timeA = lastMessageMap[a.id] ? new Date(lastMessageMap[a.id]).getTime() : 0
    const timeB = lastMessageMap[b.id] ? new Date(lastMessageMap[b.id]).getTime() : 0
    if (timeA !== timeB) return timeB - timeA

    // 3. Fallback name sorting
    return a.name.localeCompare(b.name, 'th')
  })
}

