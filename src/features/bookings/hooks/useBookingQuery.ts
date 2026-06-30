import { useQuery } from '@tanstack/react-query'
import { getBookingById } from '../api/bookingsApi'

export function useBookingQuery(bookingId: string) {
  return useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => getBookingById(bookingId),
  })
}
