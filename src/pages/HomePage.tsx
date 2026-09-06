import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  LogIn,
  Wifi,
  WifiOff,
  Megaphone,
  Upload,
  Clock,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { AnnouncementFeed } from '@/components/feed/AnnouncementFeed'
import { QuickSubmitModal } from '@/components/tasks/QuickSubmitModal'
import { fetchTeacherTasks } from '@/services/taskService'

export const HomePage: React.FC = () => {
  const { isAuthenticated, profile, role, user } = useAuth()
  const { isOnline } = useNetworkStatus()
  const [isQuickSubmitOpen, setIsQuickSubmitOpen] = useState(false)
  const [pendingTaskCount, setPendingTaskCount] = useState<number | null>(null)

  useEffect(() => {
    if (isAuthenticated && user?.id && role !== 'admin') {
      fetchTeacherTasks(user.id).then((res) => {
        if (res.data) {
          const pending = res.data.filter(
            (t) => t.status === 'pending' || t.status === 'in_progress' || t.status === 'rejected'
          ).length
          setPendingTaskCount(pending)
        }
      })
    }
  }, [isAuthenticated, user?.id, role])

  return (
    <div className="space-y-4">
      {/* Welcome Banner - Compact & High Density */}
      <div className="rounded-2xl border border-emerald-100/90 bg-gradient-to-r from-emerald-50/60 via-white to-amber-50/40 p-3.5 sm:p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/school-logo.png"
              alt="School Logo"
              className="h-10 w-10 sm:h-11 sm:w-11 object-contain rounded-full bg-white p-0.5 border border-amber-300 shadow-2xs shrink-0"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 truncate">
                  {isAuthenticated && profile ? (
                    <span>
                      ยินดีต้อนรับ, {profile.name}
                      {profile.nickname ? (
                        <span className="ml-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full border border-emerald-200">
                          {profile.nickname}
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    <span>ระบบบริหารจัดการงานโรงเรียน (School Work Club)</span>
                  )}
                </h1>
                <span className="hidden md:inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50/80 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>สารสาสน์วิเทศราชพฤกษ์</span>
                </span>
              </div>
              <p className="text-slate-500 text-xs mt-0.5 truncate max-w-xl">
                {isAuthenticated && profile ? (
                  <span>
                    สถานะ:{' '}
                    <strong className="text-emerald-700 font-semibold">
                      {role === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : 'คุณครู (Teacher)'}
                    </strong>
                    {profile.user_groups?.name && (
                      <span className="text-slate-600"> • กลุ่มสาระฯ {profile.user_groups.name}</span>
                    )}
                  </span>
                ) : (
                  <span>ศูนย์กลางการจัดการภาระงานเอกสารและข้อมูลโรงเรียนสารสาสน์วิเทศราชพฤกษ์</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <div
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border ${
                isOnline
                  ? 'border-emerald-200 bg-emerald-50/80 text-emerald-700'
                  : 'border-amber-200 bg-amber-50 text-amber-700'
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="h-3 w-3" />
                  <span>Realtime</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  <span>ออฟไลน์</span>
                </>
              )}
            </div>

            {!isAuthenticated && (
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:from-emerald-700 hover:to-teal-700 transition-all"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>เข้าสู่ระบบ</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Prominent Hero Card: Admin Management vs Teacher Quick Submit */}
      {isAuthenticated && (
        role === 'admin' ? (
          <div className="relative overflow-hidden rounded-2xl border border-emerald-600/30 bg-gradient-to-r from-slate-900 via-emerald-950 to-teal-950 p-4 sm:p-5 text-white shadow-md">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
            <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-teal-500/15 blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-semibold">
                    <Sparkles className="h-3 w-3 text-amber-300" />
                    <span>แผงควบคุมฝ่ายบริหาร (Super Admin)</span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 text-emerald-200 text-[11px] font-medium px-2.5 py-0.5">
                    ผู้ดูแลระบบเป็นผู้มอบหมายและตรวจรับผลงาน
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
                  <span>📋 ศูนย์จัดการและมอบหมายภาระงานโรงเรียน</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                  สร้างและมอบหมายภาระงานรายบุคคลหรือกลุ่มสาระฯ • ตรวจสอบ Checklist และอนุมัติผลงานครู • เชื่อมโยงเข้า Google Drive กลางโรงเรียนอัตโนมัติ
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <Link
                  to="/admin/tasks"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg hover:from-emerald-400 hover:to-teal-400 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Upload className="h-4 w-4" />
                  <span>+ มอบหมายงาน / ตรวจรับงาน</span>
                </Link>
                <Link
                  to="/admin/overview"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-white/20 transition-all cursor-pointer backdrop-blur-xs"
                >
                  <span>📊 แดชบอร์ดสรุปภาพรวม</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-4 sm:p-5 text-white shadow-md">
            {/* Decorative background circle */}
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
            <div className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-teal-400/20 blur-xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-xs">
                    <Sparkles className="h-3 w-3 text-amber-300" />
                    <span>ระบบส่งงานรุ่นใหม่</span>
                  </span>
                  {pendingTaskCount !== null && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 text-slate-900 font-bold px-2.5 py-0.5 text-[11px] shadow-2xs">
                      <Clock className="h-3 w-3" />
                      <span>มีภาระงานที่ต้องส่ง: {pendingTaskCount} รายการ</span>
                    </span>
                  )}
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
                  📤 ส่งไฟล์งาน / ภาระงานด่วน (Quick File Submit)
                </h2>
                <p className="text-xs sm:text-sm text-emerald-100 max-w-2xl leading-relaxed">
                  ลากไฟล์จากเครื่องคอมพิวเตอร์เข้าได้ทันที ไม่ต้องก๊อปลิงก์ • ส่งแยกทีละงานย่อยได้ พร้อมแสดงสถานะเปอร์เซ็นต์แบบเรียลไทม์ และจัดเก็บเข้า Google Drive โรงเรียนอัตโนมัติ
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsQuickSubmitOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-emerald-800 shadow-lg hover:bg-emerald-50 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Upload className="h-4 w-4 text-emerald-600" />
                  <span>🚀 กดส่งไฟล์งานทันที</span>
                </button>
                <Link
                  to="/tasks"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/30 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-all cursor-pointer backdrop-blur-xs"
                >
                  <span>ภาระงานทั้งหมด</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )
      )}

      {/* Main Facebook-Style Announcement Feed */}
      {isAuthenticated && (
        <div className="space-y-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between px-1">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-emerald-600" />
              <span>กระดานประกาศข่าวสารฝ่ายบริหาร</span>
            </h2>
            <span className="text-xs text-slate-400">อัปเดตล่าสุด</span>
          </div>

          <AnnouncementFeed previewCount={0} />
        </div>
      )}

      {/* Quick Submit Modal */}
      <QuickSubmitModal
        isOpen={isQuickSubmitOpen}
        onClose={() => setIsQuickSubmitOpen(false)}
        onSubmitted={() => {
          if (user?.id) {
            fetchTeacherTasks(user.id).then((res) => {
              if (res.data) {
                const pending = res.data.filter(
                  (t) => t.status === 'pending' || t.status === 'in_progress' || t.status === 'rejected'
                ).length
                setPendingTaskCount(pending)
              }
            })
          }
        }}
      />
    </div>
  )
}
