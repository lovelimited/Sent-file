import React from 'react'
import { createPortal } from 'react-dom'
import { Printer, X, CheckCircle2 } from 'lucide-react'

export interface PrintableTaskSlipProps {
  taskTitle: string
  taskDescription?: string | null
  teacherName: string
  teacherUsername: string
  groupName?: string | null
  submittedAt?: string | null
  submissionNote?: string | null
  submissionUrl?: string | null
  status: string
  feedback?: string | null
  reviewerName?: string | null
  onClose: () => void
}

export const PrintableTaskSlip: React.FC<PrintableTaskSlipProps> = ({
  taskTitle,
  taskDescription,
  teacherName,
  teacherUsername,
  groupName,
  submittedAt,
  submissionNote,
  submissionUrl,
  status,
  feedback,
  reviewerName,
  onClose,
}) => {
  const handlePrint = () => {
    window.print()
  }

  const formatStatusText = (st: string) => {
    switch (st) {
      case 'approved':
        return 'ผ่านการอนุมัติเรียบร้อย'
      case 'submitted':
        return 'ส่งเอกสารแล้ว (รอตรวจรับ)'
      case 'rejected':
        return 'ขอให้แก้ไขเพิ่มเติม'
      default:
        return 'อยู่ระหว่างดำเนินการ'
    }
  }

  const modalContent = (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden my-4 sm:my-8">
        {/* Modal Controls - STICKY TOP so always visible on any screen size */}
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 px-6 py-3.5 bg-white/95 backdrop-blur-md shadow-xs print:hidden">
          <div className="flex items-center gap-2 text-slate-800 text-sm font-semibold">
            <Printer className="h-4 w-4 text-blue-600" />
            <span>ตัวอย่างก่อนพิมพ์: ใบนำส่งภาระงานราชการ</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>สั่งพิมพ์ (Print)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
              aria-label="ปิดหน้าต่าง"
            >
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">ปิด</span>
            </button>
          </div>
        </div>

        {/* Printable Document Body (A4 Ready) */}
        <div className="p-6 sm:p-10 bg-white text-slate-900 font-sans print:p-0 print:m-0">
          {/* Header with Sarasas Crest */}
          <div className="text-center border-b-2 border-slate-800 pb-5 mb-6">
            <div className="flex items-center justify-center gap-3 mb-2">
              <img
                src="/school-logo.png"
                alt="School Emblem"
                className="h-14 w-14 object-contain rounded-full border border-amber-300 p-0.5"
              />
              <div className="text-left">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 leading-tight">
                  โรงเรียนสารสาสน์วิเทศราชพฤกษ์
                </h1>
                <p className="text-xs text-blue-800 font-medium">
                  Sarasas Witaed Ratchaphruek School
                </p>
              </div>
            </div>
            <h2 className="text-base font-bold text-slate-800 mt-2">
              ใบนำส่งผลงานและการปฏิบัติงานราชการ
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              ระบบบริหารจัดการภาระงานฝ่ายวิชาการและงานสนับสนุนการศึกษา (School Work Club)
            </p>
          </div>

          {/* Metadata Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs mb-6 border border-slate-200 rounded-xl p-4 bg-slate-50">
            <div>
              <p className="text-slate-500">ผู้ส่งผลงาน / ผู้ปฏิบัติงาน:</p>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{teacherName}</p>
              <p className="text-slate-500">ชื่อผู้ใช้: @{teacherUsername}</p>
            </div>
            <div>
              <p className="text-slate-500">สังกัดกลุ่มสาระการเรียนรู้ / ฝ่ายงาน:</p>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{groupName || 'ส่วนกลางโรงเรียน'}</p>
              <p className="text-slate-500 mt-0.5">
                วันที่นำส่ง:{' '}
                <span className="font-semibold text-slate-800">
                  {submittedAt ? new Date(submittedAt).toLocaleString('th-TH') : '-'}
                </span>
              </p>
            </div>
          </div>

          {/* Task Information */}
          <div className="space-y-4 text-xs">
            <div className="border-b border-slate-200 pb-3">
              <p className="font-bold text-slate-700 text-[11px] uppercase tracking-wider mb-1">
                ๑. หัวข้อภาระงานที่ได้รับมอบหมาย
              </p>
              <p className="text-sm font-bold text-slate-900">{taskTitle}</p>
              {taskDescription && (
                <p className="text-slate-600 mt-1 leading-relaxed">{taskDescription}</p>
              )}
            </div>

            <div className="border-b border-slate-200 pb-3">
              <p className="font-bold text-slate-700 text-[11px] uppercase tracking-wider mb-1">
                ๒. สรุปผลการดำเนินงาน / รายละเอียดการส่งงาน
              </p>
              <p className="text-slate-900 leading-relaxed whitespace-pre-wrap">
                {submissionNote || 'ส่งเอกสารตามข้อกำหนดของโรงเรียนครบถ้วน'}
              </p>
            </div>

            {submissionUrl && (
              <div className="border-b border-slate-200 pb-3">
                <p className="font-bold text-slate-700 text-[11px] uppercase tracking-wider mb-1">
                  ๓. แหล่งอ้างอิงเอกสารออนไลน์ (Google Drive / ลิงก์ไฟล์งาน)
                </p>
                <p className="text-blue-700 font-mono text-[11px] break-all">{submissionUrl}</p>
              </div>
            )}

            <div className="border-b border-slate-200 pb-3">
              <p className="font-bold text-slate-700 text-[11px] uppercase tracking-wider mb-1">
                ๔. ผลการตรวจรับและการประเมินของฝ่ายวิชาการ
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-bold text-slate-900">สถานะ:</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  {formatStatusText(status)}
                </span>
              </div>
              {feedback && (
                <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-800">
                  <p className="font-semibold text-slate-700">ข้อเสนอแนะเพิ่มเติม:</p>
                  <p className="mt-0.5 leading-relaxed">{feedback}</p>
                </div>
              )}
            </div>
          </div>

          {/* Signature Blocks */}
          <div className="grid grid-cols-2 gap-8 text-center text-xs mt-10 pt-4">
            <div className="space-y-1">
              <p className="mb-8 text-slate-400">ลงชื่อ..........................................................</p>
              <p className="font-bold text-slate-900">( {teacherName} )</p>
              <p className="text-slate-600">ตำแหน่ง ครูผู้สอน / ผู้จัดทำ</p>
              <p className="text-slate-400 mt-1">วันที่......../......../............</p>
            </div>

            <div className="space-y-1">
              <p className="mb-8 text-slate-400">ลงชื่อ..........................................................</p>
              <p className="font-bold text-slate-900">
                ( {reviewerName ? reviewerName : '..........................................................'} )
              </p>
              <p className="text-slate-600">ตำแหน่ง หัวหน้าฝ่ายวิชาการ / ผู้ตรวจรับ</p>
              <p className="text-slate-400 mt-1">วันที่......../......../............</p>
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-10 text-center text-[10px] text-slate-400 border-t border-slate-200 pt-3">
            เอกสารฉบับนี้พิมพ์จากระบบ School Work Hub เมื่อวันที่ {new Date().toLocaleString('th-TH')}
          </div>
        </div>

        {/* Bottom Close Bar (hidden on print) */}
        <div className="border-t border-slate-200 px-6 py-3 bg-slate-50 flex items-center justify-end gap-2 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm transition-colors cursor-pointer"
          >
            สั่งพิมพ์
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
