import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LogOut,
  User,
  Shield,
  Users,
  FolderTree,
  FileText,
  CheckSquare,
  ClipboardList,
  MessageSquare,
  FolderOpen,
  Settings,
  HelpCircle,
  ChevronDown,
  Megaphone,
  TableProperties,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { UserGuideModal } from '@/components/help/UserGuideModal'
import { getAvatarUrl } from '@/utils/avatarUtils'

export const Navbar: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, profile, isAdmin, logout } = useAuth()
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const [isAdminDropdownOpen, setIsAdminDropdownOpen] = useState(false)
  const adminDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (adminDropdownRef.current && !adminDropdownRef.current.contains(e.target as Node)) {
        setIsAdminDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true, state: null })
  }

  const isAdminSubpageActive =
    location.pathname === '/admin/overview' ||
    location.pathname === '/admin/users' ||
    location.pathname === '/admin/groups' ||
    location.pathname === '/admin/logs'

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6">
        {/* Brand Logo with Sarasas Crest */}
        <Link
          to="/"
          className="flex items-center gap-2.5 text-slate-900 font-semibold text-base sm:text-lg tracking-tight hover:opacity-90 transition-opacity shrink-0"
        >
          <img
            src="/school-logo.png"
            alt="ตราสัญลักษณ์โรงเรียนสารสาสน์วิเทศราชพฤกษ์"
            className="h-10 w-10 object-contain rounded-full bg-white p-0.5 border border-amber-300 drop-shadow-xs shrink-0"
          />
          <div className="flex flex-col">
            <span className="leading-tight font-bold text-slate-900 text-sm sm:text-base">
              School Work Hub
            </span>
            <span className="text-[10px] font-normal text-slate-500 hidden sm:inline">
              สารสาสน์วิเทศราชพฤกษ์
            </span>
          </div>
        </Link>

        {/* Navigation & User Menu */}
        <nav className="flex items-center gap-1.5 sm:gap-2.5 text-sm">
          {isAuthenticated && profile ? (
            <>
              {/* Desktop Navigation Links */}
              <div className="hidden md:flex items-center gap-1 text-xs font-medium">
                <Link
                  to="/"
                  className={`rounded-lg px-2.5 py-1.5 transition-colors whitespace-nowrap ${
                    location.pathname === '/'
                      ? 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  หน้าหลัก
                </Link>

                {/* Announcement Feed Link */}
                <Link
                  to="/announcements"
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors whitespace-nowrap ${
                    location.pathname === '/announcements'
                      ? 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Megaphone className="h-3.5 w-3.5 text-emerald-600" />
                  <span>ข่าวประกาศ</span>
                </Link>

                {/* Teacher Task link */}
                {!isAdmin && (
                  <Link
                    to="/tasks"
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors whitespace-nowrap ${
                      location.pathname === '/tasks'
                        ? 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200/80'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <CheckSquare className="h-3.5 w-3.5" />
                    <span>ภาระงานของฉัน</span>
                  </Link>
                )}

                {/* Admin Task Management link */}
                {isAdmin && (
                  <Link
                    to="/admin/tasks"
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors whitespace-nowrap ${
                      location.pathname === '/admin/tasks'
                        ? 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200/80'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <ClipboardList className="h-3.5 w-3.5 text-emerald-600" />
                    <span>จัดการภาระงาน</span>
                  </Link>
                )}

                {/* Chat link */}
                <Link
                  to="/chat"
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors whitespace-nowrap ${
                    location.pathname === '/chat'
                      ? 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>ห้องสื่อสาร</span>
                </Link>

                {/* Drive Resources link */}
                <Link
                  to="/drive"
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors whitespace-nowrap ${
                    location.pathname === '/drive'
                      ? 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                  <span>คลัง Drive</span>
                </Link>

                {/* Admin Submenu Dropdown */}
                {isAdmin && (
                  <div className="relative" ref={adminDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsAdminDropdownOpen(!isAdminDropdownOpen)}
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                        isAdminSubpageActive
                          ? 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200/80'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Shield className="h-3.5 w-3.5 text-emerald-600" />
                      <span>การจัดการระบบ</span>
                      <ChevronDown className={`h-3 w-3 transition-transform ${isAdminDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isAdminDropdownOpen && (
                      <div className="absolute right-0 mt-1 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                        <Link
                          to="/admin/overview"
                          onClick={() => setIsAdminDropdownOpen(false)}
                          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors ${
                            location.pathname === '/admin/overview'
                              ? 'bg-emerald-50 text-emerald-800 font-semibold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <TableProperties className="h-4 w-4 text-emerald-600" />
                          <div>
                            <p className="font-medium leading-tight">ตารางภาพรวมการส่งงาน</p>
                            <p className="text-[10px] text-slate-400">สรุปสถานะครูทุกคน & พิมพ์ PDF</p>
                          </div>
                        </Link>

                        <Link
                          to="/admin/users"
                          onClick={() => setIsAdminDropdownOpen(false)}
                          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors ${
                            location.pathname === '/admin/users'
                              ? 'bg-emerald-50 text-emerald-800 font-semibold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <Users className="h-4 w-4 text-emerald-600" />
                          <div>
                            <p className="font-medium leading-tight">จัดการบุคลากรครู</p>
                            <p className="text-[10px] text-slate-400">แก้ไขข้อมูลและสถานะครู</p>
                          </div>
                        </Link>

                        <Link
                          to="/admin/groups"
                          onClick={() => setIsAdminDropdownOpen(false)}
                          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors ${
                            location.pathname === '/admin/groups'
                              ? 'bg-emerald-50 text-emerald-800 font-semibold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <FolderTree className="h-4 w-4 text-emerald-600" />
                          <div>
                            <p className="font-medium leading-tight">กลุ่มสาระการเรียนรู้</p>
                            <p className="text-[10px] text-slate-400">โครงสร้างกลุ่มและฝ่ายงาน</p>
                          </div>
                        </Link>

                        <Link
                          to="/admin/logs"
                          onClick={() => setIsAdminDropdownOpen(false)}
                          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors ${
                            location.pathname === '/admin/logs'
                              ? 'bg-emerald-50 text-emerald-800 font-semibold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <FileText className="h-4 w-4 text-emerald-600" />
                          <div>
                            <p className="font-medium leading-tight">ประวัติกิจกรรมระบบ</p>
                            <p className="text-[10px] text-slate-400">ตรวจสอบ Audit Trail</p>
                          </div>
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Notification Bell */}
              <NotificationBell />

              {/* User details badge */}
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1 pl-1.5 pr-2.5 sm:pr-3 shrink-0">
                <img
                  src={getAvatarUrl(profile.avatar_url, profile.name)}
                  alt={profile.name}
                  className="h-7 w-7 rounded-full object-cover border border-slate-200 bg-white"
                />
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-800 truncate max-w-[80px] sm:max-w-[120px]">
                      {profile.name}
                    </span>
                    <span
                      className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 text-[10px] font-medium ${
                        profile.role === 'admin'
                          ? 'bg-purple-100 text-purple-700 border border-purple-200'
                          : 'bg-blue-100 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {profile.role === 'admin' && <Shield className="h-2.5 w-2.5" />}
                      {profile.role === 'admin' ? 'แอดมิน' : 'ครู'}
                    </span>
                  </div>
                  {profile.user_groups?.name && (
                    <span className="text-[10px] text-slate-500 leading-none truncate max-w-[100px]">
                      {profile.user_groups.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Settings Button */}
              <Link
                to="/settings"
                title="ข้อมูลส่วนตัวและการตั้งค่าความปลอดภัย"
                aria-label="ข้อมูลส่วนตัวและการตั้งค่าความปลอดภัย"
                className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                  location.pathname === '/settings'
                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                    : 'border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Settings className="h-4 w-4" />
              </Link>

              {/* Help & User Guide Button */}
              <button
                type="button"
                onClick={() => setIsGuideOpen(true)}
                title="คู่มือการใช้งานระบบ"
                aria-label="คู่มือการใช้งานระบบ"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <HelpCircle className="h-4 w-4" />
              </button>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                title="ออกจากระบบ"
                aria-label="ออกจากระบบ"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsGuideOpen(true)}
                title="คู่มือการใช้งานระบบ"
                aria-label="คู่มือการใช้งานระบบ"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm transition-colors"
              >
                <User className="h-3.5 w-3.5" />
                <span>เข้าสู่ระบบ</span>
              </Link>
            </div>
          )}
        </nav>
      </div>

      {/* Mobile Sub-Navigation */}
      {isAuthenticated && (
        <div className="md:hidden flex items-center justify-around border-t border-emerald-100 bg-slate-50 px-2 py-2 text-[11px] overflow-x-auto">
          <Link
            to="/"
            className={`px-2 py-1 rounded-md whitespace-nowrap ${
              location.pathname === '/' ? 'text-emerald-800 font-semibold bg-emerald-50' : 'text-slate-600'
            }`}
          >
            หน้าหลัก
          </Link>
          <Link
            to="/announcements"
            className={`px-2 py-1 rounded-md whitespace-nowrap ${
              location.pathname === '/announcements' ? 'text-emerald-800 font-semibold bg-emerald-50' : 'text-slate-600'
            }`}
          >
            ข่าวสาร
          </Link>
          {!isAdmin && (
            <Link
              to="/tasks"
              className={`px-2 py-1 rounded-md whitespace-nowrap ${
                location.pathname === '/tasks' ? 'text-emerald-800 font-semibold bg-emerald-50' : 'text-slate-600'
              }`}
            >
              งานของฉัน
            </Link>
          )}
          <Link
            to="/chat"
            className={`px-2 py-1 rounded-md whitespace-nowrap ${
              location.pathname === '/chat' ? 'text-emerald-800 font-semibold bg-emerald-50' : 'text-slate-600'
            }`}
          >
            แชท
          </Link>
          <Link
            to="/drive"
            className={`px-2 py-1 rounded-md whitespace-nowrap ${
              location.pathname === '/drive' ? 'text-emerald-800 font-semibold bg-emerald-50' : 'text-slate-600'
            }`}
          >
            Drive
          </Link>
          {isAdmin && (
            <>
              <Link
                to="/admin/overview"
                className={`px-2 py-1 rounded-md whitespace-nowrap ${
                  location.pathname === '/admin/overview' ? 'text-emerald-800 font-semibold bg-emerald-50' : 'text-slate-600'
                }`}
              >
                ภาพรวม
              </Link>
              <Link
                to="/admin/tasks"
                className={`px-2 py-1 rounded-md whitespace-nowrap ${
                  location.pathname === '/admin/tasks' ? 'text-emerald-800 font-semibold bg-emerald-50' : 'text-slate-600'
                }`}
              >
                จัดการงาน
              </Link>
              <Link
                to="/admin/users"
                className={`px-2 py-1 rounded-md whitespace-nowrap ${
                  location.pathname === '/admin/users' ? 'text-emerald-800 font-semibold bg-emerald-50' : 'text-slate-600'
                }`}
              >
                จัดการครู
              </Link>
            </>
          )}
        </div>
      )}

      {/* In-App Interactive User Guide Modal */}
      <UserGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </header>
  )
}
