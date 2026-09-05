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
