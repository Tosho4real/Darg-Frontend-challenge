import { describe, expect, it } from 'vitest'
import { BookingConflictError, getBookings, updateBookingStatus } from './bookingsApi'

describe('bookingsApi', () => {
  it('applies server-style filtering and pagination', async () => {
    const response = await getBookings({
      pageIndex: 0,
      pageSize: 10,
      filters: {
        search: 'BKG-000001',
        status: 'all',
        agentName: '',
      },
      sorting: [{ id: 'createdAt', desc: true }],
    })

    expect(response.total).toBe(1)
    expect(response.rows[0]?.id).toBe('BKG-000001')
  })

  it('applies server-style sorting', async () => {
    const response = await getBookings({
      pageIndex: 0,
      pageSize: 5,
      filters: {
        search: '',
        status: 'all',
        agentName: '',
      },
      sorting: [{ id: 'amount', desc: false }],
    })

    const amounts = response.rows.map((booking) => booking.amount)

    expect(amounts).toEqual([...amounts].sort((a, b) => a - b))
  })

  it('rejects stale writes with the latest booking state', async () => {
    const bookingId = 'BKG-000017'
    const current = await getBookings({
      pageIndex: 0,
      pageSize: 20,
      filters: {
        search: bookingId,
        status: 'all',
        agentName: '',
      },
      sorting: [{ id: 'createdAt', desc: true }],
    })

    const version = current.rows[0]?.version

    await expect(
      updateBookingStatus({
        bookingIds: [bookingId],
        status: 'approved',
        expectedVersions: { [bookingId]: version ?? 1 },
      }),
    ).rejects.toBeInstanceOf(BookingConflictError)
  })
})
