import React from 'react'

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-emerald-100 bg-white py-5 text-xs text-slate-500 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left text-slate-400 text-[11px]">
          <div className="flex items-center gap-2.5">
            <img
              src="/school-logo.png"
              alt="School Logo"
              className="h-6 w-6 object-contain rounded-full border border-amber-200"
            />
            <span>
              School Work Hub © {new Date().getFullYear()} — โรงเรียนสารสาสน์วิเทศราชพฤกษ์
            </span>
          </div>

          <div className="text-slate-500 text-[11px]">
            <span>พัฒนาโดย <strong className="text-emerald-700">ม.กฤตพจน์ แก้วกา</strong></span>
          </div>
        </div>
      </div>
    </footer>
  )
}
