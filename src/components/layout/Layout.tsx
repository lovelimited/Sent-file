import React from 'react'
import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { OfflineBanner } from '@/components/pwa/OfflineBanner'
import { PWAInstallBanner } from '@/components/pwa/PWAInstallBanner'

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      <OfflineBanner />
      <Navbar />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <p>School Work Hub © {new Date().getFullYear()} — ระบบบริหารจัดการงานโรงเรียนสำหรับคณะครูและบุคลากร</p>
      </footer>
      <PWAInstallBanner />
    </div>
  )
}
