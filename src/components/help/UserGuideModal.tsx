import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  BookOpen,
  CheckSquare,
  ClipboardList,
  Smartphone,
  Printer,
  Download,
} from 'lucide-react'

export interface UserGuideModalProps {
  isOpen: boolean
  onClose: () => void
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'teacher' | 'admin' | 'pwa'>('teacher')

  if (!isOpen) {
    return null
  }

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden my-8 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/80">
          <div className="flex items-center gap-2.5 text-slate-900">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold">คู่มือการใช้งานระบบ School Work Hub</h2>
              <p className="text-[11px] text-slate-500">โรงเรียนสารสาสน์วิเทศราชพฤกษ์</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50/50 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('teacher')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all cursor-pointer border-b-2 ${
              activeTab === 'teacher'
                ? 'border-blue-600 text-blue-700 bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CheckSquare className="h-4 w-4" />
            <span>สำหรับคุณครู (Teacher)</span>
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all cursor-pointer border-b-2 ${
              activeTab === 'admin'
                ? 'border-purple-600 text-purple-700 bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            <span>สำหรับผู้ดูแลระบบ (Admin)</span>
          </button>

          <button
            onClick={() => setActiveTab('pwa')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all cursor-pointer border-b-2 ${
              activeTab === 'pwa'
                ? 'border-emerald-600 text-emerald-700 bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone className="h-4 w-4" />
            <span>การติดตั้งแอป (PWA)</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-5 text-xs text-slate-700">
          {/* TEACHER TAB */}
          {activeTab === 'teacher' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
                <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-xs text-blue-700 font-bold">
                    1
                  </span>
                  <span>การส่งภาระงานและแผนการสอน</span>
                </div>
                <p className="leading-relaxed text-slate-600">
                  ไปที่เมนู <strong className="text-slate-900">"ภาระงานของฉัน"</strong> เลือกรายการภาระงานที่ต้องการส่ง จากนั้นกดปุ่ม <strong className="text-blue-600">"ส่งงาน"</strong>
                </p>
                <div className="rounded-lg bg-white p-3 border border-slate-200 text-[11px] text-slate-600 space-y-1.5">
                  <p>• <strong>บันทึกสรุปผลงาน:</strong> กรอกข้อความอธิบายสรุปสั้นๆ เกี่ยวกับผลงาน</p>
                  <p>• <strong>อัปโหลดลากวางไฟล์:</strong> สามารถลากไฟล์ผลงาน เช่น PDF, Word หรือคลิกเลือกไฟล์เพื่อส่งงานได้ทันที</p>
                  <p>• <strong>Google Drive โฟลเดอร์รวม:</strong> กดปุ่มเปิดโฟลเดอร์ Google Drive รวมส่งงานของโรงเรียนได้โดยตรง</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
                <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-xs text-blue-700 font-bold">
                    2
                  </span>
                  <span>การตรวจดูผลตรวจและพิมพ์ใบนำส่งงาน</span>
                </div>
                <p className="leading-relaxed text-slate-600">
                  เมื่อส่งงานแล้ว สามารถติดตามผลการตรวจรับได้ในแท็บ <strong className="text-slate-900">"ส่งแล้ว"</strong> หรือ <strong className="text-emerald-600">"อนุมัติแล้ว"</strong> หากฝ่ายวิชาการมีข้อเสนอแนะเพิ่มเติมจะปรากฏกล่องข้อคิดเห็น
                </p>
                <div className="flex items-center gap-2 text-[11px] text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                  <Printer className="h-4 w-4 text-blue-600 shrink-0" />
                  <span>สามารถกดปุ่ม <strong className="text-slate-900">"ใบนำส่ง"</strong> เพื่อเปิดแบบฟอร์มทางการและสั่งพิมพ์ลงบนกระดาษ A4 ได้ทันที</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
                <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-xs text-blue-700 font-bold">
                    3
                  </span>
                  <span>การใช้งานคลัง Drive & ห้องสื่อสาร</span>
                </div>
                <p className="leading-relaxed text-slate-600">
                  เข้าถึงแม่แบบเอกสารส่วนตัวได้ที่เมนู <strong className="text-slate-900">"คลัง Drive"</strong> (เห็นเฉพาะของตนเอง) และสื่อสารประสานงานกับเพื่อนครูได้ผ่านเมนู <strong className="text-purple-600">"ห้องสื่อสาร"</strong> พร้อมระบบเสียงแจ้งเตือนแบบเรียลไทม์
                </p>
              </div>
            </div>
          )}

          {/* ADMIN TAB */}
          {activeTab === 'admin' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
                <div className="flex items-center gap-2 text-purple-700 font-bold text-sm">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 text-xs text-purple-700 font-bold">
                    1
                  </span>
                  <span>การสร้างและมอบหมายภาระงานโรงเรียน</span>
                </div>
                <p className="leading-relaxed text-slate-600">
                  ไปที่เมนู <strong className="text-slate-900">"จัดการงาน"</strong> กดปุ่ม <strong className="text-purple-600">"มอบหมายงานใหม่"</strong> สามารถกำหนดงานย่อย (Subtasks) และเลือกผู้รับมอบหมายได้ 3 รูปแบบ: ครูทุกคน, เฉพาะกลุ่มสาระฯ, หรือระบุครูรายบุคคล
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
                <div className="flex items-center gap-2 text-purple-700 font-bold text-sm">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 text-xs text-purple-700 font-bold">
                    2
                  </span>
                  <span>การตรวจรับผลงาน Checklist & ส่งออกรายงาน</span>
                </div>
                <p className="leading-relaxed text-slate-600">
                  กดปุ่ม <strong className="text-slate-900">"ตรวจรับงาน"</strong> ในแต่ละภาระงาน เพื่อดู Checklist ตรวจสอบรายชื่อครูว่าใครส่งงานแล้ว ใครยังไม่ส่ง
                </p>
                <div className="flex items-center gap-2 text-[11px] text-emerald-700 font-medium bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                  <Download className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>สามารถกดปุ่ม "ส่งออก CSV" เพื่อนำข้อมูลไปเปิดใน Microsoft Excel ได้ทันที</span>
                </div>
              </div>
            </div>
          )}

          {/* PWA INSTALL TAB */}
          {activeTab === 'pwa' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                  <Smartphone className="h-5 w-5" />
                  <span>การติดตั้งบนสมาร์ตโฟน Android</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-600 leading-relaxed">
                  <li>เปิดเว็บไซต์ผ่านเบราว์เซอร์ Google Chrome</li>
                  <li>กดปุ่ม <strong className="text-emerald-600">"ติดตั้งแอปเลย"</strong> ที่แถบแบนเนอร์ด้านล่างจอ</li>
                  <li>หรือกดเมนู 3 จุด (⋮) เลือก <strong className="text-slate-800">"ติดตั้งแอปพลิเคชัน" (Install App)</strong></li>
                </ol>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                  <Smartphone className="h-5 w-5" />
                  <span>การติดตั้งบน iPhone / iPad (iOS)</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-600 leading-relaxed">
                  <li>เปิดเว็บไซต์ผ่าน Safari</li>
                  <li>กดปุ่มแชร์ (สี่เหลี่ยมมีลูกศรชี้ขึ้น) แล้วเลือก <strong className="text-slate-800">"เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen)</strong></li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3.5 bg-slate-50 text-xs text-slate-500">
          <span>School Work Hub Documentation</span>
          <button
            onClick={onClose}
            className="rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer"
          >
            เข้าใจแล้ว
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
