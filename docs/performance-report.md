# Performance Report

## Dataset Strategy

The mock API generates 100,000 bookings in memory, but the UI never renders the full dataset. The bookings page requests only the current server-style page using the active table state:

- `pageIndex`
- `pageSize`
- `filters`
- `sorting`

This mirrors a production backend contract where filtering, sorting, and pagination happen outside the browser.

## Optimizations Applied

### Server-Side Table State

Filtering, sorting, and pagination are handled by the mock API layer. The table sends state through the React Query key, so each unique table state has its own cached result.

Benefit:

- The browser does not need to hold or render filtered table results for the entire dataset.

Trade-off:

- The mock API still filters an in-memory array because there is no backend. In a real system this work would move to database queries or indexed search.

### Virtualized Table Body

The bookings table uses `@tanstack/react-virtual` to render only visible rows plus overscan.

Benefit:

- Page sizes of 250 or 500 rows do not create 250 or 500 mounted row components at once.
- Scrolling remains responsive because DOM size stays small.

Trade-off:

- Fixed row height and explicit column sizes are needed for reliable layout.

### Memoized Table Configuration

Column definitions are memoized with `useMemo`, and virtual rows are rendered through a memoized row component.

Benefit:

- Avoids recreating table column configuration on each render.
- Reduces row rerender churn while scrolling.

Trade-off:

- Memoization is used only where object identity matters. Over-memoizing every small value would make the code harder to maintain.

### React Query Cache Patching

Realtime events update cached booking pages through `queryClient.setQueriesData`.

Benefit:

- Visible cached pages update without resetting pagination, filters, or sorting.
- No broad refetch is needed for every event.

Trade-off:

- Only cached pages are patched. Non-cached pages naturally receive fresh state when queried.

### Event Deduplication and Version Checks

Realtime events are deduplicated by event id. Booking updates are ignored if the event version is older than or equal to the cached booking version.

Benefit:

- Duplicate socket events do not cause repeated cache work.
- Stale events cannot overwrite newer optimistic or server-confirmed state.

Trade-off:

- The client keeps a bounded in-memory set of recently processed event ids.

### Optimistic Updates with Rollback

Mutations snapshot affected booking queries, optimistically patch status, and rollback on failure. Conflicts restore latest server state.

Benefit:

- Agent actions feel immediate.
- Stale data is handled without silently overwriting another agent's update.

Trade-off:

- Optimistic updates add cache complexity and require versioned writes.

### Offline Queue

Offline actions are stored in Zustand persistence and replayed when the browser returns online.

Benefit:

- Agents can continue work during temporary connection loss.
- Queued actions survive reloads.

Trade-off:

- Conflicts may still occur during replay and must be surfaced clearly.

## Potential Bottlenecks

- The mock API filters and sorts 100,000 in-memory bookings. This is acceptable for the challenge but should be moved server-side in production.
- Realtime cache patching scans cached pages. This is fine for a few cached pages, but a very long-lived session with many cached pages may need targeted cache indexing.
- Infinite feeds can grow over long sessions. Production apps often cap retained pages or use cache garbage collection based on usage.
- Search currently fires on each keystroke through query keys. A short debounce would reduce backend pressure in production.

## Production Follow-Ups

- Move mock API behavior behind HTTP endpoints or MSW handlers.
- Add backend cursor contracts for activity and timeline feeds.
- Add debounced search inputs.
- Add metrics for mutation latency, conflict rate, replay success rate, and socket event volume.
- Add browser-level Playwright tests for critical flows.
