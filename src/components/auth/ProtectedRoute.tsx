import React from 'react'
import { Navigate, useLocation, Outlet, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import type { UserRole } from '@/types/database.types'
import { ShieldAlert, ArrowLeft } from 'lucide-react'

interface ProtectedRouteProps {
  children?: React.ReactNode
  allowedRoles?: UserRole[]
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, role } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-white border border-amber-200 shadow-sm p-1">
            <img
              src="/school-logo.png"
              alt="School Logo"
              className="h-14 w-14 object-contain animate-pulse"
            />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700">กำลังตรวจสอบสิทธิ์การเข้าใช้งาน...</p>
            <p className="text-xs text-slate-500 mt-0.5">School Work Club — สารสาสน์วิเทศราชพฤกษ์</p>
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
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 mb-4 shadow-xs">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">ไม่มีสิทธิ์เข้าถึงหน้านี้</h2>
        <p className="mt-2 text-sm text-slate-500 max-w-md">
          หน้านี้สงวนไว้สำหรับผู้ดูแลระบบ (Admin) หรือผู้ใช้ที่มีบทบาทเฉพาะ กรุณากลับสู่หน้าหลักของระบบ
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>กลับสู่หน้าหลัก</span>
        </Link>
      </div>
    )
  }

  return children ? <>{children}</> : <Outlet />
}
