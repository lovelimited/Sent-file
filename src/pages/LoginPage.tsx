import React, { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Lock, User, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'

export const LoginPage: React.FC = () => {
  const { isAuthenticated, login, isLoading: isAuthLoading } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Redirect if already authenticated - Always go to Home page
  if (isAuthenticated && !isAuthLoading) {
    return <Navigate to="/" replace />
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
        // Requirement 12: Always navigate to Home page (/) for all users
        navigate('/', { replace: true })
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
    <div className="w-full min-h-screen min-h-[100dvh] flex-1 flex flex-col justify-between items-center bg-gradient-to-br from-slate-50 via-emerald-50/40 to-teal-50/30 p-4 sm:p-8 relative overflow-hidden">
      {/* Background subtle glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-100/50 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-100/40 rounded-full blur-3xl pointer-events-none" />

      {/* Top spacer for balanced vertical rhythm */}
      <div className="hidden sm:block h-2" />

      <div className="w-full max-w-md sm:max-w-lg z-10 my-auto py-6">
        {/* Header Branding with Sarasas School Crest */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center mb-3">
            <img
              src="/school-logo.png"
              alt="ตราสัญลักษณ์โรงเรียนสารสาสน์วิเทศราชพฤกษ์"
              className="h-20 w-20 sm:h-24 sm:w-24 object-contain drop-shadow-md rounded-full bg-white p-1.5 border-2 border-amber-300 shadow-sm"
            />
          </div>
          <p className="text-xs font-bold tracking-widest text-emerald-800 uppercase">
            Sarasas Witaed Ratchaphruek School
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl mt-1.5">
            School Work Club
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            ระบบบริหารจัดการภาระงานและเอกสารฝ่ายวิชาการ
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-3xl border border-emerald-200/80 bg-white/95 backdrop-blur-xl p-6 sm:p-9 shadow-2xl shadow-emerald-950/5">
          <form onSubmit={handleSubmit} className="space-y-5">
            {errorMessage && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                <span className="leading-relaxed font-medium">{errorMessage}</span>
              </div>
            )}

            {/* Username input */}
            <div>
              <label htmlFor="username" className="block text-xs font-semibold text-slate-700 mb-1.5">
                ชื่อผู้ใช้งาน (Username)
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <User className="h-4 w-4 text-emerald-600" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="Username"
                  className="block w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-10 pr-3.5 py-3 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Password input */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                รหัสผ่าน (Password)
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock className="h-4 w-4 text-emerald-600" />
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
                  className="block w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-10 pr-11 py-3 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
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
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-700/20 hover:from-emerald-700 hover:to-teal-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all cursor-pointer mt-3"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>กำลังเข้าสู่ระบบ...</span>
                </>
              ) : (
                <span>เข้าสู่ระบบ</span>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Developer Credits (ข้อ 11) */}
      <div className="w-full text-center text-xs text-slate-500 py-3 z-10">
        <p className="font-semibold text-slate-700">
          พัฒนาโดย ม.กฤตพจน์ แก้วกา
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          โรงเรียนสารสาสน์วิเทศราชพฤกษ์ • Sarasas Witaed Ratchaphruek School
        </p>
      </div>
    </div>
  )
}
