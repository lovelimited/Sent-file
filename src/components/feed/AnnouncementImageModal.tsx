import React, { useState, useEffect } from 'react'
import {
  X,
  ExternalLink,
  Shield,
  ThumbsUp,
  MessageCircle,
  Send,
  Loader2,
} from 'lucide-react'
import { getAvatarUrl } from '@/utils/avatarUtils'
import {
  type Announcement,
  type AnnouncementComment,
  fetchAnnouncementComments,
  addAnnouncementComment,
} from '@/services/announcementService'

interface AnnouncementImageModalProps {
  announcement: Announcement
  userId?: string
  onClose: () => void
  onLike: (id: string) => void
  userReaction?: string | null
}

export const AnnouncementImageModal: React.FC<AnnouncementImageModalProps> = ({
  announcement,
  userId,
  onClose,
  onLike,
  userReaction,
}) => {
  const [comments, setComments] = useState<AnnouncementComment[]>([])
  const [isLoadingComments, setIsLoadingComments] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [isSending, setIsSending] = useState(false)

  const author = announcement.profiles
  const avatarUrl = getAvatarUrl(author?.avatar_url || null, author?.name || 'ผู้ดูแลระบบ')

  useEffect(() => {
    let isMounted = true
    fetchAnnouncementComments(announcement.id).then((res) => {
      if (isMounted) {
        if (res.data) setComments(res.data)
        setIsLoadingComments(false)
      }
    })

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      isMounted = false
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [announcement.id, onClose])

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !userId) return

    setIsSending(true)
    const res = await addAnnouncementComment(announcement.id, userId, newComment.trim())
    setIsSending(false)

    if (res.success) {
      setNewComment('')
      const refresh = await fetchAnnouncementComments(announcement.id)
      if (refresh.data) setComments(refresh.data)
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-150">
      {/* Close button (top right) */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 rounded-full bg-slate-800/80 p-2 text-white hover:bg-slate-700 transition-colors cursor-pointer"
        title="ปิด (Esc)"
      >
        <X className="h-6 w-6" />
      </button>

      <div className="flex flex-col lg:flex-row w-full h-full max-h-screen overflow-hidden">
        {/* Left Side: Photo Display */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8 relative bg-black select-none">
          {announcement.image_url ? (
            <img
              src={announcement.image_url}
              alt="ภาพขยายเต็มจอ"
              className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl drop-shadow-2xl"
            />
          ) : (
            <div className="text-slate-400 text-sm">ไม่มีรูปภาพ</div>
          )}

          {/* Open in new tab link */}
          {announcement.image_url && (
            <a
              href={announcement.image_url}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-4 left-4 flex items-center gap-1.5 rounded-lg bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>เปิดภาพขนาดจริง</span>
            </a>
          )}
        </div>

        {/* Right Side: Post & Comments Thread (Facebook style) */}
        <div className="w-full lg:w-[420px] xl:w-[460px] bg-white flex flex-col h-full border-l border-slate-200 shadow-2xl shrink-0">
          {/* Post Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={avatarUrl}
                alt={author?.name || 'Author'}
                className="h-10 w-10 rounded-full border border-emerald-200 object-cover bg-white"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-slate-900">
                    {author?.name || 'ฝ่ายบริหาร'}
                  </span>
                  {author?.role === 'admin' && (
                    <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 text-emerald-700 px-1.5 py-0.5 text-[9px] font-bold border border-emerald-200">
                      <Shield className="h-2.5 w-2.5" /> ผู้ดูแลระบบ
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">{formatDate(announcement.created_at)}</p>
              </div>
            </div>
          </div>

          {/* Scrollable Post Content & Comments */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Post Content */}
            <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
              {announcement.content}
            </div>

            {/* Reaction counts */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span>
                {(announcement.likes_count || 0) > 0 && (
                  <span className="flex items-center gap-1 font-medium text-emerald-700">
                    <span className="bg-emerald-500 text-white rounded-full h-4 w-4 flex items-center justify-center text-[9px]">
                      👍
                    </span>
                    {announcement.likes_count} คนถูกใจ
                  </span>
                )}
              </span>
              <span>{comments.length} ความคิดเห็น</span>
            </div>

            {/* Like & Comment action buttons */}
            <div className="flex items-center gap-2 py-1.5 border-y border-slate-100">
              <button
                onClick={() => onLike(announcement.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  announcement.user_has_liked
                    ? 'text-emerald-700 bg-emerald-50'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ThumbsUp
                  className={`h-4 w-4 ${announcement.user_has_liked ? 'fill-emerald-600' : ''}`}
                />
                <span>
                  {userReaction === 'love'
                    ? '❤️ รักเลย'
                    : userReaction === 'haha'
                    ? '😆 ฮาฮา'
                    : userReaction === 'wow'
                    ? '😮 ว้าว'
                    : userReaction === 'sad'
                    ? '😢 เศร้า'
                    : userReaction === 'angry'
                    ? '😡 โกรธ'
                    : announcement.user_has_liked
                    ? 'ถูกใจแล้ว'
                    : 'ถูกใจ'}
                </span>
              </button>

              <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-50 cursor-default">
                <MessageCircle className="h-4 w-4" />
                <span>ความคิดเห็น</span>
              </button>
            </div>

            {/* Comments Thread */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-700">ความคิดเห็นทั้งหมด ({comments.length})</h4>

              {isLoadingComments ? (
                <div className="py-6 text-center">
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-600 mx-auto" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">ยังไม่มีความคิดเห็น เป็นคนแรกที่แสดงความคิดเห็น</p>
              ) : (
                comments.map((c) => {
                  const cAvatar = getAvatarUrl(
                    c.profiles?.avatar_url || null,
                    c.profiles?.name || 'User'
                  )
                  return (
                    <div key={c.id} className="flex items-start gap-2.5">
                      <img
                        src={cAvatar}
                        alt=""
                        className="h-8 w-8 rounded-full border border-slate-200 object-cover mt-0.5 shrink-0"
                      />
                      <div className="flex-1 rounded-2xl bg-slate-100 px-3.5 py-2">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-xs font-bold text-slate-900">
                            {c.profiles?.name || 'คุณครู'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatDate(c.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-800 leading-relaxed">{c.content}</p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Comment Input Footer */}
          <form onSubmit={handleSendComment} className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="เขียนความคิดเห็น..."
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isSending || !newComment.trim()}
              className="h-8 w-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 disabled:opacity-40 transition-colors cursor-pointer shrink-0"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
