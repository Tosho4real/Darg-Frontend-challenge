import type { TimelineEvent, TimelinePage } from '../types'

const EVENT_NAMES = [
  'Booking Created',
  'Payment Received',
  'Agent Assigned',
  'Driver Assigned',
  'Pickup Scheduled',
  'Customer Contacted',
  'Status Reviewed',
  'Route Confirmed',
  'Booking Completed',
  'Customer Notified',
]
const ACTORS = ['System', 'John', 'Mary', 'David', 'Aisha', 'Priya']

const timelineCache = new Map<string, TimelineEvent[]>()

function wait(ms = 350) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export async function getBookingTimeline({
  bookingId,
  cursor = 0,
  limit = 12,
}: {
  bookingId: string
  cursor?: number
  limit?: number
}): Promise<TimelinePage> {
  await wait()

  const timeline = getTimelineStore(bookingId)
  const events = timeline.slice(cursor, cursor + limit)
  const nextCursor = cursor + limit < timeline.length ? cursor + limit : null

  return {
    events,
    nextCursor,
  }
}

function getTimelineStore(bookingId: string) {
  const cachedTimeline = timelineCache.get(bookingId)
  if (cachedTimeline) return cachedTimeline

  const seed = Number(bookingId.replace('BKG-', '')) || 1
  const now = Date.now() - seed * 60_000
  const timeline = Array.from({ length: 80 }, (_, index) => {
    const event = EVENT_NAMES[index % EVENT_NAMES.length]
    const actorName = ACTORS[(seed + index) % ACTORS.length]

    return {
      id: `${bookingId}-timeline-${index + 1}`,
      event,
      actorName,
      details: `${event} for ${bookingId}`,
      timestamp: new Date(now - index * 42 * 60_000).toISOString(),
    }
  })

  timelineCache.set(bookingId, timeline)
  return timeline
}
