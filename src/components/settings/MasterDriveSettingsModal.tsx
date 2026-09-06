import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  FolderOpen,
  ExternalLink,
  Lock,
  AlertTriangle,
  Loader2,
  X,
  Save,
  Code2,
  Copy,
  Check,
  Zap,
  HelpCircle,
} from 'lucide-react'
import {
  getMasterDriveUrl,
  updateMasterDriveUrl,
  getGasWebAppUrl,
  updateGasWebAppUrl,
} from '@/services/driveService'
import { showSuccess, showError, showToast } from '@/utils/sweetalert'
import { useAuth } from '@/hooks/useAuth'

interface MasterDriveSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

const GAS_CODE_SAMPLE = `/**
 * School Work Club - Google Apps Script (Sent-File API)
 * ระบบจัดเก็บและจัดการโครงสร้างโฟลเดอร์ Google Drive โรงเรียนอัตโนมัติ
 * โฟลเดอร์: [Master] -> [หมวดหมู่งาน] -> [ชื่องาน] -> [ชื่อครู]
 */
var DEFAULT_MASTER_FOLDER_ID = '1cPV7A4j49UAtOSEZQMKOMAllsm6LDv5i';

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    service: 'School Work Club - Google Apps Script Drive API',
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var rawData = e.postData ? e.postData.contents : '';
    if (!rawData) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Empty payload' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    var data = JSON.parse(rawData);
    if (data.action === 'ping') {
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Connected!' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var fileData = data.fileData;
    var fileName = data.fileName || 'unnamed_file';
    var mimeType = data.mimeType || 'application/octet-stream';
    var category = (data.category || 'งานทั่วไป').trim();
    var taskTitle = (data.taskTitle || 'ภาระงานทั่วไป').trim();
    var teacherName = (data.teacherName || 'บุคลากรทั่วไป').trim();
    var subtaskTitle = (data.subtaskTitle || '').trim();
    var masterFolderId = data.masterFolderId || DEFAULT_MASTER_FOLDER_ID;

    if (!fileData) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'No file data' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var masterFolder = DriveApp.getFolderById(masterFolderId);
    var categoryFolder = getOrCreateSubFolder(masterFolder, category);
    var taskFolder = getOrCreateSubFolder(categoryFolder, taskTitle);
    var teacherFolder = getOrCreateSubFolder(taskFolder, teacherName);

    var cleanFileName = fileName;
    if (subtaskTitle) {
      cleanFileName = '[' + subtaskTitle.replace(/[/\\\\?%*:|"<>]/g, '_') + '] ' + cleanFileName;
    }

    var decodedBytes = Utilities.base64Decode(fileData);
    var blob = Utilities.newBlob(decodedBytes, mimeType, cleanFileName);
    var createdFile = teacherFolder.createFile(blob);

    try {
      createdFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {}

    var result = {
      success: true,
      fileId: createdFile.getId(),
      fileName: createdFile.getName(),
      fileUrl: createdFile.getUrl(),
      downloadUrl: 'https://drive.google.com/uc?export=download&id=' + createdFile.getId(),
      folder: {
        id: teacherFolder.getId(),
        name: teacherFolder.getName(),
        url: teacherFolder.getUrl()
      }
    };
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSubFolder(parentFolder, folderName) {
  if (!folderName || !folderName.trim()) return parentFolder;
  var cleanName = folderName.trim();
  var folders = parentFolder.getFoldersByName(cleanName);
  if (folders.hasNext()) return folders.next();
  return parentFolder.createFolder(cleanName);
}`

