import React, { useState, useEffect } from 'react'
import { FolderOpen, ExternalLink, Lock, AlertTriangle, Loader2, X, Save } from 'lucide-react'
import { getMasterDriveUrl, updateMasterDriveUrl } from '@/services/driveService'
import { showSuccess, showError } from '@/utils/sweetalert'
import { useAuth } from '@/hooks/useAuth'

interface MasterDriveSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export const MasterDriveSettingsModal: React.FC<MasterDriveSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth()
  const [driveUrl, setDriveUrl] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      getMasterDriveUrl().then((url) => {
        setDriveUrl(url)
        setIsLoading(false)
      })
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!driveUrl.trim()) {
      showError('กรุณาระบุลิงก์ Google Drive', 'ลิงก์ไม่สามารถเว้นว่างได้')
      return
    }

    setIsSaving(true)
    const res = await updateMasterDriveUrl(driveUrl, user?.id)
    setIsSaving(false)

    if (res.success) {
      showSuccess('บันทึกการตั้งค่าแล้ว', 'โฟลเดอร์ Google Drive รวมของโรงเรียนได้รับการอัปเดตเรียบร้อย')
      onClose()
    } else {
      showError('ไม่สามารถบันทึกได้', res.error || 'เกิดข้อผิดพลาดในการเชื่อมต่อ')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-4 sm:p-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-emerald-600 p-2 text-white shadow-xs">
              <FolderOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-bold text-slate-900">ตั้งค่า Master Google Drive รวม</h3>
                <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 border border-emerald-200">
                  <Lock className="h-2.5 w-2.5" /> เฉพาะแอดมินหลัก
                </span>
              </div>
              <p className="text-xs text-slate-500">โฟลเดอร์ส่วนกลางสำหรับจัดเก็บไฟล์และทรัพยากรโรงเรียน</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-white hover:text-slate-700 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content / Form */}
        <form onSubmit={handleSave} className="p-4 sm:p-5 space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-950">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>ความปลอดภัยและการกำหนดสิทธิ์</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800">
              โฟลเดอร์นี้เป็นศูนย์กลางในการกระจายโฟลเดอร์ภาระงานและคลังไฟล์โรงเรียน เฉพาะแอดมินหลัก (Super Admin) เท่านั้นที่มีสิทธิ์เข้าถึงและเปลี่ยนแปลงลิงก์นี้
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              ลิงก์โฟลเดอร์ Google Drive รวมของโรงเรียน (Master URL)
            </label>
            {isLoading ? (
              <div className="flex items-center gap-2 py-3 text-xs text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                <span>กำลังโหลดข้อมูลลิงก์...</span>
              </div>
            ) : (
              <input
                type="url"
                required
                value={driveUrl}
                onChange={(e) => setDriveUrl(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 transition-all"
              />
            )}
            <p className="mt-1.5 text-[11px] text-slate-500">
              วาง URL ของโฟลเดอร์ Google Drive ที่แชร์ให้ครูหรือบุคลากรของโรงเรียน
            </p>
          </div>

          {driveUrl && (
            <div className="pt-1 flex items-center justify-between">
              <a
                href={driveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100 transition-colors"
              >
                <FolderOpen className="h-3.5 w-3.5 text-emerald-600" />
                <span>เปิดทดสอบโฟลเดอร์ Google Drive ↗</span>
                <ExternalLink className="h-3 w-3 text-emerald-500" />
              </a>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
            <button
              type="submit"
              disabled={isSaving || isLoading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>บันทึกการตั้งค่า</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
