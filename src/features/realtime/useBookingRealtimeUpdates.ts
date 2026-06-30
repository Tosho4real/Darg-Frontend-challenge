import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { prependActivityToCache } from '../activity/cache/activityCache'
import type { Booking, BookingsResponse } from '../bookings/types'
import { subscribeToMockSocket } from './mockSocket'
import type { RealtimeEvent } from './types'

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
        queryClient.setQueriesData<BookingsResponse>(
          { queryKey: ['bookings'] },
          (current) => patchBookingUpdatedEvent(current, event),
        )
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

function patchBookingUpdatedEvent(
  current: BookingsResponse | undefined,
  event: Extract<RealtimeEvent, { type: 'booking_updated' }>,
) {
  if (!current) return current

  let changed = false
  const rows = current.rows.map((booking) => {
    if (booking.id !== event.bookingId) return booking

    if (event.version <= booking.version) {
      return booking
    }

    changed = true
    return {
      ...booking,
      status: event.status,
      version: event.version,
    } satisfies Booking
  })

  return changed ? { ...current, rows } : current
}
