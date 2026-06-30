import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  BookingConflictError,
  updateBookingStatus,
} from '../api/bookingsApi'
import { recordBookingActivity } from '../../activity/api/activityApi'
import { prependActivityToCache } from '../../activity/cache/activityCache'
import {
  patchBookingsInCache,
  patchResolvedBookingsInCache,
} from '../cache/bookingsCache'
import type { Booking, BookingStatus, BookingsResponse } from '../types'

interface UpdateBookingStatusVariables {
  bookingIds: string[]
  status: BookingStatus
  expectedVersions: Record<string, number>
}

interface UpdateBookingStatusContext {
  previousBookings: Array<[readonly unknown[], BookingsResponse | undefined]>
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient()

  return useMutation<
    Booking[],
    Error,
    UpdateBookingStatusVariables,
    UpdateBookingStatusContext
  >({
    mutationFn: ({ bookingIds, status, expectedVersions }) =>
      updateBookingStatus({ bookingIds, status, expectedVersions }),
    onMutate: async ({ bookingIds, status }) => {
      await queryClient.cancelQueries({ queryKey: ['bookings'] })

      const previousBookings =
        queryClient.getQueriesData<BookingsResponse>({
          queryKey: ['bookings'],
        })

      patchBookingsInCache(queryClient, bookingIds, (booking) => ({
        ...booking,
        status,
        version: booking.version + 1,
      }))

      return { previousBookings }
    },
    onError: (error, _variables, context) => {
      context?.previousBookings.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data)
      })

      if (error instanceof BookingConflictError) {
        patchResolvedBookingsInCache(queryClient, error.latestBookings)
      }
    },
    onSuccess: (updatedBookings, variables) => {
      patchResolvedBookingsInCache(queryClient, updatedBookings)
      updatedBookings.forEach((booking) => {
        const activity = recordBookingActivity({
          action: `${variables.status} booking`,
          bookingId: booking.id,
          status: booking.status,
        })
        prependActivityToCache(queryClient, activity)
      })
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ['bookings'],
        refetchType: 'inactive',
      })
    },
  })
}
