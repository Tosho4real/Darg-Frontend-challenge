import { describe, expect, it } from 'vitest'
import { getActivityFeed, recordBookingActivity } from './activityApi'

describe('activityApi', () => {
  it('records and searches audit entries', async () => {
    const activity = recordBookingActivity({
      actorName: 'Mary',
      action: 'approved booking',
      bookingId: 'BKG-999999',
      status: 'approved',
    })

    const response = await getActivityFeed({
      search: 'BKG-999999',
      limit: 10,
    })

    expect(response.items[0]).toEqual(activity)
    expect(response.total).toBeGreaterThanOrEqual(1)
  })
})
