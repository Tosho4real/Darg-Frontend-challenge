import type { BookingStatus } from '../bookings/types'

export interface ActivityItem {
  id: string
  actorName: string
  action: string
  bookingId: string
  status?: BookingStatus
  createdAt: string
}

export interface ActivityPage {
  items: ActivityItem[]
  nextCursor: number | null
  total: number
}
