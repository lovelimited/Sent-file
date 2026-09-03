import React, { useState, useEffect } from 'react'
import {
  FileText,
  Clock,
  User,
  Loader2,
  RefreshCw,
  LogIn,
  UserPlus,
  Key,
  Power,
  Trash2,
  Download,
} from 'lucide-react'
import { fetchActivityLogs, type ActivityLogWithProfile } from '@/services/userService'
import { exportActivityLogsToCSV } from '@/utils/exportUtils'

export const ActivityLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLogWithProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadLogs = () => {
    setIsLoading(true)
    fetchActivityLogs().then((res) => {
      if (res.data) {
        setLogs(res.data)
      }
      setIsLoading(false)
    })
  }

  useEffect(() => {
    let isMounted = true
    fetchActivityLogs().then((res) => {
      if (isMounted) {
        if (res.data) setLogs(res.data)
        setIsLoading(false)
      }
    })
    return () => {
      isMounted = false
    }
  }, [])

  const renderActionBadge = (action: string) => {
    switch (action) {
      case 'login':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-400">
            <LogIn className="h-3 w-3" /> เข้าสู่ระบบ
          </span>
        )
      case 'create_user':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
            <UserPlus className="h-3 w-3" /> สร้างบัญชีใหม่
          </span>
        )
      case 'reset_password':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
            <Key className="h-3 w-3" /> รีเซ็ตรหัสผ่าน
          </span>
        )
      case 'activate_user':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
            <Power className="h-3 w-3" /> เปิดใช้งานบัญชี
          </span>
        )
      case 'deactivate_user':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
            <Power className="h-3 w-3" /> ระงับสิทธิ์บัญชี
          </span>
        )
      case 'delete_user':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
            <Trash2 className="h-3 w-3" /> ลบบัญชีผู้ใช้
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
            {action}
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <FileText className="h-6 w-6 text-blue-400" />
            <span>ประวัติกิจกรรมระบบ (Activity Logs)</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            ตรวจสอบ Audit Trail การเข้าสู่ระบบและการดำเนินงานของผู้ดูแลระบบ
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => exportActivityLogsToCSV(logs)}
            disabled={isLoading || logs.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            title="ดาวน์โหลดบันทึกกิจกรรมระบบเป็นไฟล์ Excel CSV"
          >
            <Download className="h-3.5 w-3.5 text-blue-400" />
            <span>ส่งออก CSV</span>
          </button>

          <button
            onClick={loadLogs}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>รีเฟรชข้อมูล</span>
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/30 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
            <p className="text-xs text-slate-400">กำลังโหลดประวัติกิจกรรม...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <FileText className="h-10 w-10 mx-auto mb-2 text-slate-600" />
            <p className="text-sm">ยังไม่มีบันทึกกิจกรรมในระบบ</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-900/80 text-xs font-medium text-slate-400">
                <tr>
                  <th className="px-4 py-3.5">เวลาที่ดำเนินการ</th>
                  <th className="px-4 py-3.5">ผู้ดำเนินการ</th>
                  <th className="px-4 py-3.5">กิจกรรม (Action)</th>
                  <th className="px-4 py-3.5">รายละเอียด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-500" />
                        <span>{new Date(log.created_at).toLocaleString('th-TH')}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {log.profiles ? (
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold">
                            <User className="h-3 w-3" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-200">{log.profiles.name}</p>
                            <p className="text-[10px] text-slate-500">@{log.profiles.username}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">ระบบอัตโนมัติ</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{renderActionBadge(log.action)}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                      {log.details ? (
                        <span className="truncate block max-w-md" title={JSON.stringify(log.details)}>
                          {JSON.stringify(log.details)}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
