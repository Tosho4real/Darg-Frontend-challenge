import type { BookingStatus } from '../../bookings/types'
import type { ActivityItem, ActivityPage } from '../types'

const ACTORS = ['John', 'Mary', 'David', 'Aisha', 'Priya', 'System']
const ACTIONS = [
  'approved',
  'rejected',
  'cancelled',
  'assigned driver to',
  'reviewed',
  'completed',
]

let activityCache: ActivityItem[] | null = null
let activitySequence = 0

function wait(ms = 300) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export async function getActivityFeed({
  cursor = 0,
  limit = 20,
  search = '',
}: {
  cursor?: number
  limit?: number
  search?: string
}): Promise<ActivityPage> {
  await wait()

  const normalizedSearch = search.trim().toLowerCase()
  const filtered = getActivityStore().filter((item) => {
    if (!normalizedSearch) return true

    return (
      item.actorName.toLowerCase().includes(normalizedSearch) ||
      item.action.toLowerCase().includes(normalizedSearch) ||
      item.bookingId.toLowerCase().includes(normalizedSearch)
    )
  })

  return {
    items: filtered.slice(cursor, cursor + limit),
    nextCursor: cursor + limit < filtered.length ? cursor + limit : null,
    total: filtered.length,
  }
}

export function recordBookingActivity({
  actorName = 'John',
  action,
  bookingId,
  status,
}: {
  actorName?: string
  action: string
  bookingId: string
  status?: BookingStatus
}) {
  const activity = createActivity({
    actorName,
    action,
    bookingId,
    status,
  })

  getActivityStore().unshift(activity)

  return activity
}

export function recordRealtimeBookingActivity({
  bookingId,
  status,
}: {
  bookingId: string
  status: BookingStatus
}) {
  return recordBookingActivity({
    actorName: 'System',
    action: `updated booking to ${status}`,
    bookingId,
    status,
  })
}

function getActivityStore() {
  if (!activityCache) {
    activityCache = createSeedActivity()
  }

  return activityCache
}

function createSeedActivity() {
  const now = Date.now()

  return Array.from({ length: 240 }, (_, index) => {
    const bookingNumber = index + 1
    const actorName = ACTORS[index % ACTORS.length]
    const action = ACTIONS[index % ACTIONS.length]
    const bookingId = `BKG-${bookingNumber.toString().padStart(6, '0')}`

    return createActivity({
      actorName,
      action,
      bookingId,
      createdAt: new Date(now - index * 26 * 60_000).toISOString(),
    })
  })
}

function createActivity({
  actorName,
  action,
  bookingId,
  status,
  createdAt = new Date().toISOString(),
}: {
  actorName: string
  action: string
  bookingId: string
  status?: BookingStatus
  createdAt?: string
}): ActivityItem {
  activitySequence += 1

  return {
    id: `activity-${activitySequence}`,
    actorName,
    action,
    bookingId,
    status,
    createdAt,
  }
}
