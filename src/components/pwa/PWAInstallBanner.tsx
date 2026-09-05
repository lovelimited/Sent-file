import React, { useState } from 'react'
import { Download, X, Smartphone, Sparkles } from 'lucide-react'
import { usePWAInstall } from '@/hooks/usePWAInstall'

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall()
  const [isDismissed, setIsDismissed] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)

  if (!isInstallable || isInstalled || isDismissed) {
    return null
  }

  const handleInstallClick = async () => {
    setIsInstalling(true)
    await promptInstall()
    setIsInstalling(false)
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="rounded-2xl border border-blue-500/30 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <Smartphone className="h-5 w-5" />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm font-bold text-white">ติดตั้งแอป School Work Club</h4>
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              </div>
              <p className="mt-0.5 text-xs text-slate-300 leading-relaxed">
                ติดตั้งลงบนหน้าจอหลักเพื่อเปิดใช้งานได้เร็วและสะดวกเหมือนแอปบนมือถือ
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsDismissed(true)}
            className="text-slate-400 hover:text-white cursor-pointer"
            title="ปิดแบนเนอร์"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={() => setIsDismissed(true)}
            className="rounded-xl px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            ไว้คราวหลัง
          </button>
          <button
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-600/20 hover:bg-blue-500 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>ติดตั้งแอปเลย</span>
          </button>
        </div>
      </div>
    </div>
  )
}
