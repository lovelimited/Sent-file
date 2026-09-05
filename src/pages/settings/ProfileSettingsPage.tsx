import React, { useState, useEffect, useRef } from 'react'
import {
  User,
  Shield,
  Users,
  Key,
  Clock,
  Calendar,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Camera,
  Check,
  Upload,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/services/supabase'
import { updateUserProfile } from '@/services/userService'
import { PRESET_AVATARS, getAvatarUrl } from '@/utils/avatarUtils'
import { showConfirm, showSuccess, showError, showToast } from '@/utils/sweetalert'

export const ProfileSettingsPage: React.FC = () => {
  const { profile, role, user, refreshProfile } = useAuth()

  // Profile Edit State
  const [editName, setEditName] = useState('')
  const [editNickname, setEditNickname] = useState('')
  const [editAvatarUrl, setEditAvatarUrl] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Password Change State
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  useEffect(() => {
    if (profile) {
      setEditName(profile.name || '')
      setEditNickname(profile.nickname || '')
      setEditAvatarUrl(profile.avatar_url || '')
    }
  }, [profile])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return

    if (file.size > 3 * 1024 * 1024) {
      setUploadError('ขนาดไฟล์ต้องไม่เกิน 3MB')
      showError('ไฟล์มีขนาดใหญ่เกินไป', 'ขนาดไฟล์ต้องไม่เกิน 3MB')
      return
    }

    setUploadError(null)
    setIsUploadingAvatar(true)

    try {
      const fileExt = file.name.split('.').pop() || 'jpg'
      const filePath = `${user.id}_${Date.now()}.${fileExt}`

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadErr) {
        throw uploadErr
      }

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      setEditAvatarUrl(publicUrlData.publicUrl)
      showToast('อัปโหลดรูปภาพสำเร็จแล้ว อย่าลืมกดบันทึกการแก้ไขโปรไฟล์', 'success')
    } catch (err: unknown) {
      console.error('Avatar upload error:', err)
      const msg = err instanceof Error ? err.message : 'ไม่สามารถอัปโหลดรูปภาพได้'
      setUploadError(msg)
      showError('อัปโหลดรูปภาพไม่สำเร็จ', msg)
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return

    const clean = editName.trim()
    if (!clean) {
      showError('กรุณากรอกข้อมูล', 'กรุณากรอกชื่อ-นามสกุลของคุณ')
      return
    }

    // Confirmation Dialog with SweetAlert2
    const confirmed = await showConfirm(
      'ยืนยันการบันทึกข้อมูลโปรไฟล์?',
      'คุณต้องการบันทึกการเปลี่ยนแปลงชื่อและรูปภาพโปรไฟล์ของคุณใช่หรือไม่?'
    )
    if (!confirmed) return

    setIsSavingProfile(true)
    const res = await updateUserProfile(user.id, {
      name: clean,
      nickname: editNickname.trim() || null,
      avatar_url: editAvatarUrl.trim() || null,
    })
    setIsSavingProfile(false)

    if (res.success) {
      await showSuccess('บันทึกข้อมูลสำเร็จ', 'อัปเดตข้อมูลโปรไฟล์และรูปภาพเรียบร้อยแล้ว')
      if (refreshProfile) refreshProfile()
    } else {
      await showError('ไม่สามารถบันทึกข้อมูลได้', res.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล')
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword.length < 6) {
      showError('รหัสผ่านสั้นเกินไป', 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร')
      return
    }

    if (newPassword !== confirmPassword) {
      showError('รหัสผ่านไม่ตรงกัน', 'รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง')
      return
    }

    setIsUpdatingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) {
        await showError('ไม่สามารถเปลี่ยนรหัสผ่านได้', error.message || 'เกิดข้อผิดพลาดในการบันทึกรหัสผ่านใหม่')
      } else {
        setNewPassword('')
        setConfirmPassword('')

        if (user?.id) {
          await supabase.from('activity_logs').insert({
            user_id: user.id,
            action: 'update_password',
            target_type: 'user',
            target_id: user.id,
          })

          await supabase
            .from('profiles')
            .update({ last_password_change: new Date().toISOString() })
            .eq('id', user.id)

          if (refreshProfile) {
            refreshProfile()
          }
        }

        await showSuccess(
          'เปลี่ยนรหัสผ่านสำเร็จ!',
          'ระบบได้บันทึกรหัสผ่านใหม่ของคุณเรียบร้อยแล้ว กรุณาจำรหัสผ่านนี้สำหรับการเข้าสู่ระบบครั้งถัดไป'
        )
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน'
      await showError('เกิดข้อผิดพลาด', message)
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  // Live reactive preview avatar and display name for left card
  const currentPreviewAvatar = editAvatarUrl || profile?.avatar_url
  const currentDisplayName = editName || profile?.name

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
          <User className="h-6 w-6 text-emerald-600" />
          <span>ข้อมูลส่วนตัวและการตั้งค่าบัญชี</span>
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          ปรับแต่งรูปโปรไฟล์ ชื่อ-นามสกุล ชื่อเล่น และเปลี่ยนรหัสผ่านส่วนตัวสำหรับเข้าสู่ระบบ
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Profile Card (Live Reactive Preview) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-3">
              <img
                src={getAvatarUrl(currentPreviewAvatar, currentDisplayName)}
                alt={currentDisplayName || 'User'}
                className="h-24 w-24 rounded-full object-cover border-3 border-emerald-300 bg-white shadow-lg shadow-emerald-500/15 transition-all duration-200"
              />
              <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>

            <h2 className="text-base font-bold text-slate-900">
              {profile?.name}
              {profile?.nickname ? (
                <span className="block text-xs font-semibold text-emerald-700 mt-0.5">
                  ({profile.nickname})
                </span>
              ) : null}
            </h2>
            <p className="text-xs text-emerald-700 font-mono mt-0.5">@{profile?.username}</p>

            <span
              className={`mt-2.5 inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-semibold ${
                role === 'admin'
                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
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
                {profile?.last_seen
                  ? new Date(profile.last_seen).toLocaleString('th-TH', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }) + ' น.'
                  : 'กำลังใช้งานในปัจจุบัน'}
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>วันที่สร้างบัญชี:</span>
              </span>
              <span className="font-medium text-slate-800">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString('th-TH', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Profile Edit & Password Change */}
        <div className="md:col-span-2 space-y-6">
          {/* Card 1: Edit Profile Name, Nickname & Avatar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Camera className="h-4 w-4 text-emerald-600" />
                  <span>แก้ไขข้อมูลโปรไฟล์และเลือกรูปอวตาร</span>
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  แก้ไขชื่อ-นามสกุล ชื่อเล่นที่แสดงผลในระบบ และเลือกรูปโปรไฟล์ของคุณ
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    ชื่อ-นามสกุล (สำหรับแสดงในระบบ) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="เช่น คุณครูสมศรี รักการสอน"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    ชื่อเล่น (Nickname)
                  </label>
                  <input
                    type="text"
                    value={editNickname}
                    onChange={(e) => setEditNickname(e.target.value)}
                    placeholder="เช่น ครูแนน, ครูอาร์ม"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Avatar Selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-slate-700">
                    เลือกรูปตัวละคร / อวตารที่คุณชอบ (คลิกเปลี่ยนได้ทันที)
                  </label>
                  <span className="text-[11px] text-emerald-700 font-semibold">
                    แสดงตัวอย่างทันทีในรูปโปรไฟล์ด้านซ้าย
                  </span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-3">
                  {PRESET_AVATARS.map((av) => {
                    const isSelected = editAvatarUrl === av.url
                    return (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => {
                          setEditAvatarUrl(av.url)
                          showToast(`เลือก ${av.name} แล้ว (อย่าลืมกดบันทึก)`, 'success')
                        }}
                        title={av.name}
                        className={`relative rounded-xl p-1 border-2 transition-all cursor-pointer transform hover:scale-105 active:scale-95 ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-200 scale-105'
                            : 'border-slate-200 hover:border-emerald-300 bg-white'
                        }`}
                      >
                        <img
                          src={av.url}
                          alt={av.name}
                          className="h-10 w-10 mx-auto rounded-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute top-0 right-0 bg-emerald-600 text-white rounded-full p-0.5 shadow-xs">
                            <Check className="h-2.5 w-2.5" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Upload Custom Avatar */}
                <div className="mb-3 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 p-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    className="hidden"
                    id="avatar-upload-file-input"
                  />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      className="inline-flex items-center gap-2 rounded-xl bg-white border border-emerald-300 px-3.5 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100/70 transition-colors shadow-2xs cursor-pointer self-start sm:self-auto"
                    >
                      {isUploadingAvatar ? (
                        <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                      ) : (
                        <Upload className="h-4 w-4 text-emerald-600" />
                      )}
                      <span>{isUploadingAvatar ? 'กำลังอัปโหลด...' : '📷 เลือกรูปภาพจากเครื่อง'}</span>
                    </button>
                    <span className="text-[11px] text-slate-500">
                      รองรับ JPG, PNG, WEBP (ไม่เกิน 3MB)
                    </span>
                  </div>
                  {uploadError && (
                    <p className="mt-2 text-xs text-red-600 font-medium">⚠️ {uploadError}</p>
                  )}
                </div>

                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mb-1">
                  <Sparkles className="h-3 w-3 text-emerald-500" />
                  <span>หรือใส่ URL รูปภาพโปรไฟล์ที่คุณต้องการ:</span>
                </div>
                <input
                  type="url"
                  value={editAvatarUrl}
                  onChange={(e) => setEditAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>กำลังบันทึกข้อมูล...</span>
                    </>
                  ) : (
                    <span>บันทึกการแก้ไขโปรไฟล์</span>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: Change Password */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Key className="h-4 w-4 text-emerald-600" />
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
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none"
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
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-emerald-600/20 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isUpdatingPassword ? (
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
    </div>
  )
}
