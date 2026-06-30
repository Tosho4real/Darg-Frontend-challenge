import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  assignDriverToBookings,
  BookingConflictError,
} from '../api/bookingsApi'
import { recordBookingActivity } from '../../activity/api/activityApi'
import { prependActivityToCache } from '../../activity/cache/activityCache'
import {
  patchBookingsInCache,
  patchResolvedBookingsInCache,
} from '../cache/bookingsCache'
import type { Booking, BookingsResponse } from '../types'

interface AssignDriverVariables {
  bookingIds: string[]
  driverName: string
  expectedVersions: Record<string, number>
}

interface AssignDriverContext {
  previousBookings: Array<[readonly unknown[], BookingsResponse | undefined]>
}

export function useAssignDriver() {
  const queryClient = useQueryClient()

  return useMutation<Booking[], Error, AssignDriverVariables, AssignDriverContext>({
    mutationFn: ({ bookingIds, driverName, expectedVersions }) =>
      assignDriverToBookings({ bookingIds, driverName, expectedVersions }),
    onMutate: async ({ bookingIds, driverName }) => {
      await queryClient.cancelQueries({ queryKey: ['bookings'] })

      const previousBookings =
        queryClient.getQueriesData<BookingsResponse>({
          queryKey: ['bookings'],
        })

      patchBookingsInCache(queryClient, bookingIds, (booking) => ({
        ...booking,
        driverName,
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
          action: `assigned ${variables.driverName} to`,
          bookingId: booking.id,
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
