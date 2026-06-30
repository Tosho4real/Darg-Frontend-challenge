import { useInfiniteQuery } from '@tanstack/react-query'
import { getActivityFeed } from '../api/activityApi'

export function useActivityFeed(search: string) {
  return useInfiniteQuery({
    queryKey: ['activityFeed', search],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      getActivityFeed({ cursor: pageParam, search }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })
}
