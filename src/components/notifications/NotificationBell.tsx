import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Clock,
  ClipboardList,
  AlertCircle,
  Megaphone,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import type { AppNotification } from '@/types/index'
import {
  fetchUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  subscribeToUserNotifications,
} from '@/services/notificationService'

export const NotificationBell: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [visibleLimit, setVisibleLimit] = useState(6)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  // Load initial notifications
  const loadNotifications = useCallback(() => {
    if (!user?.id) return
    fetchUserNotifications(user.id).then((res) => {
      if (res.data) {
        setNotifications(res.data)
      }
    })
  }, [user])

  useEffect(() => {
    let isMounted = true
    if (user?.id) {
      fetchUserNotifications(user.id).then((res) => {
        if (isMounted && res.data) {
          setNotifications(res.data)
        }
      })

      // Realtime subscription
      const unsubscribe = subscribeToUserNotifications(user.id, (newNotif) => {
        if (isMounted) {
          setNotifications((prev) => [newNotif, ...prev])
        }
      })

      return () => {
        isMounted = false
        unsubscribe()
      }
    }
  }, [user?.id])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.read) {
      await markNotificationAsRead(notif.id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      )
    }
    setIsOpen(false)
    if (notif.link) {
      navigate(notif.link)
    }
  }

  const handleMarkAllRead = async () => {
    if (!user?.id) return
    await markAllNotificationsAsRead(user.id)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const renderIcon = (type: string) => {
    switch (type) {
      case 'task_assigned':
        return <ClipboardList className="h-4 w-4 text-blue-400" />
      case 'task_reviewed':
        return <CheckCircle2 className="h-4 w-4 text-emerald-400" />
      case 'announcement':
        return <Megaphone className="h-4 w-4 text-purple-400" />
      default:
        return <AlertCircle className="h-4 w-4 text-slate-400" />
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button - Pure Black (ข้อ 6) */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        title="การแจ้งเตือน"
        aria-label="การแจ้งเตือน"
        className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-black border border-black text-white hover:bg-neutral-800 transition-colors cursor-pointer shadow-xs"
      >
        <Bell className="h-4 w-4 text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-slate-950">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-800 bg-slate-900/95 backdrop-blur-md shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 bg-slate-950/50">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">การแจ้งเตือน</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-blue-500/20 text-blue-400 px-2 py-0.2 text-[10px] font-semibold">
                  {unreadCount} ใหม่
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-blue-400 transition-colors cursor-pointer"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>อ่านทั้งหมด</span>
              </button>
            )}
          </div>

          {/* List: Shows in batches of 6 (ข้อ 6) */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-800/60">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <Bell className="h-8 w-8 text-slate-700 mx-auto mb-2" />
                <p>ยังไม่มีการแจ้งเตือน</p>
              </div>
            ) : (
              notifications.slice(0, visibleLimit).map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`flex items-start gap-3 p-3.5 transition-colors cursor-pointer ${
                    notif.read ? 'hover:bg-slate-800/40 opacity-75' : 'bg-blue-500/5 hover:bg-blue-500/10'
                  }`}
                >
                  <div className="mt-0.5 shrink-0 rounded-lg bg-slate-800 p-2">
                    {renderIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-semibold text-white truncate">{notif.title}</p>
                      {!notif.read && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500"></span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(notif.created_at).toLocaleString('th-TH')}</span>
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Load More Button: View previous notifications in batches of 6 (ข้อ 6) */}
            {notifications.length > visibleLimit && (
              <div className="p-2.5 text-center bg-slate-950/50">
                <button
                  type="button"
                  onClick={() => setVisibleLimit((prev) => prev + 6)}
                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer border border-slate-700"
                >
                  ดูการแจ้งเตือนก่อนหน้า (+6 รายการ) • เหลืออีก {notifications.length - visibleLimit}
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-800 bg-slate-950/40 px-4 py-2 text-center">
            <button
              onClick={() => {
                setIsOpen(false)
                loadNotifications()
              }}
              className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
            >
              รีเฟรชการแจ้งเตือน
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
