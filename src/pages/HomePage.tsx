import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
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
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { fetchTeacherTasks, fetchAdminTasks } from '@/services/taskService'
import { fetchUsers, fetchGroups } from '@/services/userService'
import { fetchDriveResources } from '@/services/driveService'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

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
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/80 to-slate-950 p-6 sm:p-8 backdrop-blur shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            School Work Hub Production Active
          </div>

          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${
              isOnline
                ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
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

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
          {isAuthenticated && profile ? (
            <span>ยินดีต้อนรับ, {profile.name}</span>
          ) : (
            <span>ระบบบริหารจัดการงานโรงเรียน (School Work Hub)</span>
          )}
        </h1>
        <p className="text-slate-400 text-sm sm:text-base max-w-2xl leading-relaxed">
          {isAuthenticated && profile ? (
            <span>
              คุณกำลังเข้าสู่ระบบในฐานะ{' '}
              <strong className="text-slate-200">
                {role === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : 'คุณครู (Teacher)'}
              </strong>
              {profile.user_groups?.name && (
                <span> สังกัดกลุ่มสาระการเรียนรู้ {profile.user_groups.name}</span>
              )}
            </span>
          ) : (
            <span>
              ศูนย์กลางการจัดการภาระงานเอกสาร งานสอน และข้อมูลโรงเรียนสำหรับคณะครูประมาณ 50 ท่าน
            </span>
          )}
        </p>

        {!isAuthenticated && (
          <div className="mt-6">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:from-blue-500 hover:to-indigo-500 transition-all"
            >
              <LogIn className="h-4 w-4" />
              <span>เข้าสู่ระบบเพื่อใช้งาน</span>
            </Link>
          </div>
        )}
      </div>

      {/* School Overview Metrics Bar */}
      {isAuthenticated && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 backdrop-blur">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <Users className="h-4 w-4 text-blue-400" />
              <span>คณะครูและบุคลากร</span>
            </div>
            <p className="text-xl font-bold text-white">
              {totalTeachersCount !== null ? `${totalTeachersCount} ท่าน` : '-'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 backdrop-blur">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span>กลุ่มสาระการเรียนรู้</span>
            </div>
            <p className="text-xl font-bold text-purple-300">
              {totalGroupsCount !== null ? `${totalGroupsCount} กลุ่ม` : '-'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 backdrop-blur">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <FolderOpen className="h-4 w-4 text-amber-400" />
              <span>คลัง Drive & แม่แบบ</span>
            </div>
            <p className="text-xl font-bold text-amber-300">
              {totalDriveCount !== null ? `${totalDriveCount} รายการ` : '-'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 backdrop-blur">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <ClipboardList className="h-4 w-4 text-emerald-400" />
              <span>ภาระงานที่เปิดอยู่</span>
            </div>
            <p className="text-xl font-bold text-emerald-300">
              {adminOpenTasksCount !== null ? `${adminOpenTasksCount} ภาระงาน` : '-'}
            </p>
          </div>
        </div>
      )}

      {/* Quick Launchpad Grid */}
      {isAuthenticated && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Teacher Tasks Card */}
          <Link
            to="/tasks"
            className="group rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-950/40 to-slate-900/60 p-5 backdrop-blur flex flex-col justify-between hover:border-blue-500/60 transition-all shadow-lg"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-base">
                  <CheckSquare className="h-5 w-5" />
                  <span>ภาระงานของฉัน</span>
                </div>
                {teacherPendingCount !== null && (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      teacherPendingCount > 0
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {teacherPendingCount > 0 ? `ค้างส่ง ${teacherPendingCount} งาน` : 'ส่งครบแล้ว'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                ส่งแผนการสอน รายงานผลการสอน และตรวจเช็กข้อคิดเห็นการตรวจรับผลงาน
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-blue-400 group-hover:text-blue-300">
              <span>เข้าสู่หน้างานของฉัน</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* School Chat Card */}
          <Link
            to="/chat"
            className="group rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-950/40 to-slate-900/60 p-5 backdrop-blur flex flex-col justify-between hover:border-purple-500/60 transition-all shadow-lg"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-purple-400 font-bold text-base">
                  <MessageSquare className="h-5 w-5" />
                  <span>ห้องสื่อสารภายในโรงเรียน</span>
                </div>
                <span className="rounded-full bg-purple-500/20 text-purple-300 px-2 py-0.2 text-[10px] font-semibold">
                  Realtime
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                สื่อสารประสานงานระหว่างกลุ่มสาระฯ และรับประกาศทางการจากฝ่ายบริหาร
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-purple-400 group-hover:text-purple-300">
              <span>เปิดห้องสนทนา</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* School Drive Hub Card */}
          <Link
            to="/drive"
            className="group rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 to-slate-900/60 p-5 backdrop-blur flex flex-col justify-between hover:border-amber-500/60 transition-all shadow-lg"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-base">
                  <FolderOpen className="h-5 w-5" />
                  <span>คลัง Drive & แม่แบบเอกสาร</span>
                </div>
                <span className="rounded-full bg-amber-500/20 text-amber-300 px-2 py-0.2 text-[10px] font-semibold">
                  Google Docs
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                ดาวน์โหลดแม่แบบแผนการสอน เอกสาร ปพ.5 และเข้าถึงโฟลเดอร์ Drive ประจำกลุ่มสาระฯ
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-amber-400 group-hover:text-amber-300">
              <span>เปิดคลังทรัพยากร</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {/* Admin Management Shortcuts (If Admin) */}
          {isAdmin && (
            <Link
              to="/admin/tasks"
              className="group rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 to-slate-900/60 p-5 backdrop-blur flex flex-col justify-between hover:border-emerald-500/60 transition-all shadow-lg sm:col-span-2 lg:col-span-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
                  <ClipboardList className="h-5 w-5" />
                  <span>ตรวจรับผลงาน & มอบหมายภาระงานโรงเรียน</span>
                </div>
                {adminPendingReviewCount !== null && adminPendingReviewCount > 0 && (
                  <span className="rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 px-3 py-1 text-xs font-bold self-start sm:self-auto">
                    รอตรวจรับ {adminPendingReviewCount} ผลงาน
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                สร้างภาระงานใหม่ ตรวจสอบผลงานที่คณะครูส่งมา อนุมัติ/ส่งกลับแก้ไขพร้อมบันทึก Feedback และส่งออกรายงาน CSV
              </p>
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-emerald-400 group-hover:text-emerald-300">
                <span>เปิดหน้าบริหารจัดการภาระงาน</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          )}
        </div>
      )}

      {/* User Information Grid */}
      {isAuthenticated && profile && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 backdrop-blur">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <User className="h-4 w-4 text-blue-400" />
              <span>ชื่อผู้ใช้งาน (Username)</span>
            </div>
            <p className="text-base font-semibold text-white truncate">
              {profile.username}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 backdrop-blur">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <Shield className="h-4 w-4 text-emerald-400" />
              <span>บทบาท (Role)</span>
            </div>
            <p className="text-base font-semibold text-emerald-300">
              {role === 'admin' ? 'ผู้ดูแลระบบ' : 'คุณครู'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 backdrop-blur">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <Users className="h-4 w-4 text-purple-400" />
              <span>กลุ่มสาระการเรียนรู้</span>
            </div>
            <p className="text-base font-semibold text-white truncate">
              {profile.user_groups?.name || 'ยังไม่ระบุกลุ่ม'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 backdrop-blur">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <Clock className="h-4 w-4 text-amber-400" />
              <span>เข้าสู่ระบบล่าสุด</span>
            </div>
            <p className="text-xs font-medium text-slate-300">
              {profile.last_seen ? new Date(profile.last_seen).toLocaleString('th-TH') : 'เข้าสู่ระบบครั้งแรก'}
            </p>
          </div>
        </div>
      )}

      {/* Production Architecture Summary */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5 text-xs text-slate-400 space-y-3">
        <div className="flex items-center gap-2 font-medium text-slate-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>สถาปัตยกรรม School Work Hub (Full Stack Completed)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          <div className="flex items-center gap-2 text-slate-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Database RLS & Bridge Auth</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Task Management & Submissions</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Realtime Chat & Notifications</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>PWA Offline & Google Drive Hub</span>
          </div>
        </div>
      </div>
    </div>
  )
}
