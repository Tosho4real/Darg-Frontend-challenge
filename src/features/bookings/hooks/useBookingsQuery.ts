import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { getBookings } from '../api/bookingsApi'
import type { BookingsQuery } from '../types'

export function useBookingsQuery(query: BookingsQuery) {
  return useQuery({
    queryKey: ['bookings', query],
    queryFn: () => getBookings(query),
    placeholderData: (previousData) => previousData,
  })
}

export function useInfiniteBookingsQuery(
  query: Omit<BookingsQuery, 'pageIndex'>,
) {
  return useInfiniteQuery({
    queryKey: ['bookings', 'infinite', query],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      getBookings({
        ...query,
        pageIndex: pageParam,
      }),
    getNextPageParam: (lastPage, allPages) => {
      const loadedRows = allPages.reduce(
        (count, page) => count + page.rows.length,
        0,
      )

      return loadedRows < lastPage.total ? allPages.length : undefined
    },
    placeholderData: (previousData) => previousData,
  })
}
