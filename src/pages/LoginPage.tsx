import React, { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { GraduationCap, Lock, User, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'

export const LoginPage: React.FC = () => {
  const { isAuthenticated, login, isLoading: isAuthLoading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Redirect if already authenticated
  if (isAuthenticated && !isAuthLoading) {
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/'
    return <Navigate to={from} replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    const cleanUsername = username.trim().toLowerCase()
    if (!cleanUsername) {
      setErrorMessage('กรุณากรอกชื่อผู้ใช้ (Username)')
      return
    }

    if (!password) {
      setErrorMessage('กรุณากรอกรหัสผ่าน')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await login({ username: cleanUsername, password })
      if (result.success) {
        const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/'
        navigate(from, { replace: true })
      } else {
        setErrorMessage(result.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
      }
    } catch {
      setErrorMessage('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 mb-4 shadow-lg shadow-blue-500/10">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            School Work Hub
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            ระบบบริหารจัดการงานโรงเรียนสำหรับคณะครูและบุคลากร
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {errorMessage && (
              <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* Username input */}
            <div>
              <label htmlFor="username" className="block text-xs font-medium text-slate-300 mb-1.5">
                ชื่อผู้ใช้งาน (Username)
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="เช่น teacher01"
                  className="block w-full rounded-xl border border-slate-800 bg-slate-950/70 pl-9 pr-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                ใช้ชื่อผู้ใช้งานที่โรงเรียนกำหนด (พิมพ์ตัวพิมพ์เล็กทั้งหมด)
              </p>
            </div>

            {/* Password input */}
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-slate-300 mb-1.5">
                รหัสผ่าน (Password)
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full rounded-xl border border-slate-800 bg-slate-950/70 pl-9 pr-10 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-60 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>กำลังตรวจสอบข้อมูล...</span>
                </>
              ) : (
                <span>เข้าสู่ระบบ</span>
              )}
            </button>
          </form>

          {/* Quick Demo Preset Buttons */}
          <div className="mt-4 pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-slate-400">คลิกเติมข้อมูลเพื่อทดสอบสาธิต (Demo Quick-Fill):</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setUsername('admin')
                  setPassword('Admin1234!')
                }}
                className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-2.5 py-1.5 font-medium text-purple-300 hover:bg-purple-500/20 transition-colors text-left cursor-pointer"
              >
                👑 ผู้ดูแลระบบ (admin)
              </button>
              <button
                type="button"
                onClick={() => {
                  setUsername('teacher01')
                  setPassword('Teacher1234!')
                }}
                className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1.5 font-medium text-blue-300 hover:bg-blue-500/20 transition-colors text-left cursor-pointer"
              >
                👨‍🏫 คุณครู (teacher01)
              </button>
            </div>
          </div>

          <div className="mt-4 border-t border-slate-800/80 pt-4 text-center">
            <p className="text-xs text-slate-500">
              กรณีลืมรหัสผ่านหรือยังไม่มีบัญชีผู้ใช้ กรุณาติดต่อผู้ดูแลระบบโรงเรียน
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
