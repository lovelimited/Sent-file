import React from 'react'
import { WifiOff } from 'lucide-react'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

export const OfflineBanner: React.FC = () => {
  const { isOnline } = useNetworkStatus()

  if (isOnline) {
    return null
  }

  return (
    <div className="sticky top-0 z-50 bg-amber-500/90 text-slate-950 px-4 py-2 text-xs font-semibold backdrop-blur-md shadow-md flex items-center justify-center gap-2">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>
        คุณกำลังทำงานในโหมดออฟไลน์ (Offline Mode) — สามารถเปิดดูหน้าเว็บและข้อมูลที่แคชไว้ได้ ระบบจะซิงก์ข้อมูลเมื่อกลับมาเชื่อมต่อ
      </span>
    </div>
  )
}
