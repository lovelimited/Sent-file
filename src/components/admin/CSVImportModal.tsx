import React, { useState, useCallback } from 'react'
import { Upload, FileText, Loader2, CheckCircle2, XCircle, X, Download } from 'lucide-react'
import { createUser, type CreateUserPayload } from '@/services/userService'

interface CSVRow {
  username: string
  name: string
  password: string
  group_name?: string
}

interface ImportResult {
  row: number
  username: string
  name: string
  success: boolean
  error?: string
}

interface CSVImportModalProps {
  groups: { id: string; name: string }[]
  onClose: () => void
  onComplete: () => void
}

export const CSVImportModal: React.FC<CSVImportModalProps> = ({ groups, onClose, onComplete }) => {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload')
  const [rows, setRows] = useState<CSVRow[]>([])
  const [results, setResults] = useState<ImportResult[]>([])
  const [progress, setProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const parseCSV = useCallback((text: string) => {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
    if (lines.length < 2) return [] // Need header + at least 1 row

    const parsed: CSVRow[] = []
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''))
      if (cols.length >= 3) {
        parsed.push({
          username: cols[0]?.toLowerCase() || '',
          name: cols[1] || '',
          password: cols[2] || 'school1234',
          group_name: cols[3] || undefined,
        })
      }
    }
    return parsed
  }, [])

  const handleFileSelect = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const parsed = parseCSV(text)
      if (parsed.length === 0) {
        alert('ไฟล์ CSV ไม่มีข้อมูล หรือรูปแบบไม่ถูกต้อง')
        return
      }
      setRows(parsed)
      setStep('preview')
    }
    reader.readAsText(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files?.[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleStartImport = async () => {
    if (!window.confirm(`ยืนยันการนำเข้าครู ${rows.length} คน?`)) return

    setStep('importing')
    const importResults: ImportResult[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      setProgress(Math.round(((i + 1) / rows.length) * 100))

      // Find group ID by name
      let groupId: string | null = null
      if (row.group_name) {
        const matchedGroup = groups.find(
          (g) => g.name.toLowerCase() === row.group_name!.toLowerCase()
        )
        groupId = matchedGroup?.id || null
      }

      const payload: CreateUserPayload = {
        username: row.username,
        name: row.name,
        password: row.password,
        role: 'teacher',
        group_id: groupId,
      }

      const res = await createUser(payload)
      importResults.push({
        row: i + 1,
        username: row.username,
        name: row.name,
        success: res.success,
        error: res.error,
      })
    }

    setResults(importResults)
    setStep('done')
  }

  const successCount = results.filter((r) => r.success).length
  const failCount = results.filter((r) => !r.success).length

  const downloadTemplate = () => {
    const csv = 'username,name,password,group_name\nteacher_thai,นายสมชาย ใจดี,school1234,ภาษาไทย\nteacher_math,นางสาวสมหญิง คำนวณ,school1234,คณิตศาสตร์\n'
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template_import_teachers.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4">
      <div className="flex min-h-full items-center justify-center p-1 sm:p-2">
        <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-150 my-auto max-h-[92vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 sm:pb-4 mb-3 sm:mb-4 shrink-0">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Upload className="h-5 w-5 text-emerald-600" />
                <span>นำเข้าบัญชีครูจากไฟล์ CSV</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">เพิ่มบัญชีครูหลายคนพร้อมกันจากไฟล์สเปรดชีต</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer">
              <X className="h-5 w-5" />
            </button>
          </div>

        <div className="flex-1 overflow-y-auto">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <button
                onClick={downloadTemplate}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>ดาวน์โหลดตัวอย่างไฟล์ CSV</span>
              </button>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                <p className="font-semibold text-slate-800 mb-1">รูปแบบไฟล์ CSV:</p>
                <code className="block bg-white rounded-lg p-2 border border-slate-200 text-[11px] font-mono">
                  username,name,password,group_name<br />
                  teacher_thai,นายสมชาย ใจดี,school1234,ภาษาไทย<br />
                  teacher_math,นางสาวสมหญิง,school1234,คณิตศาสตร์
                </code>
              </div>

              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById('csv-file-input')?.click()}
                className={`rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
                  isDragging ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 hover:border-emerald-400 bg-slate-50/60'
                }`}
              >
                <input
                  id="csv-file-input"
                  type="file"
                  className="hidden"
                  accept=".csv"
                  onChange={(e) => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]) }}
                />
                <FileText className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">ลากไฟล์ CSV มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์</p>
                <p className="text-xs text-slate-400 mt-1">รองรับไฟล์ .csv เท่านั้น</p>
              </div>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-800">ตรวจสอบข้อมูลก่อนนำเข้า ({rows.length} รายการ)</p>
              <div className="rounded-xl border border-slate-200 overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 text-slate-600 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">#</th>
                      <th className="px-3 py-2 text-left">Username</th>
                      <th className="px-3 py-2 text-left">ชื่อ</th>
                      <th className="px-3 py-2 text-left">กลุ่มสาระฯ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-3 py-1.5 text-slate-400">{i + 1}</td>
                        <td className="px-3 py-1.5 font-mono text-slate-700">{row.username}</td>
                        <td className="px-3 py-1.5 text-slate-800">{row.name}</td>
                        <td className="px-3 py-1.5 text-slate-600">{row.group_name || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button onClick={() => { setStep('upload'); setRows([]) }} className="rounded-xl px-4 py-2 text-xs font-medium text-slate-600 border border-slate-200 hover:bg-slate-100 cursor-pointer">
                  เลือกไฟล์ใหม่
                </button>
                <button onClick={handleStartImport} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 cursor-pointer">
                  <Upload className="h-3.5 w-3.5" />
                  <span>เริ่มนำเข้า {rows.length} รายการ</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Importing */}
          {step === 'importing' && (
            <div className="space-y-4 py-6 text-center">
              <Loader2 className="h-10 w-10 text-emerald-500 animate-spin mx-auto" />
              <p className="text-sm font-semibold text-slate-800">กำลังนำเข้าบัญชีครู...</p>
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden max-w-sm mx-auto">
                <div className="bg-emerald-500 h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-slate-500">{progress}%</p>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 'done' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-emerald-800">นำเข้าเสร็จสิ้น</p>
                  <p className="text-xs text-emerald-600">สำเร็จ {successCount} / {results.length} รายการ {failCount > 0 && `(ล้มเหลว ${failCount} รายการ)`}</p>
                </div>
              </div>

              {failCount > 0 && (
                <div className="rounded-xl border border-red-200 overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-red-50 text-red-700 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">#</th>
                        <th className="px-3 py-2 text-left">Username</th>
                        <th className="px-3 py-2 text-left">ข้อผิดพลาด</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-100">
                      {results.filter((r) => !r.success).map((r) => (
                        <tr key={r.row}>
                          <td className="px-3 py-1.5 text-slate-400">{r.row}</td>
                          <td className="px-3 py-1.5 font-mono flex items-center gap-1">
                            <XCircle className="h-3 w-3 text-red-500" /> {r.username}
                          </td>
                          <td className="px-3 py-1.5 text-red-600">{r.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex items-center justify-end">
                <button
                  onClick={() => { onComplete(); onClose() }}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 cursor-pointer"
                >
                  เสร็จสิ้น
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}
