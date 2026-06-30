import type { InfiniteData, QueryClient } from '@tanstack/react-query'
import type { ActivityItem, ActivityPage } from '../types'

export function prependActivityToCache(
  queryClient: QueryClient,
  activity: ActivityItem,
) {
  queryClient.setQueriesData<InfiniteData<ActivityPage>>(
    { queryKey: ['activityFeed'] },
    (current) => {
      if (!current || current.pages.length === 0) return current

      const firstPage = current.pages[0]
      if (firstPage.items.some((item) => item.id === activity.id)) {
        return current
      }

      return {
        ...current,
        pages: [
          {
            ...firstPage,
            items: [activity, ...firstPage.items],
            total: firstPage.total + 1,
          },
          ...current.pages.slice(1),
        ],
      }
    },
  )
}
