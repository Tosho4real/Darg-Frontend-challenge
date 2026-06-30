import { useEffect } from 'react'
import { useOfflineQueueStore } from './offlineQueueStore'

export function useOnlineStatus() {
  const setOnline = useOfflineQueueStore((state) => state.setOnline)

  useEffect(() => {
    function syncOnlineStatus() {
      setOnline(navigator.onLine)
    }

    syncOnlineStatus()
    window.addEventListener('online', syncOnlineStatus)
    window.addEventListener('offline', syncOnlineStatus)

    return () => {
      window.removeEventListener('online', syncOnlineStatus)
      window.removeEventListener('offline', syncOnlineStatus)
    }
  }, [setOnline])
}
