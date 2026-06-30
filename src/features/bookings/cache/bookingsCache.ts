import type { QueryClient } from '@tanstack/react-query'
import type { Booking, BookingsResponse } from '../types'

export function patchBookingsInCache(
  queryClient: QueryClient,
  bookingIds: string[],
  updateBooking: (booking: Booking) => Booking,
) {
  const bookingIdSet = new Set(bookingIds)

  queryClient.setQueriesData<BookingsResponse>(
    { queryKey: ['bookings'] },
    (current) => {
      if (!current) return current

      return {
        ...current,
        rows: current.rows.map((booking) =>
          bookingIdSet.has(booking.id) ? updateBooking(booking) : booking,
        ),
      }
    },
  )
}

export function patchResolvedBookingsInCache(
  queryClient: QueryClient,
  updatedBookings: Booking[],
) {
  const bookingById = new Map(
    updatedBookings.map((booking) => [booking.id, booking]),
  )

  queryClient.setQueriesData<BookingsResponse>(
    { queryKey: ['bookings'] },
    (current) => {
      if (!current) return current

      return {
        ...current,
        rows: current.rows.map(
          (booking) => bookingById.get(booking.id) ?? booking,
        ),
      }
    },
  )
}
