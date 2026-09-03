import React from 'react'
import { Navigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import type { UserRole } from '@/types/database.types'
import { GraduationCap, ShieldAlert } from 'lucide-react'

interface ProtectedRouteProps {
  children?: React.ReactNode
  allowedRoles?: UserRole[]
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, role } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 animate-pulse">
            <GraduationCap className="h-7 w-7" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-300">กำลังตรวจสอบสิทธิ์การเข้าใช้งาน...</p>
            <p className="text-xs text-slate-500 mt-1">School Work Hub</p>
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-4">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-100">ไม่มีสิทธิ์เข้าถึงหน้านี้</h2>
        <p className="mt-2 text-sm text-slate-400 max-w-md">
          หน้านี้สงวนไว้สำหรับผู้ใช้ที่มีบทบาทเฉพาะ กรุณาติดต่อผู้ดูแลระบบหากต้องการเข้าถึง
        </p>
      </div>
    )
  }

  return children ? <>{children}</> : <Outlet />
}
