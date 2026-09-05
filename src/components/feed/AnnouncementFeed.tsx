import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Megaphone,
  ThumbsUp,
  MessageCircle,
  Send,
  Trash2,
  Loader2,
  ImagePlus,
  Shield,
  X,
  Upload,
  Maximize2,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/services/supabase'
import {
  fetchAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  toggleAnnouncementReaction,
  fetchAnnouncementComments,
  addAnnouncementComment,
  type Announcement,
  type AnnouncementComment,
  type ReactionType,
  REACTION_CONFIG,
} from '@/services/announcementService'
import { getAvatarUrl } from '@/utils/avatarUtils'
import { AnnouncementImageModal } from './AnnouncementImageModal'
import { showConfirm, showToast, showError } from '@/utils/sweetalert'

interface AnnouncementFeedProps {
  /** Show only N latest items (for homepage embed). Set 0 for full page. */
  previewCount?: number
}

const REACTIONS_LIST: ReactionType[] = ['like', 'love', 'haha', 'wow', 'sad', 'angry']

export const AnnouncementFeed: React.FC<AnnouncementFeedProps> = ({ previewCount = 0 }) => {
  const { user, isAdmin } = useAuth()

  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Create form
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [newImageUrl, setNewImageUrl] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const imageFileInputRef = useRef<HTMLInputElement>(null)

  // Comments state
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({})
  const [commentsMap, setCommentsMap] = useState<Record<string, AnnouncementComment[]>>({})
  const [commentInputMap, setCommentInputMap] = useState<Record<string, string>>({})
  const [sendingComment, setSendingComment] = useState<string | null>(null)

  // Lightbox Modal state (ข้อ 3)
  const [lightboxAnnouncement, setLightboxAnnouncement] = useState<Announcement | null>(null)

  // Reaction Bar hover / long-press state (ข้อ 8)
  const [activeReactionPopupId, setActiveReactionPopupId] = useState<string | null>(null)
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return

    setIsUploadingImage(true)
    try {
      const fileExt = file.name.split('.').pop() || 'jpg'
      const filePath = `announcements/${Date.now()}_${user.id}.${fileExt}`
      const { error: uploadErr } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true })
      if (uploadErr) {
        setCreateError(`อัปโหลดรูปภาพไม่สำเร็จ: ${uploadErr.message}`)
      } else {
        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
        setNewImageUrl(data.publicUrl)
      }
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploadingImage(false)
    }
  }

  const loadAnnouncements = useCallback(async () => {
    setIsLoading(true)
    const res = await fetchAnnouncements(user?.id, previewCount > 0 ? previewCount : 50)
    if (res.data) {
      setAnnouncements(res.data)
    }
    setIsLoading(false)
  }, [user?.id, previewCount])

  useEffect(() => {
    loadAnnouncements()
  }, [loadAnnouncements])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id || !newContent.trim()) return

    // SweetAlert2 Confirmation (ข้อ 6)
    const confirmed = await showConfirm(
      'ยืนยันการโพสต์ประกาศ?',
      'ประกาศนี้จะแสดงในฟีดข่าวสารให้คณะครูและบุคลากรทุกท่านรับทราบ'
    )
    if (!confirmed) return

    setIsCreating(true)
    setCreateError(null)
    const res = await createAnnouncement(user.id, newContent, newImageUrl || null)
    setIsCreating(false)

    if (res.success) {
      setNewContent('')
      setNewImageUrl('')
      setShowCreateForm(false)
      showToast('โพสต์ประกาศข่าวสารเรียบร้อยแล้ว', 'success')
      loadAnnouncements()
    } else {
      setCreateError(res.error || 'เกิดข้อผิดพลาด')
      showError('ไม่สามารถโพสต์ได้', res.error)
    }
  }

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm(
      'ยืนยันการลบประกาศนี้?',
      'ข้อความและรูปภาพในประกาศจะถูกลบออกจากระบบอย่างถาวร',
      'ลบประกาศ',
      'ยกเลิก',
      true
    )
    if (!confirmed) return

    const res = await deleteAnnouncement(id)
    if (res.success) {
      showToast('ลบประกาศเรียบร้อยแล้ว', 'success')
      if (lightboxAnnouncement?.id === id) setLightboxAnnouncement(null)
      loadAnnouncements()
    } else {
      showError('ไม่สามารถลบประกาศได้', res.error)
    }
  }

  // Reaction Handler (ข้อ 8)
  const handleSelectReaction = async (announcementId: string, reactionType: ReactionType) => {
    if (!user?.id) return
    setActiveReactionPopupId(null)

    const res = await toggleAnnouncementReaction(announcementId, user.id, reactionType)
    if (res.success) {
      setAnnouncements((prev) =>
        prev.map((ann) => {
          if (ann.id !== announcementId) return ann

          const oldReaction = ann.user_reaction
          const newReaction = res.reaction
          const newReactionCounts = { ...(ann.reaction_counts || {}) }

          // Decrement old
          if (oldReaction && newReactionCounts[oldReaction]) {
            newReactionCounts[oldReaction] = Math.max(0, newReactionCounts[oldReaction] - 1)
          }
          // Increment new
          if (newReaction) {
            newReactionCounts[newReaction] = (newReactionCounts[newReaction] || 0) + 1
          }

          const totalLikes = Object.values(newReactionCounts).reduce((a, b) => a + b, 0)

          return {
            ...ann,
            user_has_liked: res.liked,
            user_reaction: res.reaction,
            reaction_counts: newReactionCounts,
            likes_count: totalLikes,
          }
        })
      )
    }
  }

  // Quick Like toggle
  const handleQuickLike = (ann: Announcement) => {
    if (ann.user_has_liked && ann.user_reaction) {
      // Toggle off
      handleSelectReaction(ann.id, ann.user_reaction as ReactionType)
    } else {
      // Default to like
      handleSelectReaction(ann.id, 'like')
    }
  }

  // Reaction popup hover listeners
  const handleMouseEnterLike = (annId: string) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    hoverTimeoutRef.current = setTimeout(() => {
      setActiveReactionPopupId(annId)
    }, 250)
  }

  const handleMouseLeaveLike = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    hoverTimeoutRef.current = setTimeout(() => {
      setActiveReactionPopupId(null)
    }, 400)
  }

  // Mobile long-press
  const handleTouchStartLike = (annId: string) => {
    longPressTimerRef.current = setTimeout(() => {
      setActiveReactionPopupId(annId)
    }, 350)
  }

  const handleTouchEndLike = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
  }

  // Load all comments (ข้อ 2)
  const handleLoadAllComments = async (announcementId: string) => {
    setExpandedComments((prev) => ({ ...prev, [announcementId]: true }))
    const res = await fetchAnnouncementComments(announcementId)
    if (res.data) {
      setCommentsMap((prev) => ({ ...prev, [announcementId]: res.data! }))
    }
  }

  const handleAddComment = async (announcementId: string) => {
    const content = commentInputMap[announcementId]?.trim()
    if (!content || !user?.id) return

    setSendingComment(announcementId)
    const res = await addAnnouncementComment(announcementId, user.id, content)
    setSendingComment(null)

    if (res.success) {
      setCommentInputMap((prev) => ({ ...prev, [announcementId]: '' }))
      // Refresh comments
      const commentsRes = await fetchAnnouncementComments(announcementId)
      if (commentsRes.data) {
        setCommentsMap((prev) => ({ ...prev, [announcementId]: commentsRes.data! }))
        setExpandedComments((prev) => ({ ...prev, [announcementId]: true }))
      }
      // Update count
      setAnnouncements((prev) =>
        prev.map((ann) =>
          ann.id === announcementId
            ? { ...ann, comments_count: (ann.comments_count || 0) + 1 }
            : ann
        )
      )
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)

    if (diffMins < 1) return 'เมื่อสักครู่'
    if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`
    return (
      d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) +
      ' ' +
      d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    )
  }

  return (
    /* ข้อ 7: จำกัดความกว้างของฟีดเป็น max-w-2xl mx-auto w-full */
    <div className="max-w-2xl mx-auto w-full space-y-4">
      {/* Create Announcement Button (Admin) */}
      {isAdmin && previewCount === 0 && (
        <div>
          {!showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full flex items-center gap-3 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/60 p-4 text-left hover:border-emerald-400 hover:bg-emerald-50 transition-all cursor-pointer group"
            >
              <div className="rounded-full bg-emerald-600 p-2.5 text-white shadow-sm group-hover:bg-emerald-700 transition-colors">
                <Megaphone className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-800">สร้างประกาศข่าวสารใหม่</p>
                <p className="text-xs text-emerald-600">โพสต์ข่าวสาร ประกาศ คำสั่ง ให้บุคลากรทุกท่านรับทราบ</p>
              </div>
            </button>
          ) : (
            <form onSubmit={handleCreate} className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-emerald-600" />
                  สร้างประกาศข่าวสาร
                </h3>
                <button type="button" onClick={() => setShowCreateForm(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {createError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">{createError}</div>
              )}

              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="เขียนประกาศ ข่าวสาร หรือคำสั่ง..."
                rows={4}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all resize-none"
              />

              <input
                type="file"
                ref={imageFileInputRef}
                onChange={handleImageFileChange}
                accept="image/*"
                className="hidden"
              />

              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <button
                  type="button"
                  onClick={() => imageFileInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
                >
                  {isUploadingImage ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                  ) : (
                    <Upload className="h-3.5 w-3.5 text-emerald-600" />
                  )}
                  <span>{isUploadingImage ? 'กำลังอัปโหลด...' : 'อัปโหลดรูปภาพ'}</span>
                </button>

                <div className="flex-1 flex items-center gap-1.5">
                  <ImagePlus className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <input
                    type="url"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="หรือวาง URL รูปภาพประกอบ (ไม่บังคับ)"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {newImageUrl && (
                <div className="relative inline-block mt-2">
                  <img
                    src={newImageUrl}
                    alt="Preview"
                    className="h-28 rounded-xl object-contain border border-slate-200 bg-slate-900/5"
                  />
                  <button
                    type="button"
                    onClick={() => setNewImageUrl('')}
                    className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow-md hover:bg-red-700 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newContent.trim()}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Megaphone className="h-3.5 w-3.5" />}
                  <span>โพสต์ประกาศ</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Announcements Feed */}
      {announcements.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <Megaphone className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-600">ยังไม่มีประกาศข่าวสาร</p>
          <p className="text-xs text-slate-400 mt-1">ประกาศใหม่จากฝ่ายบริหารจะแสดงที่นี่</p>
        </div>
      ) : (
        announcements.map((ann) => {
          const author = ann.profiles
          const avatarUrl = getAvatarUrl(author?.avatar_url || null, author?.name || 'ผู้ดูแลระบบ')
          const isCommentsExpanded = expandedComments[ann.id]
          const fullCommentsList = commentsMap[ann.id] || []
          const previewComment = ann.latest_comment
          const commentsCount = ann.comments_count || 0
          const userReaction = ann.user_reaction as ReactionType | undefined

          // Reaction summary icons
          const activeReactionTypes = Object.entries(ann.reaction_counts || {})
            .filter(([_, count]) => count > 0)
            .map(([type]) => type as ReactionType)

          return (
            <div
              key={ann.id}
              className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden hover:shadow-sm transition-shadow"
            >
              {/* Header */}
              <div className="p-4 pb-3 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={avatarUrl}
                    alt={author?.name || 'Author'}
                    className="h-10 w-10 rounded-full border-2 border-emerald-200 object-cover bg-white"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-slate-900">{author?.name || 'ฝ่ายบริหาร'}</span>
                      {author?.role === 'admin' && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 text-emerald-700 px-1.5 py-0.5 text-[9px] font-bold border border-emerald-200">
                          <Shield className="h-2.5 w-2.5" /> ผู้ดูแลระบบ
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">{formatDate(ann.created_at)}</p>
                  </div>
                </div>

                {isAdmin && (
                  <button
                    onClick={() => handleDelete(ann.id)}
                    className="text-slate-400 hover:text-red-600 p-1 transition-colors cursor-pointer"
                    title="ลบประกาศ"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="px-4 pb-3">
                <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{ann.content}</p>
              </div>

              {/* Image (ข้อ 3: รูปเต็ม ไม่ถูกครอบตัด + คลิกดูรูปเต็มใน Lightbox) */}
              {ann.image_url && (
                <div className="px-4 pb-3">
                  <div
                    onClick={() => setLightboxAnnouncement(ann)}
                    className="relative rounded-2xl overflow-hidden border border-slate-100 bg-slate-950/5 group cursor-pointer"
                  >
                    <img
                      src={ann.image_url}
                      alt="ภาพประกอบประกาศ"
                      className="w-full max-h-[480px] object-contain mx-auto transition-transform group-hover:scale-[1.01]"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white rounded-full px-3 py-1 text-xs font-semibold flex items-center gap-1.5 shadow-md">
                        <Maximize2 className="h-3.5 w-3.5" />
                        <span>คลิกเพื่อดูรูปเต็ม</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Like / Reaction & Comment Counts */}
              <div className="px-4 pb-2 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  {activeReactionTypes.length > 0 && (
                    <span className="flex items-center -space-x-1 mr-1">
                      {activeReactionTypes.map((t) => (
                        <span key={t} className="text-sm" title={REACTION_CONFIG[t]?.label}>
                          {REACTION_CONFIG[t]?.emoji}
                        </span>
                      ))}
                    </span>
                  )}
                  {(ann.likes_count || 0) > 0 && (
                    <span className="font-medium text-slate-700">
                      {ann.likes_count} คน
                    </span>
                  )}
                </span>
                <span>
                  {commentsCount > 0 && `${commentsCount} ความคิดเห็น`}
                </span>
              </div>

              {/* Action Bar with Reactions Popover (ข้อ 8) */}
              <div className="px-4 py-2 border-t border-slate-100 flex items-center gap-1 relative">
                {/* Floating Reaction Bar */}
                {activeReactionPopupId === ann.id && (
                  <div
                    onMouseEnter={() => {
                      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
                    }}
                    onMouseLeave={handleMouseLeaveLike}
                    className="absolute -top-12 left-4 z-40 bg-white/95 backdrop-blur-md rounded-full px-2.5 py-1.5 shadow-xl border border-slate-200 flex items-center gap-2 animate-in zoom-in-90 duration-150"
                  >
                    {REACTIONS_LIST.map((rType) => {
                      const cfg = REACTION_CONFIG[rType]
                      return (
                        <button
                          key={rType}
                          type="button"
                          onClick={() => handleSelectReaction(ann.id, rType)}
                          className="p-1 hover:scale-135 transition-transform cursor-pointer flex flex-col items-center group/emoji"
                          title={cfg.label}
                        >
                          <span className="text-2xl drop-shadow-xs">{cfg.emoji}</span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Like Button */}
                <div
                  className="flex-1 relative"
                  onMouseEnter={() => handleMouseEnterLike(ann.id)}
                  onMouseLeave={handleMouseLeaveLike}
                  onTouchStart={() => handleTouchStartLike(ann.id)}
                  onTouchEnd={handleTouchEndLike}
                >
                  <button
                    onClick={() => handleQuickLike(ann)}
                    className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      ann.user_has_liked
                        ? userReaction && REACTION_CONFIG[userReaction]
                          ? `${REACTION_CONFIG[userReaction].color} bg-slate-50 font-bold`
                          : 'text-emerald-700 bg-emerald-50'
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {userReaction && REACTION_CONFIG[userReaction] ? (
                      <>
                        <span className="text-base">{REACTION_CONFIG[userReaction].emoji}</span>
                        <span>{REACTION_CONFIG[userReaction].label}</span>
                      </>
                    ) : (
                      <>
                        <ThumbsUp className={`h-4 w-4 ${ann.user_has_liked ? 'fill-emerald-600' : ''}`} />
                        <span>{ann.user_has_liked ? 'ถูกใจแล้ว' : 'ถูกใจ'}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Comment Toggle Button */}
                <button
                  onClick={() => handleLoadAllComments(ann.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>ความคิดเห็น</span>
                </button>
              </div>

              {/* Comments Section (ข้อ 2: แสดง 1 ตัวอย่าง + ปุ่มกดดูความคิดเห็นเพิ่มเติม) */}
              <div className="border-t border-slate-100 bg-slate-50/50 p-3 space-y-2.5">
                {/* 1 Comment Preview (if not expanded and previewComment exists) */}
                {!isCommentsExpanded && previewComment && (
                  <div className="space-y-2">
                    {/* View More comments button */}
                    {commentsCount > 1 && (
                      <button
                        type="button"
                        onClick={() => handleLoadAllComments(ann.id)}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer flex items-center gap-1 mb-1"
                      >
                        <span>ดูความคิดเห็นเพิ่มเติมอีก {commentsCount - 1} รายการ...</span>
                      </button>
                    )}

                    {/* Single latest comment preview */}
                    <div className="flex items-start gap-2">
                      <img
                        src={getAvatarUrl(previewComment.profiles?.avatar_url || null, previewComment.profiles?.name || 'User')}
                        alt=""
                        className="h-7 w-7 rounded-full border border-slate-200 object-cover mt-0.5 shrink-0"
                      />
                      <div className="flex-1 bg-white rounded-xl px-3 py-2 border border-slate-200/80 shadow-2xs">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-xs font-bold text-slate-800">
                            {previewComment.profiles?.name || 'ผู้ใช้'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatDate(previewComment.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed">{previewComment.content}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* If no comments at all */}
                {!isCommentsExpanded && !previewComment && commentsCount === 0 && (
                  <p className="text-xs text-slate-400 text-center py-1">ยังไม่มีความคิดเห็น เป็นคนแรกที่แสดงความคิดเห็น</p>
                )}

                {/* Expanded Full Comments List */}
                {isCommentsExpanded && (
                  <div className="space-y-2">
                    {fullCommentsList.map((comment) => {
                      const cAvatar = getAvatarUrl(
                        comment.profiles?.avatar_url || null,
                        comment.profiles?.name || 'User'
                      )
                      return (
                        <div key={comment.id} className="flex items-start gap-2">
                          <img
                            src={cAvatar}
                            alt=""
                            className="h-7 w-7 rounded-full border border-slate-200 object-cover mt-0.5 shrink-0"
                          />
                          <div className="flex-1 bg-white rounded-xl px-3 py-2 border border-slate-200/80 shadow-2xs">
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <span className="text-xs font-bold text-slate-800">
                                {comment.profiles?.name || 'ผู้ใช้'}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {formatDate(comment.created_at)}
                              </span>
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed">{comment.content}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Always-Visible Comment Input (Facebook style) */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={commentInputMap[ann.id] || ''}
                    onChange={(e) =>
                      setCommentInputMap((prev) => ({ ...prev, [ann.id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleAddComment(ann.id)
                      }
                    }}
                    placeholder="เขียนความคิดเห็น..."
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    onClick={() => handleAddComment(ann.id)}
                    disabled={sendingComment === ann.id || !(commentInputMap[ann.id]?.trim())}
                    className="h-8 w-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 disabled:opacity-40 transition-colors cursor-pointer shrink-0"
                  >
                    {sendingComment === ann.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )
        })
      )}

      {/* Lightbox Modal (ข้อ 3) */}
      {lightboxAnnouncement && (
        <AnnouncementImageModal
          announcement={lightboxAnnouncement}
          userId={user?.id}
          onClose={() => setLightboxAnnouncement(null)}
          onLike={() => handleQuickLike(lightboxAnnouncement)}
          userReaction={lightboxAnnouncement.user_reaction}
        />
      )}
    </div>
  )
}

export default AnnouncementFeed
