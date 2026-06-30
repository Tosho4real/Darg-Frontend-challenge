import { QueryClient, type InfiniteData } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import type { ActivityPage } from '../types'
import { prependActivityToCache } from './activityCache'

describe('activityCache', () => {
  it('prepends live activities without duplicating records', () => {
    const queryClient = new QueryClient()
    const queryKey = ['activityFeed', '']
    const activity = {
      id: 'activity-live-1',
      actorName: 'System',
      action: 'updated booking',
      bookingId: 'BKG-000001',
      status: 'completed' as const,
      createdAt: new Date().toISOString(),
    }

    queryClient.setQueryData<InfiniteData<ActivityPage>>(queryKey, {
      pageParams: [0],
      pages: [{ items: [], nextCursor: null, total: 0 }],
    })

    prependActivityToCache(queryClient, activity)
    prependActivityToCache(queryClient, activity)

    const cached = queryClient.getQueryData<InfiniteData<ActivityPage>>(queryKey)

    expect(cached?.pages[0]?.items).toHaveLength(1)
    expect(cached?.pages[0]?.items[0]).toEqual(activity)
  })
})
