import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { useState } from 'react'
import { useOfflineQueueReplay } from '../features/offline/useOfflineQueueReplay'
import { useOnlineStatus } from '../features/offline/useOnlineStatus'
import { useBookingRealtimeUpdates } from '../features/realtime/useBookingRealtimeUpdates'

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeBridge />
      {children}
    </QueryClientProvider>
  )
}

function RealtimeBridge() {
  useOnlineStatus()
  useOfflineQueueReplay()
  useBookingRealtimeUpdates()

  return null
}
