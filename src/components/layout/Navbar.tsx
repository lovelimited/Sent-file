import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  GraduationCap,
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
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 text-white font-semibold text-base sm:text-lg tracking-tight hover:opacity-90 transition-opacity">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="leading-tight">School Work Hub</span>
            <span className="text-[10px] font-normal text-slate-400">ระบบจัดการงานโรงเรียน</span>
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
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  หน้าหลัก
                </Link>

                {/* Teacher Task link */}
                <Link
                  to="/tasks"
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${
                    location.pathname === '/tasks'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
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
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
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
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
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
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      <ClipboardList className="h-3.5 w-3.5" />
                      <span>จัดการงาน</span>
                    </Link>

                    <Link
                      to="/admin/users"
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${
                        location.pathname === '/admin/users'
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span>จัดการครู</span>
                    </Link>

                    <Link
                      to="/admin/groups"
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${
                        location.pathname === '/admin/groups'
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      <FolderTree className="h-3.5 w-3.5" />
                      <span>กลุ่มสาระฯ</span>
                    </Link>

                    <Link
                      to="/admin/logs"
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${
                        location.pathname === '/admin/logs'
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>ประวัติระบบ</span>
                    </Link>
                  </>
                )}
              </div>

              {/* Notification Bell */}
              <NotificationBell />

              {/* User details badge */}
              <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 py-1 pl-1.5 pr-2.5 sm:pr-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  <User className="h-3.5 w-3.5" />
                </div>
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-slate-200 truncate max-w-[90px] sm:max-w-[140px]">
                      {profile.name}
                    </span>
                    <span
                      className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 text-[10px] font-medium ${
                        profile.role === 'admin'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      }`}
                    >
                      {profile.role === 'admin' && <Shield className="h-2.5 w-2.5" />}
                      {profile.role === 'admin' ? 'ผู้ดูแลระบบ' : 'คุณครู'}
                    </span>
                  </div>
                  {profile.user_groups?.name && (
                    <span className="text-[10px] text-slate-400 leading-none truncate max-w-[110px]">
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
                    ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
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
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-blue-400 hover:border-blue-500/30 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <HelpCircle className="h-4 w-4" />
              </button>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                title="ออกจากระบบ"
                aria-label="ออกจากระบบ"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-colors cursor-pointer"
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
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-blue-400 hover:border-blue-500/30 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 transition-colors"
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
        <div className="md:hidden flex items-center justify-around border-t border-slate-800/60 bg-slate-950/60 px-2 py-2 text-[11px]">
          <Link
            to="/"
            className={`px-2 py-1 rounded ${location.pathname === '/' ? 'text-white font-medium bg-slate-800' : 'text-slate-400'}`}
          >
            หน้าหลัก
          </Link>
          <Link
            to="/tasks"
            className={`px-2 py-1 rounded ${location.pathname === '/tasks' ? 'text-white font-medium bg-slate-800' : 'text-slate-400'}`}
          >
            งานของฉัน
          </Link>
          <Link
            to="/chat"
            className={`px-2 py-1 rounded ${location.pathname === '/chat' ? 'text-white font-medium bg-slate-800' : 'text-slate-400'}`}
          >
            แชท
          </Link>
          <Link
            to="/drive"
            className={`px-2 py-1 rounded ${location.pathname === '/drive' ? 'text-white font-medium bg-slate-800' : 'text-slate-400'}`}
          >
            Drive
          </Link>
          {isAdmin && (
            <>
              <Link
                to="/admin/tasks"
                className={`px-2 py-1 rounded ${location.pathname === '/admin/tasks' ? 'text-white font-medium bg-slate-800' : 'text-slate-400'}`}
              >
                จัดการงาน
              </Link>
              <Link
                to="/admin/users"
                className={`px-2 py-1 rounded ${location.pathname === '/admin/users' ? 'text-white font-medium bg-slate-800' : 'text-slate-400'}`}
              >
                จัดการครู
              </Link>
              <Link
                to="/admin/groups"
                className={`px-2 py-1 rounded ${location.pathname === '/admin/groups' ? 'text-white font-medium bg-slate-800' : 'text-slate-400'}`}
              >
                กลุ่มสาระฯ
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
