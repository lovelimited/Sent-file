import React, { useState } from 'react'
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
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { UserGuideModal } from '@/components/help/UserGuideModal'

export const Navbar: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, profile, isAdmin, logout } = useAuth()
  const [isGuideOpen, setIsGuideOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true, state: null })
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand Logo with Sarasas Crest */}
        <Link
          to="/"
          className="flex items-center gap-2.5 text-slate-900 font-semibold text-base sm:text-lg tracking-tight hover:opacity-90 transition-opacity"
        >
          <img
            src="/school-logo.png"
            alt="ตราสัญลักษณ์โรงเรียนสารสาสน์วิเทศราชพฤกษ์"
            className="h-10 w-10 object-contain rounded-full bg-white p-0.5 border border-amber-300 drop-shadow-xs"
          />
          <div className="flex flex-col">
            <span className="leading-tight font-bold text-slate-900 text-sm sm:text-base">
              School Work Hub
            </span>
            <span className="text-[10px] font-normal text-slate-500">
              สารสาสน์วิเทศราชพฤกษ์
            </span>
          </div>
        </Link>

        {/* Navigation & User Menu */}
        <nav className="flex items-center gap-2 sm:gap-3 text-sm">
          {isAuthenticated && profile ? (
            <>
              {/* Navigation Links for Authenticated Users */}
              <div className="hidden md:flex items-center gap-1 text-xs font-medium">
                <Link
                  to="/"
                  className={`rounded-lg px-3 py-1.5 transition-colors ${
                    location.pathname === '/'
                      ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  หน้าหลัก
                </Link>

                {/* Teacher Task link */}
                <Link
                  to="/tasks"
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${
                    location.pathname === '/tasks'
                      ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                  <span>ภาระงานของฉัน</span>
                </Link>

                {/* Chat link */}
                <Link
                  to="/chat"
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${
                    location.pathname === '/chat'
                      ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>ห้องสื่อสาร</span>
                </Link>

                {/* Drive Resources link */}
                <Link
                  to="/drive"
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${
                    location.pathname === '/drive'
                      ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                  <span>คลัง Drive</span>
                </Link>

                {/* Admin Navigation */}
                {isAdmin && (
                  <>
                    <Link
                      to="/admin/tasks"
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${
                        location.pathname === '/admin/tasks'
                          ? 'bg-purple-50 text-purple-700 font-semibold border border-purple-200/60'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <ClipboardList className="h-3.5 w-3.5 text-purple-600" />
                      <span>จัดการงาน</span>
                    </Link>

                    <Link
                      to="/admin/users"
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${
                        location.pathname === '/admin/users'
                          ? 'bg-purple-50 text-purple-700 font-semibold border border-purple-200/60'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Users className="h-3.5 w-3.5 text-purple-600" />
                      <span>จัดการครู</span>
                    </Link>

                    <Link
                      to="/admin/groups"
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${
                        location.pathname === '/admin/groups'
                          ? 'bg-purple-50 text-purple-700 font-semibold border border-purple-200/60'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <FolderTree className="h-3.5 w-3.5 text-purple-600" />
                      <span>กลุ่มสาระฯ</span>
                    </Link>

                    <Link
                      to="/admin/logs"
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${
                        location.pathname === '/admin/logs'
                          ? 'bg-purple-50 text-purple-700 font-semibold border border-purple-200/60'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <FileText className="h-3.5 w-3.5 text-purple-600" />
                      <span>ประวัติระบบ</span>
                    </Link>
                  </>
                )}
              </div>

              {/* Notification Bell */}
              <NotificationBell />

              {/* User details badge */}
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1 pl-1.5 pr-2.5 sm:pr-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-600 border border-blue-200 font-bold text-xs">
                  {profile.name ? profile.name.charAt(0) : 'U'}
                </div>
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-800 truncate max-w-[90px] sm:max-w-[140px]">
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
                      {profile.role === 'admin' ? 'แอดมิน' : 'คุณครู'}
                    </span>
                  </div>
                  {profile.user_groups?.name && (
                    <span className="text-[10px] text-slate-500 leading-none truncate max-w-[110px]">
                      กลุ่มสาระฯ {profile.user_groups.name}
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
        <div className="md:hidden flex items-center justify-around border-t border-slate-200 bg-slate-50 px-2 py-2 text-[11px]">
          <Link
            to="/"
            className={`px-2.5 py-1 rounded-md ${
              location.pathname === '/' ? 'text-blue-700 font-semibold bg-blue-50' : 'text-slate-600'
            }`}
          >
            หน้าหลัก
          </Link>
          <Link
            to="/tasks"
            className={`px-2.5 py-1 rounded-md ${
              location.pathname === '/tasks' ? 'text-blue-700 font-semibold bg-blue-50' : 'text-slate-600'
            }`}
          >
            งานของฉัน
          </Link>
          <Link
            to="/chat"
            className={`px-2.5 py-1 rounded-md ${
              location.pathname === '/chat' ? 'text-blue-700 font-semibold bg-blue-50' : 'text-slate-600'
            }`}
          >
            แชท
          </Link>
          <Link
            to="/drive"
            className={`px-2.5 py-1 rounded-md ${
              location.pathname === '/drive' ? 'text-blue-700 font-semibold bg-blue-50' : 'text-slate-600'
            }`}
          >
            Drive
          </Link>
          {isAdmin && (
            <>
              <Link
                to="/admin/tasks"
                className={`px-2.5 py-1 rounded-md ${
                  location.pathname === '/admin/tasks' ? 'text-purple-700 font-semibold bg-purple-50' : 'text-slate-600'
                }`}
              >
                จัดการงาน
              </Link>
              <Link
                to="/admin/users"
                className={`px-2.5 py-1 rounded-md ${
                  location.pathname === '/admin/users' ? 'text-purple-700 font-semibold bg-purple-50' : 'text-slate-600'
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
