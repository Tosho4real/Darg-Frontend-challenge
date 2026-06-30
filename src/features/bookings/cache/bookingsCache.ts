import type { InfiniteData, QueryClient } from '@tanstack/react-query'
import type { Booking, BookingsResponse } from '../types'

type BookingCacheData = BookingsResponse | InfiniteData<BookingsResponse>

export function patchBookingsInCache(
  queryClient: QueryClient,
  bookingIds: string[],
  updateBooking: (booking: Booking) => Booking,
) {
  const bookingIdSet = new Set(bookingIds)

  queryClient.setQueriesData<BookingCacheData>(
    { queryKey: ['bookings'] },
    (current) => {
      if (!current) return current
      return patchBookingCacheData(current, (booking) =>
        bookingIdSet.has(booking.id) ? updateBooking(booking) : booking,
      )
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

  queryClient.setQueriesData<BookingCacheData>(
    { queryKey: ['bookings'] },
    (current) => {
      if (!current) return current
      return patchBookingCacheData(
        current,
        (booking) => bookingById.get(booking.id) ?? booking,
      )
    },
  )
}

function patchBookingCacheData(
  current: BookingCacheData,
  updateBooking: (booking: Booking) => Booking,
): BookingCacheData {
  if ('pages' in current) {
    return {
      ...current,
      pages: current.pages.map((page) => ({
        ...page,
        rows: page.rows.map(updateBooking),
      })),
    }
  }

  return {
    ...current,
    rows: current.rows.map(updateBooking),
  }
}
