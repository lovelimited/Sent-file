import React from 'react'
import { CheckCircle2, ShieldCheck, Database, FileCheck, MessageSquare, Cloud } from 'lucide-react'

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-200 bg-white py-8 text-xs text-slate-500 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Architecture Badges Bar */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="flex items-center gap-2 font-semibold text-slate-700 mb-3 text-xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>สถาปัตยกรรม School Work Hub (Full Stack Production Ready)</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
            <div className="flex items-center gap-2 rounded-lg bg-white border border-slate-200 p-2 text-slate-700 shadow-2xs">
              <Database className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span className="truncate">Database RLS & Bridge Auth</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-white border border-slate-200 p-2 text-slate-700 shadow-2xs">
              <FileCheck className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
              <span className="truncate">Task Management & Submissions</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-white border border-slate-200 p-2 text-slate-700 shadow-2xs">
              <MessageSquare className="h-3.5 w-3.5 text-purple-600 shrink-0" />
              <span className="truncate">Realtime Chat & Notifications</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-white border border-slate-200 p-2 text-slate-700 shadow-2xs">
              <Cloud className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">PWA Offline & Google Drive Hub</span>
            </div>
          </div>
        </div>

        {/* Bottom School Details */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left text-slate-400 text-[11px] pt-2">
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

          <div className="flex items-center gap-3 text-slate-500">
            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>ระบบออนไลน์พร้อมใช้งาน (v2.0)</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
