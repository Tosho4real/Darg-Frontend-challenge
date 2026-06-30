import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { prependActivityToCache } from '../activity/cache/activityCache'
import { patchBookingsInCache } from '../bookings/cache/bookingsCache'
import { subscribeToMockSocket } from './mockSocket'

const processedEventIds = new Set<string>()
const processedEventQueue: string[] = []
const MAX_PROCESSED_EVENTS = 500

export function useBookingRealtimeUpdates() {
  const queryClient = useQueryClient()

  useEffect(() => {
    return subscribeToMockSocket((event) => {
      if (hasProcessedEvent(event.id)) return
      rememberEvent(event.id)

      if (event.type === 'booking_updated') {
        patchBookingsInCache(queryClient, [event.bookingId], (booking) => {
          if (event.version <= booking.version) return booking

          return {
            ...booking,
            status: event.status,
            version: event.version,
          }
        })
      }

      if (event.type === 'activity_created') {
        prependActivityToCache(queryClient, event.activity)
      }
    })
  }, [queryClient])
}

function hasProcessedEvent(eventId: string) {
  return processedEventIds.has(eventId)
}

function rememberEvent(eventId: string) {
  processedEventIds.add(eventId)
  processedEventQueue.push(eventId)

  if (processedEventQueue.length > MAX_PROCESSED_EVENTS) {
    const expiredEventId = processedEventQueue.shift()
    if (expiredEventId) {
      processedEventIds.delete(expiredEventId)
    }
  }
}
