import React from 'react'
import { Printer, X, CheckCircle2, GraduationCap } from 'lucide-react'

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden my-8">
        {/* Modal Controls (Hidden in Print) */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-3.5 bg-slate-950/70 print:hidden">
          <div className="flex items-center gap-2 text-white text-sm font-semibold">
            <Printer className="h-4 w-4 text-blue-400" />
            <span>ตัวอย่างก่อนพิมพ์: ใบนำส่งภาระงานราชการ</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 shadow-md shadow-blue-600/20 transition-colors cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>สั่งพิมพ์ (Print)</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-800 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Body (A4 Ready) */}
        <div className="p-8 bg-white text-slate-900 font-sans print:p-0 print:m-0">
          {/* Header */}
          <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
            <div className="flex items-center justify-center gap-2 mb-1">
              <GraduationCap className="h-7 w-7 text-blue-800" />
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                โรงเรียน (School Work Hub)
              </h1>
            </div>
            <h2 className="text-base font-semibold text-slate-800">
              ใบนำส่งผลงานและการปฏิบัติงานราชการ
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              ระบบบริหารจัดการภาระงานฝ่ายวิชาการและงานสนับสนุนการศึกษา
            </p>
          </div>

          {/* Metadata Section */}
          <div className="grid grid-cols-2 gap-4 text-xs mb-6 border border-slate-300 rounded-lg p-3.5 bg-slate-50">
            <div>
              <p className="text-slate-600">ผู้ส่งผลงาน / ผู้ปฏิบัติงาน:</p>
              <p className="font-bold text-slate-900 text-sm">{teacherName}</p>
              <p className="text-slate-500">(@{teacherUsername})</p>
            </div>
            <div>
              <p className="text-slate-600">สังกัดกลุ่มสาระการเรียนรู้ / ฝ่ายงาน:</p>
              <p className="font-bold text-slate-900 text-sm">{groupName || 'ส่วนกลางโรงเรียน'}</p>
              <p className="text-slate-600 mt-1">
                วันที่นำส่ง:{' '}
                <span className="font-medium text-slate-900">
                  {submittedAt ? new Date(submittedAt).toLocaleString('th-TH') : '-'}
                </span>
              </p>
            </div>
          </div>

          {/* Task Information */}
          <div className="space-y-4 text-xs">
            <div className="border-b border-slate-200 pb-3">
              <p className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider mb-1">
                ๑. หัวข้อภาระงานที่ได้รับมอบหมาย
              </p>
              <p className="text-sm font-bold text-slate-900">{taskTitle}</p>
              {taskDescription && (
                <p className="text-slate-600 mt-1 leading-relaxed">{taskDescription}</p>
              )}
            </div>

            <div className="border-b border-slate-200 pb-3">
              <p className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider mb-1">
                ๒. สรุปผลการดำเนินงาน / รายละเอียดการส่งงาน
              </p>
              <p className="text-slate-900 leading-relaxed whitespace-pre-wrap">
                {submissionNote || 'ส่งเอกสารตามข้อกำหนดของโรงเรียนครบถ้วน'}
              </p>
            </div>

            {submissionUrl && (
              <div className="border-b border-slate-200 pb-3">
                <p className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider mb-1">
                  ๓. แหล่งอ้างอิงเอกสารออนไลน์ (Google Drive / ลิงก์ไฟล์งาน)
                </p>
                <p className="text-blue-700 font-mono text-[11px] break-all">{submissionUrl}</p>
              </div>
            )}

            <div className="border-b border-slate-200 pb-3">
              <p className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider mb-1">
                ๔. ผลการตรวจรับและการประเมินของฝ่ายวิชาการ
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-bold text-slate-900">สถานะ:</span>
                <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  {formatStatusText(status)}
                </span>
              </div>
              {feedback && (
                <div className="mt-2 p-2.5 bg-slate-100 rounded text-slate-800">
                  <p className="font-medium text-slate-700">ข้อเสนอแนะเพิ่มเติม:</p>
                  <p>{feedback}</p>
                </div>
              )}
            </div>
          </div>

          {/* Signature Blocks */}
          <div className="grid grid-cols-2 gap-8 text-center text-xs mt-12 pt-6">
            <div className="space-y-1">
              <p className="mb-8">ลงชื่อ..........................................................</p>
              <p className="font-bold text-slate-900">( {teacherName} )</p>
              <p className="text-slate-600">ตำแหน่ง ครูผู้สอน / ผู้จัดทำ</p>
              <p className="text-slate-500 mt-1">วันที่......../......../............</p>
            </div>

            <div className="space-y-1">
              <p className="mb-8">ลงชื่อ..........................................................</p>
              <p className="font-bold text-slate-900">
                ( {reviewerName ? reviewerName : '..........................................................'} )
              </p>
              <p className="text-slate-600">ตำแหน่ง หัวหน้าฝ่ายวิชาการ / ผู้ตรวจรับ</p>
              <p className="text-slate-500 mt-1">วันที่......../......../............</p>
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-12 text-center text-[10px] text-slate-400 border-t border-slate-200 pt-2">
            เอกสารฉบับนี้พิมพ์จากระบบ School Work Hub เมื่อวันที่ {new Date().toLocaleString('th-TH')}
          </div>
        </div>
      </div>
    </div>
  )
}
