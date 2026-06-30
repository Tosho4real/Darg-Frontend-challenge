import { createMockBookingUpdatedEvent } from '../bookings/api/bookingsApi'
import { recordRealtimeBookingActivity } from '../activity/api/activityApi'
import type { RealtimeEvent } from './types'

type RealtimeListener = (event: RealtimeEvent) => void

const listeners = new Set<RealtimeListener>()
let intervalId: number | undefined
let emittedCount = 0

export function subscribeToMockSocket(listener: RealtimeListener) {
  listeners.add(listener)
  startSocket()

  return () => {
    listeners.delete(listener)

    if (listeners.size === 0 && intervalId !== undefined) {
      window.clearInterval(intervalId)
      intervalId = undefined
    }
  }
}

function startSocket() {
  if (intervalId !== undefined) return

  intervalId = window.setInterval(() => {
    const event = createMockBookingUpdatedEvent()
    const activity = recordRealtimeBookingActivity({
      bookingId: event.bookingId,
      status: event.status,
    })
    const activityEvent: RealtimeEvent = {
      id: `evt-${activity.id}`,
      type: 'activity_created',
      activity,
      occurredAt: new Date().toISOString(),
    }
    emittedCount += 1
    emit(event)
    emit(activityEvent)

    if (emittedCount % 4 === 0) {
      window.setTimeout(() => emit(event), 250)
      window.setTimeout(() => emit(activityEvent), 300)
    }

    if (emittedCount % 5 === 0) {
      window.setTimeout(
        () =>
          emit({
            ...event,
            id: `${event.id}-stale`,
            version: event.version - 1,
          }),
        500,
      )
    }
  }, 4_000)
}

function emit(event: RealtimeEvent) {
  listeners.forEach((listener) => listener(event))
}
