import { supabase } from './supabase'
import type { AppNotification, NotificationType } from '@/types/index'

export interface CreateNotificationPayload {
  recipient_id: string
  title: string
  message: string
  type: NotificationType
  link?: string | null
}

/**
 * Fetch notifications for current user
 */
export async function fetchUserNotifications(
  userId: string
): Promise<{ data: AppNotification[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) {
      return { data: null, error: error.message }
    }

    return { data: data as AppNotification[], error: null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch notifications'
    return { data: null, error: message }
  }
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update notification'
    return { success: false, error: message }
  }
}

/**
 * Mark all notifications as read for current user
 */
export async function markAllNotificationsAsRead(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('recipient_id', userId)
      .eq('read', false)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update notifications'
    return { success: false, error: message }
  }
}

/**
 * Send a notification to a recipient
 */
export async function sendNotification(
  payload: CreateNotificationPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('notifications').insert({
      recipient_id: payload.recipient_id,
      title: payload.title.trim(),
      message: payload.message.trim(),
      type: payload.type,
      link: payload.link || null,
      read: false,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send notification'
    return { success: false, error: message }
  }
}

/**
 * Batch send notifications to multiple recipients
 */
export async function sendBatchNotifications(
  recipientIds: string[],
  title: string,
  message: string,
  type: NotificationType,
  link?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (recipientIds.length === 0) return { success: true }

    const records = recipientIds.map((id) => ({
      recipient_id: id,
      title: title.trim(),
      message: message.trim(),
      type,
      link: link || null,
      read: false,
    }))

    const { error } = await supabase.from('notifications').insert(records)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send batch notifications'
    return { success: false, error: message }
  }
}

/**
 * Realtime subscription for incoming notifications
 */
export function subscribeToUserNotifications(
  userId: string,
  onNewNotification: (notif: AppNotification) => void
) {
  const channelName = `user-notifications-${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new) {
          onNewNotification(payload.new as AppNotification)
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
