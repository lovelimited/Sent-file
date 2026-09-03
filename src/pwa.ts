import { registerSW } from 'virtual:pwa-register'

export function setupPWA() {
  if ('serviceWorker' in navigator) {
    const updateSW = registerSW({
      onNeedRefresh() {
        console.info('[PWA] New content available, ready to reload.')
      },
      onOfflineReady() {
        console.info('[PWA] App is ready to work offline.')
      },
      onRegisterError(error: unknown) {
        console.error('[PWA] Service worker registration error:', error)
      },
    })
    return updateSW
  }
  return () => {}
}
