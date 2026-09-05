import React from 'react'
import { Link } from 'react-router-dom'
import {
  LogIn,
  Wifi,
  WifiOff,
  Megaphone,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { AnnouncementFeed } from '@/components/feed/AnnouncementFeed'

export const HomePage: React.FC = () => {
  const { isAuthenticated, profile, role } = useAuth()
  const { isOnline } = useNetworkStatus()

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50/70 via-white to-amber-50/50 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>ระบบสารสาสน์วิเทศราชพฤกษ์ พร้อมใช้งาน</span>
          </div>

          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${
              isOnline
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-amber-200 bg-amber-50 text-amber-700'
            }`}
          >
            {isOnline ? (
              <>
                <Wifi className="h-3.5 w-3.5" />
                <span>สถานะ: ออนไลน์ (Realtime)</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5" />
                <span>สถานะ: ออฟไลน์ (แคชข้อมูล)</span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <img
            src="/school-logo.png"
            alt="School Logo"
            className="h-16 w-16 object-contain rounded-full bg-white p-1 border border-amber-300 shadow-xs shrink-0"
          />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {isAuthenticated && profile ? (
                <span>ยินดีต้อนรับ, {profile.name}</span>
              ) : (
                <span>ระบบบริหารจัดการงานโรงเรียน (School Work Hub)</span>
              )}
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              {isAuthenticated && profile ? (
                <span>
                  คุณกำลังเข้าสู่ระบบในฐานะ{' '}
                  <strong className="text-emerald-700">
                    {role === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : 'คุณครู (Teacher)'}
                  </strong>
                  {profile.user_groups?.name && (
                    <span> สังกัดกลุ่มสาระการเรียนรู้ {profile.user_groups.name}</span>
                  )}
                </span>
              ) : (
                <span>
                  ศูนย์กลางการจัดการภาระงานเอกสาร งานสอน และข้อมูลโรงเรียนสารสาสน์วิเทศราชพฤกษ์
                </span>
              )}
            </p>
          </div>
        </div>

        {!isAuthenticated && (
          <div className="mt-6 pt-4 border-t border-slate-200/80">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 hover:from-emerald-700 hover:to-teal-700 transition-all"
            >
              <LogIn className="h-4 w-4" />
              <span>เข้าสู่ระบบเพื่อใช้งาน</span>
            </Link>
          </div>
        )}
      </div>

      {/* Main Facebook-Style Announcement Feed (ข้อ 7, 9) */}
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
    </div>
  )
}
