import { describe, expect, it } from 'vitest'
import { getBookingTimeline } from './timelineApi'

describe('timelineApi', () => {
  it('returns cursor-paginated timeline events', async () => {
    const firstPage = await getBookingTimeline({
      bookingId: 'BKG-000001',
      cursor: 0,
      limit: 5,
    })

    const secondPage = await getBookingTimeline({
      bookingId: 'BKG-000001',
      cursor: firstPage.nextCursor ?? 0,
      limit: 5,
    })

    expect(firstPage.events).toHaveLength(5)
    expect(firstPage.nextCursor).toBe(5)
    expect(secondPage.events[0]?.id).not.toBe(firstPage.events[0]?.id)
  })
})
