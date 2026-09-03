import React, { useState } from 'react'
import {
  X,
  BookOpen,
  CheckSquare,
  ClipboardList,
  Smartphone,
  CheckCircle2,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/70">
          <div className="flex items-center gap-2.5 text-white">
            <BookOpen className="h-5 w-5 text-blue-400" />
            <h2 className="text-base font-bold">คู่มือการใช้งานระบบ School Work Hub</h2>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-slate-800 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('teacher')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all cursor-pointer border-b-2 ${
              activeTab === 'teacher'
                ? 'border-blue-500 text-blue-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckSquare className="h-4 w-4" />
            <span>สำหรับคุณครู (Teacher)</span>
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all cursor-pointer border-b-2 ${
              activeTab === 'admin'
                ? 'border-purple-500 text-purple-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            <span>สำหรับผู้ดูแลระบบ (Admin)</span>
          </button>

          <button
            onClick={() => setActiveTab('pwa')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all cursor-pointer border-b-2 ${
              activeTab === 'pwa'
                ? 'border-emerald-500 text-emerald-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="h-4 w-4" />
            <span>การติดตั้งแอป (PWA)</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6 text-xs text-slate-300">
          {/* TEACHER TAB */}
          {activeTab === 'teacher' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20 text-xs text-blue-400">
                    1
                  </span>
                  <span>การส่งภาระงานและแผนการสอน</span>
                </div>
                <p className="leading-relaxed text-slate-400">
                  ไปที่เมนู <strong className="text-slate-200">"ภาระงานของฉัน"</strong> เลือกรายการภาระงานที่ต้องการส่ง จากนั้นกดปุ่ม <strong className="text-blue-400">"ส่งงาน"</strong>
                </p>
                <div className="rounded-lg bg-slate-900 p-2.5 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                  <p>• <strong>บันทึกสรุปผลงาน:</strong> กรอกข้อความอธิบายสรุปสั้นๆ เกี่ยวกับผลงาน</p>
                  <p>• <strong>แนบลิงก์ผลงาน:</strong> วางลิงก์ Google Drive, Google Docs, หรือ Canva ที่เปิดสิทธิ์แชร์แล้ว</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20 text-xs text-blue-400">
                    2
                  </span>
                  <span>การตรวจดูผลตรวจและพิมพ์ใบนำส่งงาน</span>
                </div>
                <p className="leading-relaxed text-slate-400">
                  เมื่อส่งงานแล้ว สามารถติดตามผลการตรวจรับได้ในแท็บ <strong className="text-slate-200">"ส่งแล้ว"</strong> หรือ <strong className="text-emerald-400">"อนุมัติแล้ว"</strong> หากฝ่ายวิชาการมีข้อเสนอแนะเพิ่มเติมจะปรากฏกล่องข้อคิดเห็นสีเขียว/แดง
                </p>
                <div className="flex items-center gap-2 text-[11px] text-slate-300">
                  <Printer className="h-4 w-4 text-blue-400 shrink-0" />
                  <span>สามารถกดปุ่ม <strong className="text-slate-200">"ใบนำส่ง"</strong> เพื่อเปิดแบบฟอร์มทางการและสั่งพิมพ์ลงบนกระดาษ A4 ได้ทันที</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20 text-xs text-blue-400">
                    3
                  </span>
                  <span>การใช้งานคลัง Drive & ห้องสื่อสาร</span>
                </div>
                <p className="leading-relaxed text-slate-400">
                  เข้าถึงแม่แบบเอกสารทางการได้ที่เมนู <strong className="text-slate-200">"คลัง Drive"</strong> และสื่อสารประสานงานกับเพื่อนครูในกลุ่มสาระฯ เดียวกันได้ผ่านเมนู <strong className="text-purple-400">"ห้องสื่อสาร"</strong>
                </p>
              </div>
            </div>
          )}

          {/* ADMIN TAB */}
          {activeTab === 'admin' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500/20 text-xs text-purple-400">
                    1
                  </span>
                  <span>การสร้างและมอบหมายภาระงานโรงเรียน</span>
                </div>
                <p className="leading-relaxed text-slate-400">
                  ไปที่เมนู <strong className="text-slate-200">"จัดการงาน"</strong> กดปุ่ม <strong className="text-purple-400">"สร้างภาระงานใหม่"</strong> สามารถเลือกผู้รับมอบหมายได้ 3 รูปแบบ:
                </p>
                <div className="grid grid-cols-3 gap-2 text-[11px] text-center pt-1">
                  <div className="rounded-lg bg-slate-900 border border-slate-800 p-2 text-slate-200">
                    ครูทุกคนในโรงเรียน
                  </div>
                  <div className="rounded-lg bg-slate-900 border border-slate-800 p-2 text-slate-200">
                    เฉพาะกลุ่มสาระฯ
                  </div>
                  <div className="rounded-lg bg-slate-900 border border-slate-800 p-2 text-slate-200">
                    ระบุคุณครูรายบุคคล
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500/20 text-xs text-purple-400">
                    2
                  </span>
                  <span>การตรวจรับผลงาน & ส่งออกรายงาน Excel (CSV)</span>
                </div>
                <p className="leading-relaxed text-slate-400">
                  กดปุ่ม <strong className="text-slate-200">"ตรวจรับงาน"</strong> ในแต่ละภาระงาน เพื่อดูรายชื่อครูและลิงก์ผลงาน สามารถคลิกอนุมัติผลงาน หรือส่งกลับพร้อมบันทึก Feedback ให้ครูแก้ไข
                </p>
                <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-medium">
                  <Download className="h-4 w-4 shrink-0" />
                  <span>กดปุ่ม "ส่งออก CSV" เพื่อดาวน์โหลดรายงานความคืบหน้านำไปเปิดใน Microsoft Excel ได้ทันทีโดยสระไม่เพี้ยน</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500/20 text-xs text-purple-400">
                    3
                  </span>
                  <span>การจัดการครูและตรวจสอบประวัติระบบ</span>
                </div>
                <p className="leading-relaxed text-slate-400">
                  เพิ่มครูใหม่, รีเซ็ตรหัสผ่าน, ระงับบัญชีครูที่ย้ายได้ที่เมนู <strong className="text-slate-200">"จัดการครู"</strong> และตรวจสอบ Audit Trail ย้อนหลังได้ที่เมนู <strong className="text-slate-200">"ประวัติระบบ"</strong>
                </p>
              </div>
            </div>
          )}

          {/* PWA INSTALL TAB */}
          {activeTab === 'pwa' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <Smartphone className="h-5 w-5" />
                  <span>การติดตั้งบนสมาร์ตโฟน Android</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-400 leading-relaxed">
                  <li>เปิดเว็บไซต์ผ่านเบราว์เซอร์ Google Chrome</li>
                  <li>สังเกตแถบแบนเนอร์ด้านล่างจอ แล้วกดปุ่ม <strong className="text-emerald-400">"ติดตั้งแอปเลย"</strong></li>
                  <li>หรือกดเมนู 3 จุด (⋮) ที่มุมขวาบนของ Chrome เลือก <strong className="text-slate-200">"ติดตั้งแอปพลิเคชัน" (Install App)</strong></li>
                </ol>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <Smartphone className="h-5 w-5" />
                  <span>การติดตั้งบน iPhone / iPad (iOS)</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-400 leading-relaxed">
                  <li>เปิดเว็บไซต์ผ่านเบราว์เซอร์ Safari</li>
                  <li>กดปุ่มแชร์ (ไอคอนสี่เหลี่ยมมีลูกศรชี้ขึ้น) ที่แถบด้านล่าง</li>
                  <li>เลื่อนลงมาเลือก <strong className="text-slate-200">"เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen)</strong></li>
                </ol>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>การทำงานในโหมดออฟไลน์ (Offline Mode)</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  เมื่อติดตั้งแล้ว แม้อยู่ในพื้นที่ที่ไม่มีสัญญาณอินเทอร์เน็ต แอปพลิเคชันจะยังคงสามารถเปิดอ่านข้อมูลเอกสารและหน้าระบบที่เคยเปิดดูไว้ได้ตามปกติผ่าน Service Worker Cache
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 px-6 py-3 bg-slate-950/80 text-xs text-slate-500">
          <span>School Work Hub Documentation</span>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors cursor-pointer"
          >
            เข้าใจแล้ว
          </button>
        </div>
      </div>
    </div>
  )
}
