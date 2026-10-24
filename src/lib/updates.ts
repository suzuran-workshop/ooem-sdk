/**
 * 清空 Service Worker 与 Cache Storage。
 * 只影响离线缓存，不触碰 localStorage 中的对局、设置与统计。
 */
export async function clearOfflineCache(): Promise<void> {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.allSettled(registrations.map((registration) => registration.unregister()))
  }

  if ('caches' in window) {
    const keys = await caches.keys()
    await Promise.allSettled(keys.map((key) => caches.delete(key)))
  }
}
