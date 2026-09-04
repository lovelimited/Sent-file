import React from 'react'
import { Megaphone } from 'lucide-react'
import { AnnouncementFeed } from '@/components/feed/AnnouncementFeed'

export const AnnouncementFeedPage: React.FC = () => {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
          <Megaphone className="h-6 w-6 text-emerald-600" />
          <span>ประกาศข่าวสารฝ่ายบริหาร</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          ข่าวสาร ประกาศ คำสั่ง และข้อมูลสำคัญจากฝ่ายบริหาร สามารถกดถูกใจและแสดงความคิดเห็นได้
        </p>
      </div>

      <AnnouncementFeed previewCount={0} />
    </div>
  )
}

export default AnnouncementFeedPage
