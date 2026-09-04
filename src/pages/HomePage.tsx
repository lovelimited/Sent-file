import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  User,
  Shield,
  Users,
  Clock,
  LogIn,
  CheckSquare,
  ClipboardList,
  ArrowRight,
  FolderOpen,
  MessageSquare,
  Sparkles,
  Wifi,
  WifiOff,
  Megaphone,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { fetchTeacherTasks, fetchAdminTasks } from '@/services/taskService'
import { fetchUsers, fetchGroups } from '@/services/userService'
import { fetchDriveResources } from '@/services/driveService'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { AnnouncementFeed } from '@/components/feed/AnnouncementFeed'

export const HomePage: React.FC = () => {
  const { isAuthenticated, profile, role, user, isAdmin } = useAuth()
  const { isOnline } = useNetworkStatus()

  // Metrics
  const [teacherPendingCount, setTeacherPendingCount] = useState<number | null>(null)
  const [adminOpenTasksCount, setAdminOpenTasksCount] = useState<number | null>(null)
  const [adminPendingReviewCount, setAdminPendingReviewCount] = useState<number | null>(null)
  const [totalTeachersCount, setTotalTeachersCount] = useState<number | null>(null)
  const [totalGroupsCount, setTotalGroupsCount] = useState<number | null>(null)
  const [totalDriveCount, setTotalDriveCount] = useState<number | null>(null)

  useEffect(() => {
    let isMounted = true

    // General School Stats
    Promise.all([fetchUsers(), fetchGroups(), fetchDriveResources()]).then(
      ([usersRes, groupsRes, driveRes]) => {
        if (isMounted) {
          if (usersRes.data) setTotalTeachersCount(usersRes.data.length)
          if (groupsRes.data) setTotalGroupsCount(groupsRes.data.length)
          if (driveRes.data) setTotalDriveCount(driveRes.data.length)
        }
      }
    )

    if (user?.id) {
      if (isAdmin) {
        fetchAdminTasks().then((res) => {
          if (isMounted && res.data) {
            setAdminOpenTasksCount(res.data.length)
            const pendingReview = res.data.reduce(
              (acc, curr) => acc + (curr.stats?.submitted || 0),
              0
            )
            setAdminPendingReviewCount(pendingReview)
          }
        })
      } else {
        fetchTeacherTasks(user.id).then((res) => {
          if (isMounted && res.data) {
            const pending = res.data.filter(
              (t) => t.status === 'pending' || t.status === 'in_progress' || t.status === 'rejected'
            ).length
            setTeacherPendingCount(pending)
          }
        })
      }
    }

    return () => {
      isMounted = false
    }
  }, [user?.id, isAdmin])

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/70 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>ระบบสารสาสน์วิเทศราชพฤกษ์ พร้อมใช้งาน</span>
          </div>

          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${
              isOnline
                ? 'border-blue-200 bg-blue-50 text-blue-700'
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
                  <strong className="text-blue-700">
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
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 hover:from-blue-700 hover:to-indigo-700 transition-all"
            >
              <LogIn className="h-4 w-4" />
              <span>เข้าสู่ระบบเพื่อใช้งาน</span>
            </Link>
          </div>
        )}
      </div>

      {/* School Overview Metrics Bar */}
      {isAuthenticated && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <Users className="h-4 w-4 text-blue-600" />
              <span>คณะครูและบุคลากร</span>
            </div>
            <p className="text-xl font-bold text-slate-900">
              {totalTeachersCount !== null ? `${totalTeachersCount} ท่าน` : '-'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span>กลุ่มสาระการเรียนรู้</span>
            </div>
            <p className="text-xl font-bold text-purple-700">
              {totalGroupsCount !== null ? `${totalGroupsCount} กลุ่ม` : '-'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <FolderOpen className="h-4 w-4 text-amber-600" />
              <span>คลัง Drive & แม่แบบ</span>
            </div>
            <p className="text-xl font-bold text-amber-700">
              {totalDriveCount !== null ? `${totalDriveCount} รายการ` : '-'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <ClipboardList className="h-4 w-4 text-emerald-600" />
              <span>ภาระงานที่เปิดอยู่</span>
            </div>
            <p className="text-xl font-bold text-emerald-700">
              {adminOpenTasksCount !== null ? `${adminOpenTasksCount} ภาระงาน` : '-'}
            </p>
          </div>
        </div>
      )}

      {/* Facebook-Style Announcement Feed Section (ข้อ 3) */}
      {isAuthenticated && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-emerald-600" />
              <span>กระดานประกาศข่าวสารฝ่ายบริหาร</span>
            </h2>
            <Link
              to="/announcements"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1"
            >
              <span>ดูประกาศทั้งหมด</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <AnnouncementFeed previewCount={3} />
        </div>
      )}

      {/* Quick Launchpad Grid */}
      {isAuthenticated && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Teacher Tasks Card */}
          <Link
            to="/tasks"
            className="group rounded-2xl border border-blue-200 bg-white p-5 flex flex-col justify-between hover:border-blue-400 hover:shadow-md transition-all shadow-xs"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-blue-700 font-bold text-base">
                  <CheckSquare className="h-5 w-5" />
                  <span>ภาระงานของฉัน</span>
                </div>
                {teacherPendingCount !== null && (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      teacherPendingCount > 0
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {teacherPendingCount > 0 ? `ค้างส่ง ${teacherPendingCount} งาน` : 'ส่งครบแล้ว'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                ส่งแผนการสอน รายงานผลการสอน อัปโหลดลากวางไฟล์ และตรวจเช็กข้อคิดเห็นการตรวจรับผลงาน
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:text-blue-700">
              <span>เข้าสู่หน้างานของฉัน</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* School Chat Card */}
          <Link
            to="/chat"
            className="group rounded-2xl border border-purple-200 bg-white p-5 flex flex-col justify-between hover:border-purple-400 hover:shadow-md transition-all shadow-xs"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-purple-700 font-bold text-base">
                  <MessageSquare className="h-5 w-5" />
                  <span>ห้องสื่อสารภายในโรงเรียน</span>
                </div>
                <span className="rounded-full bg-purple-100 text-purple-700 px-2 py-0.2 text-[10px] font-semibold">
                  Realtime เสียงเตือน
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                สื่อสารประสานงานระหว่างกลุ่มสาระฯ รับประกาศทางการ พร้อมป๊อปอัพและเสียงกระดิ่งแจ้งเตือน
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-purple-600 group-hover:text-purple-700">
              <span>เปิดห้องสนทนา</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* School Drive Hub Card */}
          <Link
            to="/drive"
            className="group rounded-2xl border border-amber-200 bg-white p-5 flex flex-col justify-between hover:border-amber-400 hover:shadow-md transition-all shadow-xs"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-amber-700 font-bold text-base">
                  <FolderOpen className="h-5 w-5" />
                  <span>คลัง Drive ส่วนตัว & แม่แบบ</span>
                </div>
                <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.2 text-[10px] font-semibold">
                  ส่วนตัว
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                เข้าถึงคลังไฟล์เอกสารส่วนตัว (เฉพาะคุณครู) หรือคลังรวมโรงเรียน (สำหรับผู้ดูแลระบบ)
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-amber-600 group-hover:text-amber-700">
              <span>เปิดคลังทรัพยากร</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Admin Management Shortcuts (If Admin) */}
          {isAdmin && (
            <Link
              to="/admin/tasks"
              className="group rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/50 to-white p-5 flex flex-col justify-between hover:border-emerald-400 hover:shadow-md transition-all shadow-xs sm:col-span-2 lg:col-span-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-base">
                  <ClipboardList className="h-5 w-5" />
                  <span>ตรวจรับผลงาน Checklist & มอบหมายภาระงานโรงเรียน</span>
                </div>
                {adminPendingReviewCount !== null && adminPendingReviewCount > 0 && (
                  <span className="rounded-full bg-purple-100 border border-purple-200 text-purple-700 px-3 py-1 text-xs font-bold self-start sm:self-auto">
                    รอตรวจรับ {adminPendingReviewCount} ผลงาน
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                สร้างภาระงานใหม่พร้อมงานย่อย (Subtasks) ตรวจสอบ Checklist ครูที่ส่ง/ยังไม่ส่ง อนุมัติ/ส่งกลับแก้ไข และส่งออกรายงาน CSV/รายงานพิมพ์ทางการ
              </p>
              <div className="mt-4 pt-3 border-t border-emerald-100 flex items-center justify-between text-xs font-semibold text-emerald-700 group-hover:text-emerald-800">
                <span>เปิดหน้าบริหารจัดการภาระงาน</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          )}
        </div>
      )}

      {/* User Information Details */}
      {isAuthenticated && profile && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <User className="h-4 w-4 text-blue-600" />
              <span>ชื่อผู้ใช้งาน (Username)</span>
            </div>
            <p className="text-sm font-bold text-slate-900 truncate">
              @{profile.username}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <Shield className="h-4 w-4 text-emerald-600" />
              <span>บทบาท (Role)</span>
            </div>
            <p className="text-sm font-bold text-emerald-700">
              {role === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : 'คุณครูผู้สอน (Teacher)'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <Users className="h-4 w-4 text-purple-600" />
              <span>กลุ่มสาระการเรียนรู้</span>
            </div>
            <p className="text-sm font-bold text-slate-900 truncate">
              {profile.user_groups?.name || 'ส่วนกลางโรงเรียน'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <Clock className="h-4 w-4 text-amber-600" />
              <span>เข้าสู่ระบบล่าสุด</span>
            </div>
            <p className="text-xs font-semibold text-slate-700">
              {profile.last_seen ? new Date(profile.last_seen).toLocaleString('th-TH') : 'เข้าสู่ระบบครั้งแรก'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
