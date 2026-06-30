import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import {
  BookingConflictError,
  updateBookingStatus,
} from '../bookings/api/bookingsApi'
import { recordBookingActivity } from '../activity/api/activityApi'
import { prependActivityToCache } from '../activity/cache/activityCache'
import { patchResolvedBookingsInCache } from '../bookings/cache/bookingsCache'
import { useOfflineQueueStore } from './offlineQueueStore'

export function useOfflineQueueReplay() {
  const queryClient = useQueryClient()
  const isOnline = useOfflineQueueStore((state) => state.isOnline)
  const queuedActions = useOfflineQueueStore((state) => state.queuedActions)
  const removeAction = useOfflineQueueStore((state) => state.removeAction)
  const setLastReplayMessage = useOfflineQueueStore(
    (state) => state.setLastReplayMessage,
  )
  const isReplayingRef = useRef(false)

  useEffect(() => {
    if (!isOnline || queuedActions.length === 0 || isReplayingRef.current) {
      return
    }

    isReplayingRef.current = true

    async function replayQueuedActions() {
      let replayedCount = 0

      for (const action of queuedActions) {
        try {
          const updatedBookings = await updateBookingStatus(action)
          patchResolvedBookingsInCache(queryClient, updatedBookings)
          updatedBookings.forEach((booking) => {
            const activity = recordBookingActivity({
              action: `${action.status} booking`,
              bookingId: booking.id,
              status: booking.status,
            })
            prependActivityToCache(queryClient, activity)
          })
          removeAction(action.id)
          replayedCount += 1
        } catch (error) {
          if (error instanceof BookingConflictError) {
            patchResolvedBookingsInCache(queryClient, error.latestBookings)
            removeAction(action.id)
            setLastReplayMessage(
              `Queued action conflicted. Latest server status restored for ${error.latestBookings
                .map((booking) => booking.id)
                .join(', ')}.`,
            )
            continue
          }

          setLastReplayMessage('Queued action replay failed. It will retry later.')
          break
        }
      }

      if (replayedCount > 0) {
        setLastReplayMessage(
          `${replayedCount} queued action${
            replayedCount === 1 ? '' : 's'
          } replayed after reconnecting.`,
        )
      }

      isReplayingRef.current = false
    }

    void replayQueuedActions()
  }, [
    isOnline,
    queryClient,
    queuedActions,
    removeAction,
    setLastReplayMessage,
  ])
}
