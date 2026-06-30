import { useInfiniteQuery } from '@tanstack/react-query'
import { getBookingTimeline } from '../api/timelineApi'

export function useBookingTimeline(bookingId: string) {
  return useInfiniteQuery({
    queryKey: ['bookingTimeline', bookingId],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      getBookingTimeline({ bookingId, cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })
}
