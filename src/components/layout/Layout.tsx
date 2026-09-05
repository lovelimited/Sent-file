import React from 'react'
import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { OfflineBanner } from '@/components/pwa/OfflineBanner'
import { PWAInstallBanner } from '@/components/pwa/PWAInstallBanner'
import { ChatRealtimeNotifier } from '@/components/chat/ChatRealtimeNotifier'
import { FloatingChatDock } from '@/components/chat/FloatingChatDock'

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased print:bg-white print:p-0">
      <div className="print:hidden">
        <OfflineBanner />
        <Navbar />
      </div>
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 print:max-w-none print:p-0 print:m-0 print:w-full">
        <Outlet />
      </main>
      <div className="print:hidden">
        <Footer />
        <ChatRealtimeNotifier />
        <FloatingChatDock />
        <PWAInstallBanner />
      </div>
    </div>
  )
}