export const MasterDriveSettingsModal: React.FC<MasterDriveSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth()
  const [driveUrl, setDriveUrl] = useState('')
  const [gasUrl, setGasUrl] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [isTestingGas, setIsTestingGas] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      Promise.all([getMasterDriveUrl(), getGasWebAppUrl()]).then(([dUrl, gUrl]) => {
        setDriveUrl(dUrl)
        setGasUrl(gUrl)
        setIsLoading(false)
      })
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(GAS_CODE_SAMPLE)
      setCopiedCode(true)
      showToast('คัดลอกโค้ด Google Apps Script เรียบร้อยแล้ว', 'success')
      setTimeout(() => setCopiedCode(false), 3000)
    } catch {
      showToast('ไม่สามารถคัดลอกโค้ดได้อัตโนมัติ กรุณากดเลือกข้อความด้วยตนเอง', 'info')
    }
  }

  const handleTestGas = async () => {
    if (!gasUrl.trim()) {
      showError('ยังไม่มี URL', 'กรุณาระบุ URL ของ Google Apps Script Web App ก่อนทดสอบ')
      return
    }
    setIsTestingGas(true)
    try {
      const res = await fetch(gasUrl.trim(), { method: 'GET' })
      if (res.ok) {
        showSuccess('เชื่อมต่อสำเร็จ! 🎉', 'Google Apps Script Web App ตอบสนองปกติ พร้อมใช้งานสำหรับรับส่งไฟล์และสร้างโฟลเดอร์')
      } else {
        showError('เชื่อมต่อไม่สำเร็จ', `รหัสสถานะตอบกลับ: ${res.status}`)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error'
      showError('ไม่สามารถเชื่อมต่อได้', `ตรวจสอบว่าได้ตั้งค่า "ผู้ที่มีสิทธิ์เข้าถึง: ทุกคน (Anyone)" หรือยัง: ${msg}`)
    } finally {
      setIsTestingGas(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!driveUrl.trim()) {
      showError('กรุณาระบุลิงก์ Google Drive', 'ลิงก์ไม่สามารถเว้นว่างได้')
      return
    }

    setIsSaving(true)
    const [resDrive, resGas] = await Promise.all([
      updateMasterDriveUrl(driveUrl, user?.id),
      updateGasWebAppUrl(gasUrl, user?.id),
    ])
    setIsSaving(false)

    if (resDrive.success && resGas.success) {
      showSuccess('บันทึกการตั้งค่าแล้ว', 'อัปเดตโฟลเดอร์ Master และ Google Apps Script เรียบร้อย')
      onClose()
    } else {
      showError('ไม่สามารถบันทึกได้', resDrive.error || resGas.error || 'เกิดข้อผิดพลาดในการเชื่อมต่อ')
    }
  }

  const modalContent = (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="flex min-h-full items-center justify-center p-1 sm:p-2">
        <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col overflow-hidden my-auto max-h-[94vh]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-5 sm:py-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-white shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-emerald-600 p-2 text-white shadow-xs">
                <FolderOpen className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    ตั้งค่า Google Drive & Apps Script รวม
                  </h3>
                  <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 border border-emerald-200">
                    <Lock className="h-2.5 w-2.5" /> เฉพาะแอดมิน
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500">
                  สร้างโฟลเดอร์แยกหมวดหมู่งานและชื่อครูอัตโนมัติเมื่อครูส่งไฟล์
                </p>
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
          <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-2.5 text-xs text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-950 text-xs">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span>โครงสร้างการจัดเก็บไฟล์ใน Google Drive อัตโนมัติ</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  ระบบจะสร้างโฟลเดอร์ย่อยใน Google Drive อัตโนมัติตามลำดับ:
                  <strong className="block mt-0.5 text-emerald-900 font-semibold">
                    Master Folder ➔ [หมวดหมู่งาน/ฝ่าย] ➔ [ชื่อภาระงาน] ➔ [ชื่อครูผู้ส่ง] ➔ ไฟล์ผลงาน
                  </strong>
                </p>
              </div>

              {/* Master Google Drive Folder URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  1. ลิงก์โฟลเดอร์ Google Drive รวมของโรงเรียน (Master Folder URL)
                </label>
                {isLoading ? (
                  <div className="flex items-center gap-2 py-2 text-xs text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                    <span>กำลังโหลดข้อมูลลิงก์...</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <input
                      type="url"
                      required
                      value={driveUrl}
                      onChange={(e) => setDriveUrl(e.target.value)}
                      placeholder="https://drive.google.com/drive/folders/..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 transition-all font-mono"
                    />
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>โฟลเดอร์หลักที่ให้สิทธิ์ครูและระบบเข้าถึง</span>
                      {driveUrl && (
                        <a
                          href={driveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-medium"
                        >
                          <span>เปิดดูโฟลเดอร์ ↗</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Google Apps Script Web App URL */}
              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-800">
                    2. Google Apps Script Web App URL (สำหรับสร้างโฟลเดอร์และรับไฟล์)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowGuide(!showGuide)}
                    className="inline-flex items-center gap-1 text-[11px] text-teal-700 hover:text-teal-900 font-medium cursor-pointer"
                  >
                    <HelpCircle className="h-3 w-3" />
                    <span>{showGuide ? 'ซ่อนวิธีติดตั้ง' : 'ดูวิธีติดตั้ง 4 ขั้นตอน'}</span>
                  </button>
                </div>

                <div className="space-y-1.5">
                  <input
                    type="url"
                    value={gasUrl}
                    onChange={(e) => setGasUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 transition-all font-mono"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-slate-500">
                      URL ที่ได้จากการคลิก "ทำให้ใช้งานได้" ➔ "เว็บแอป" ในโครงการ Apps Script
                    </p>
                    {gasUrl && (
                      <button
                        type="button"
                        onClick={handleTestGas}
                        disabled={isTestingGas}
                        className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-800 hover:bg-teal-100 transition-colors cursor-pointer"
                      >
                        {isTestingGas ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Zap className="h-3 w-3 text-teal-600" />
                        )}
                        <span>ทดสอบเชื่อมต่อ</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Apps Script Guide & Code Copy Box */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-xs">
                    <Code2 className="h-4 w-4 text-emerald-600" />
                    <span>โค้ดสำเร็จรูปสำหรับโครงการ Sent-File (Google Apps Script)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-emerald-700 transition-colors cursor-pointer shadow-2xs"
                  >
                    {copiedCode ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedCode ? 'คัดลอกแล้ว!' : 'คัดลอกโค้ดทั้งหมด'}</span>
                  </button>
                </div>

                {showGuide && (
                  <div className="text-[11px] text-slate-600 space-y-1.5 border-t border-slate-200/80 pt-2">
                    <p className="font-semibold text-slate-700">📌 ขั้นตอนติดตั้งใน Google Apps Script:</p>
                    <ol className="list-decimal list-inside space-y-1 pl-1">
                      <li>
                        เปิดโปรเจกต์{' '}
                        <a
                          href="https://script.google.com/home/projects/1DHF-inVToYpRBEM7dayKWs-dxT3ZSlbvHW7aOcp9uRQEY_EROZ5TY6xZ/edit?hl=th"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-700 underline font-medium inline-flex items-center gap-0.5"
                        >
                          Sent-File ใน Apps Script <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </li>
                      <li>กดปุ่ม <strong>"คัดลอกโค้ดทั้งหมด"</strong> ด้านบน แล้วนำไปวางทับในไฟล์ <code className="bg-slate-200 px-1 rounded">รหัส.gs</code></li>
                      <li>กดปุ่มบันทึกโครงการ (รูปแผ่นดิสก์ หรือกด Ctrl + S)</li>
                      <li>คลิกปุ่มสีน้ำเงิน <strong>"ทำให้ใช้งานได้" (Deploy)</strong> ➔ <strong>"การทำให้ใช้งานได้รายการใหม่"</strong></li>
                      <li>เลือกประเภทเป็น <strong>"เว็บแอป"</strong> ➔ กำหนด <strong>"เข้าถึงได้โดย: ทุกคน (Anyone)"</strong></li>
                      <li>คัดลอก URL เว็บแอปที่ลงท้ายด้วย <code className="bg-slate-200 px-1 rounded">/exec</code> มาวางในช่องข้อ 2 ด้านบน</li>
                    </ol>
                  </div>
                )}

                <div className="relative">
                  <pre className="text-[10px] bg-slate-900 text-emerald-300 p-2.5 rounded-lg overflow-x-auto max-h-32 font-mono leading-relaxed select-all">
                    {GAS_CODE_SAMPLE}
                  </pre>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 px-4 py-3 sm:px-5 sm:py-3.5 border-t border-slate-100 bg-slate-50/50 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
              <button
                type="submit"
                disabled={isSaving || isLoading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-1.5 sm:px-5 sm:py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
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
    </div>
  )

  return createPortal(modalContent, document.body)
}
