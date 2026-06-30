import { Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useActivityFeed } from "../../features/activity/hooks/useActivityFeed";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function ActivityPage() {
  const [search, setSearch] = useState("");
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const activityQuery = useActivityFeed(search);
  const activities = useMemo(
    () => {
      const uniqueActivities = new Map(
        activityQuery.data?.pages
          .flatMap((page) => page.items)
          .map((activity) => [activity.id, activity]) ?? [],
      );

      return Array.from(uniqueActivities.values());
    },
    [activityQuery.data],
  );
  const total = activityQuery.data?.pages[0]?.total ?? 0;

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) return;

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;

      if (
        entry.isIntersecting &&
        activityQuery.hasNextPage &&
        !activityQuery.isFetchingNextPage
      ) {
        void activityQuery.fetchNextPage();
      }
    });

    observer.observe(target);

    return () => observer.disconnect();
  }, [
    activityQuery.fetchNextPage,
    activityQuery.hasNextPage,
    activityQuery.isFetchingNextPage,
  ]);

  return (
    <section className="space-y-5" aria-labelledby="activity-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-700">Auditability</p>
          <h2 id="activity-heading" className="text-2xl font-semibold">
            Activity Feed
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Searchable audit trail with infinite scrolling and live inserts from
            booking updates.
          </p>
        </div>
        <div className="rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
          {total.toLocaleString()} matching events
        </div>
      </div>

      <div className="border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4">
          <label className="relative block max-w-xl">
            <span className="sr-only">Search activity</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              className="h-10 w-full rounded border border-slate-300 pl-10 pr-3 text-sm"
              placeholder="Search actor, action, or booking ID"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>

        {activityQuery.isLoading ? (
          <ActivitySkeleton />
        ) : (
          <ol className="divide-y divide-slate-100" aria-label="Activity events">
            {activities.map((activity) => (
              <li key={activity.id} className="p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm text-slate-900">
                      <span className="font-semibold">{activity.actorName}</span>{" "}
                      {activity.action}{" "}
                      <Link
                        className="font-semibold text-blue-700 hover:text-blue-900 hover:underline"
                        to={`/bookings/${activity.bookingId}`}
                      >
                        {activity.bookingId}
                      </Link>
                    </p>
                    {activity.status ? (
                      <p className="mt-1 text-xs font-medium uppercase text-slate-500">
                        Status: {activity.status}
                      </p>
                    ) : null}
                  </div>
                  <time
                    className="text-sm text-slate-500"
                    dateTime={activity.createdAt}
                  >
                    {dateFormatter.format(new Date(activity.createdAt))}
                  </time>
                </div>
              </li>
            ))}
          </ol>
        )}

        {activities.length === 0 && !activityQuery.isLoading ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-slate-900">
              No activity found
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Adjust your search to find matching audit events.
            </p>
          </div>
        ) : null}

        <div
          ref={loadMoreRef}
          className="p-5 text-center text-sm text-slate-600"
        >
          {activityQuery.isFetchingNextPage ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="animate-spin" size={16} />
              Loading activity
            </span>
          ) : null}
          {!activityQuery.hasNextPage && activities.length > 0
            ? "End of activity feed"
            : null}
        </div>
      </div>
    </section>
  );
}

function ActivitySkeleton() {
  return (
    <div className="divide-y divide-slate-100" aria-hidden="true">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="w-full max-w-xl space-y-2">
              <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-1/4 animate-pulse rounded bg-slate-100" />
            </div>
            <div className="h-4 w-36 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
