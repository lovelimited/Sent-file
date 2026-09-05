import React, { useState, useEffect } from 'react'
import { Star, X, Loader2, Award, MessageSquare, Clock } from 'lucide-react'
import { rateTeacher, fetchTeacherRatings, type TeacherRating } from '@/services/ratingService'
import { getAvatarUrl } from '@/utils/avatarUtils'
import { showToast } from '@/utils/sweetalert'

interface TeacherRatingModalProps {
  teacher: {
    id: string
    name: string
    username: string
    avatar_url?: string | null
  }
  adminId: string
  onClose: () => void
  onRated?: () => void
}

const STAR_LABELS: Record<number, string> = {
  1: 'ต้องปรับปรุง (Needs Improvement)',
  2: 'พอใช้ (Fair)',
  3: 'ดี (Good)',
  4: 'ดีมาก (Very Good)',
  5: 'ยอดเยี่ยม ดีเด่น (Excellent) 🌟',
}

const CATEGORIES = [
  'การส่งงานตรงเวลาและครบถ้วน',
  'ความรับผิดชอบและวินัยในหน้าที่',
  'ผลงานและการสอนดีเด่น',
  'การมีส่วนร่วมในกิจกรรมโรงเรียน',
  'การประเมินทั่วไป',
]

export const TeacherRatingModal: React.FC<TeacherRatingModalProps> = ({
  teacher,
  adminId,
  onClose,
  onRated,
}) => {
  const [stars, setStars] = useState<number>(5)
  const [hoverStars, setHoverStars] = useState<number>(0)
  const [category, setCategory] = useState<string>(CATEGORIES[0])
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [history, setHistory] = useState<TeacherRating[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)

  useEffect(() => {
    let isMounted = true
    fetchTeacherRatings(teacher.id).then((res) => {
      if (isMounted) {
        if (res.data) setHistory(res.data)
        setIsLoadingHistory(false)
      }
    })
    return () => {
      isMounted = false
    }
  }, [teacher.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const res = await rateTeacher(teacher.id, adminId, stars, comment, category)
    setIsSubmitting(false)

    if (res.success) {
      showToast(`ให้ ${stars} ดาวแก่ ${teacher.name} เรียบร้อยแล้ว`, 'success')
      if (onRated) onRated()
      onClose()
    } else {
      showToast(res.error || 'เกิดข้อผิดพลาดในการบันทึกคะแนน', 'error')
    }
  }

  const activeStars = hoverStars || stars

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">ให้คะแนนดาวและชื่นชมคุณครู</h2>
              <p className="text-xs text-slate-500">สำหรับฝ่ายบริหารและผู้ดูแลระบบ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 cursor-pointer p-1 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto pr-1 flex-1 space-y-5">
          {/* Teacher Profile Card */}
          <div className="flex items-center gap-3.5 rounded-xl border border-amber-200/80 bg-amber-50/40 p-3.5">
            <img
              src={getAvatarUrl(teacher.avatar_url || null, teacher.name)}
              alt={teacher.name}
              className="h-12 w-12 rounded-full object-cover border-2 border-amber-300 bg-white"
            />
            <div>
              <h3 className="text-sm font-bold text-slate-900">{teacher.name}</h3>
              <p className="text-xs text-slate-500">@{teacher.username}</p>
            </div>
          </div>

          <form id="rating-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Star Rating Selection */}
            <div className="text-center py-2 bg-slate-50 rounded-2xl border border-slate-200/80">
              <label className="block text-xs font-semibold text-slate-600 mb-2">
                เลือกระดับคะแนนดาว (คลิกที่ดาว)
              </label>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStars(s)}
                    onMouseEnter={() => setHoverStars(s)}
                    onMouseLeave={() => setHoverStars(0)}
                    className="p-1 transition-transform hover:scale-125 cursor-pointer focus:outline-none"
                  >
                    <Star
                      className={`h-8 w-8 transition-colors ${
                        s <= activeStars
                          ? 'text-amber-400 fill-amber-400 drop-shadow-xs'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs font-bold text-amber-800">
                {STAR_LABELS[activeStars] || ''}
              </p>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ด้านที่ประเมิน / ชื่นชม
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:bg-white focus:border-amber-500 focus:outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Comment */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                คำชื่นชม หรือ ข้อคิดเห็นเพิ่มเติม
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="เช่น ส่งงานตรงเวลา ละเอียดรอบคอบ และมีส่วนร่วมกับกิจกรรมโรงเรียนอย่างดีเยี่ยม..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-amber-500 focus:outline-none resize-none"
              />
            </div>
          </form>

          {/* Previous Ratings History */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>ประวัติการได้รับดาวที่ผ่านมา ({history.length} ครั้ง)</span>
            </h4>

            {isLoadingHistory ? (
              <div className="py-4 text-center">
                <Loader2 className="h-4 w-4 animate-spin text-amber-500 mx-auto" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-2">ยังไม่มีประวัติการได้รับดาว</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {history.map((h) => (
                  <div key={h.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1 text-amber-500 font-bold">
                        {Array.from({ length: h.stars }).map((_, i) => (
                          <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        ))}
                        <span className="text-[11px] text-slate-600 ml-1">({h.stars} ดาว)</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(h.created_at).toLocaleDateString('th-TH')}
                      </span>
                    </div>
                    {h.category && (
                      <span className="inline-block text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 mb-1">
                        {h.category}
                      </span>
                    )}
                    {h.comment && (
                      <p className="text-slate-700 text-[11px] flex items-start gap-1">
                        <MessageSquare className="h-3 w-3 text-slate-400 shrink-0 mt-0.5" />
                        <span>{h.comment}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            form="rating-form"
            disabled={isSubmitting}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-5 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-50 transition-colors cursor-pointer"
          >
            {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Star className="h-3.5 w-3.5 fill-white" />}
            <span>บันทึกการให้ดาว</span>
          </button>
        </div>
      </div>
    </div>
  )
}
