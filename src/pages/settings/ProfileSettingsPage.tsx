import React, { useState } from 'react'
import {
  User,
  Shield,
  Users,
  Key,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/services/supabase'

export const ProfileSettingsPage: React.FC = () => {
  const { profile, role, user, refreshProfile } = useAuth()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)

    if (newPassword.length < 6) {
      setFeedback({ type: 'error', message: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' })
      return
    }

    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', message: 'รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน' })
      return
    }

    setIsUpdating(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) {
        setFeedback({ type: 'error', message: error.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้' })
      } else {
        setFeedback({ type: 'success', message: 'เปลี่ยนรหัสผ่านของคุณเรียบร้อยแล้ว' })
        setNewPassword('')
        setConfirmPassword('')

        // Log action
        if (user?.id) {
          await supabase.from('activity_logs').insert({
            user_id: user.id,
            action: 'update_password',
            target_type: 'user',
            target_id: user.id,
          })

          // Update last_password_change in profiles
          await supabase
            .from('profiles')
            .update({ last_password_change: new Date().toISOString() })
            .eq('id', user.id)

          if (refreshProfile) {
            refreshProfile()
          }
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน'
      setFeedback({ type: 'error', message })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
          <User className="h-6 w-6 text-blue-600" />
          <span>ข้อมูลส่วนตัวและการตั้งค่าความปลอดภัย</span>
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          ตรวจสอบข้อมูลบัญชีผู้ใช้งาน และเปลี่ยนรหัสผ่านส่วนตัวสำหรับเข้าสู่ระบบ
        </p>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`flex items-center gap-2.5 rounded-xl border p-4 text-sm ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Profile Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-2xl font-bold text-white shadow-lg shadow-blue-600/15 mb-3">
              {profile?.name ? profile.name.charAt(0) : '?'}
            </div>
            <h2 className="text-base font-bold text-slate-900">{profile?.name}</h2>
            <p className="text-xs text-blue-600 font-mono mt-0.5">@{profile?.username}</p>

            <span
              className={`mt-2.5 inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-semibold ${
                role === 'admin'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
              }`}
            >
              <Shield className="h-3 w-3" />
              <span>{role === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : 'คุณครู (Teacher)'}</span>
            </span>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-3 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-slate-400" />
                <span>กลุ่มสาระฯ:</span>
              </span>
              <span className="font-semibold text-slate-900">
                {profile?.user_groups?.name || 'ยังไม่ระบุกลุ่ม'}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>เข้าสู่ระบบล่าสุด:</span>
              </span>
              <span className="font-medium text-slate-800">
                {profile?.last_seen ? new Date(profile.last_seen).toLocaleDateString('th-TH') : '-'}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>วันที่สร้างบัญชี:</span>
              </span>
              <span className="font-medium text-slate-800">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('th-TH') : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Change Password Card */}
        <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Key className="h-4 w-4 text-blue-600" />
              <span>เปลี่ยนรหัสผ่านด้วยตนเอง</span>
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              กำหนดรหัสผ่านใหม่ของคุณ เพื่อความปลอดภัยในการเข้าใช้งานระบบ
            </p>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่านใหม่..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                ยืนยันรหัสผ่านใหม่
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="กรอกยืนยันรหัสผ่านใหม่อีกครั้ง..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={isUpdating}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-blue-600/20 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>กำลังบันทึกรหัสผ่านใหม่...</span>
                  </>
                ) : (
                  <span>บันทึกรหัสผ่านใหม่</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
