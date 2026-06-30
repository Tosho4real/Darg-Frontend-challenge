import type { BookingStatus } from '../bookings/types'
import type { ActivityItem } from '../activity/types'

export interface BookingUpdatedEvent {
  id: string
  type: 'booking_updated'
  bookingId: string
  status: BookingStatus
  version: number
  occurredAt: string
}

export interface ActivityCreatedEvent {
  id: string
  type: 'activity_created'
  activity: ActivityItem
  occurredAt: string
}

export type RealtimeEvent = BookingUpdatedEvent | ActivityCreatedEvent
