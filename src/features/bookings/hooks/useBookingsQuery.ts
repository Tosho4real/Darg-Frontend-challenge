import { useQuery } from '@tanstack/react-query'
import { getBookings } from '../api/bookingsApi'
import type { BookingsQuery } from '../types'

export function useBookingsQuery(query: BookingsQuery) {
  return useQuery({
    queryKey: ['bookings', query],
    queryFn: () => getBookings(query),
    placeholderData: (previousData) => previousData,
  })
}
