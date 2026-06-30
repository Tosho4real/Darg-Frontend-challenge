# Performance Report

## Summary

The app simulates a marketplace operations dashboard with 100,000 generated
bookings. The browser never renders or processes the full dataset as UI rows.

The bookings table uses server-side table state and requests only the current
page from the mock API. Activity and timeline views use cursor-style infinite
queries because those features are naturally feed-based.

## Dataset Strategy

The mock API accepts the same state a real backend endpoint would expect:

- `pageIndex`
- `pageSize`
- `filters`
- `sorting`

Filtering, sorting, and pagination happen inside the mock API layer. In a real
system, the same contract would map to database queries, search indexes, or
backend service calls.

The frontend receives only the current page of bookings, plus a total count.
This avoids rendering or storing 100,000 visible table rows in React.

## Applied Optimizations

### 1. Server-Side Table State

The bookings table is controlled by React state and passes that state into the
booking query key.

Included table state:

- page index
- page size
- search/filter values
- sorting

Benefit:

- The UI works with one page of data at a time.
- Pagination, filtering, and sorting remain stable across re-renders.
- React Query can cache each unique table state separately.

Trade-off:

- The mock API still filters and sorts an in-memory array because there is no
  backend. In production, this work should move to the server.

### 2. Debounced Search

Booking search, booking agent filtering, and activity search keep immediate
input state locally. The values passed into React Query are debounced.

Benefit:

- Typing does not create a new query key on every keystroke.
- A real backend would receive fewer search requests.
- The inputs still feel responsive because local text updates immediately.

Trade-off:

- Search results intentionally update after a short delay.

### 3. Virtualized Booking Rows

The bookings table body uses `@tanstack/react-virtual`.

Benefit:

- Large page sizes do not mount every row component at once.
- Scroll performance stays predictable.
- DOM size remains bounded.

Trade-off:

- Virtualization requires stable row height and explicit column sizing.
- Table markup is more custom than a standard static table.

### 4. Memoized Table Configuration

Column definitions are memoized with `useMemo`.

Benefit:

- TanStack Table receives stable column definitions.
- Avoids unnecessary recalculation of table configuration.

Trade-off:

- Memoization is used only where object identity matters. Overusing memoization
  would make the code harder to follow without a meaningful performance gain.

### 5. React Query Cache Patching

Real-time events and optimistic mutations update cached booking pages through
`queryClient.setQueriesData`.

Benefit:

- Visible cached pages update without forcing a full refetch.
- Pagination, filters, and sorting are preserved.
- Agent actions feel immediate.

Trade-off:

- Cache patching scans cached booking pages. This is fine for the challenge,
  but a very large long-lived session may need more targeted cache indexing.

### 6. Event Deduplication And Version Checks

Real-time events are deduplicated by event id. Booking updates are ignored if
their version is older than or equal to the cached booking version.

Benefit:

- Duplicate socket events do not repeatedly patch the cache.
- Stale events cannot overwrite newer optimistic or confirmed state.

Trade-off:

- The client keeps a bounded in-memory set of processed event ids.

### 7. Optimistic Updates With Rollback

Status updates and driver assignment use optimistic cache updates.

Mutation flow:

1. Snapshot affected booking query data.
2. Apply an optimistic cache patch.
3. Reconcile with the server response on success.
4. Roll back or restore latest server state on failure/conflict.

Benefit:

- Agent actions feel immediate.
- Conflicts are surfaced instead of silently overwriting newer data.

Trade-off:

- Optimistic updates add cache complexity and require versioned writes.

### 8. Offline Queue

Offline actions are persisted with Zustand and replayed when the browser returns
online.

Benefit:

- Agents can continue work during temporary connection loss.
- Queued actions survive page reloads.

Trade-off:

- Conflicts can still occur during replay and must be communicated clearly.

## Potential Bottlenecks

### Mock API Work

The mock API filters and sorts 100,000 in-memory bookings.

This is acceptable for the challenge because there is no backend, but it is not
how production should handle large datasets. In production, the server should
own filtering, sorting, pagination, and indexing.

### Cache Patching Scope

Real-time updates scan cached booking pages.

This is acceptable for a small number of cached pages. A production dashboard
with very long sessions could introduce targeted cache indexing or more focused
query invalidation.

### Infinite Feed Retention

Activity and timeline feeds can retain many loaded pages.

Production systems often cap retained pages, tune React Query garbage
collection, or provide feed windowing for very long sessions.

### Bundle Size

Vite reports a chunk-size warning after production builds.

This is not currently blocking functionality. A production follow-up would be to
split route-level bundles with dynamic imports.

## Production Follow-Ups

- Replace mock API modules with real HTTP endpoints.
- Add backend cursor contracts for activity and timeline feeds.
- Add route-level code splitting.
- Add browser-level Playwright tests for critical flows.
- Add metrics for mutation latency, conflict rate, replay success rate, and
  real-time event volume.
