# Architecture Decision Record

## Context

The challenge asks for a production-grade booking operations dashboard that can handle large datasets, server-driven tables, real-time updates, stale data, optimistic actions, offline replay, timelines, activity auditability, and accessibility.

The application has no real backend, so the API layer is simulated in memory while preserving backend-like contracts: pagination, sorting, filtering, cursors, versions, and conflict responses.

## Decisions

### React Query for Server State

React Query is used for bookings, booking detail, timelines, and activity feed data.

Reasons:

- It models async server state directly, including loading, caching, invalidation, and mutation state.
- Query keys naturally represent server-side table state: page, page size, filters, and sorting.
- `useMutation` gives a clear optimistic update lifecycle: cancel queries, snapshot cache, patch cache, rollback, reconcile.
- Infinite queries fit the timeline and activity feed requirements without custom pagination state machines.
- It supports cache patching for real-time events without forcing a full refetch.

Trade-off:

- React Query is not used for purely local UI preferences because that would overfit server-state tooling to client-state concerns.

### Zustand for Client State

Zustand is used for persisted table preferences and the offline queue.

Reasons:

- The state is small, local, and UI/application specific.
- It avoids Redux boilerplate for a challenge-sized app.
- Zustand persistence makes column visibility, page size, and queued offline actions straightforward.
- It keeps offline replay explicit and inspectable.

Trade-off:

- Redux Toolkit could be useful in a larger organization with established Redux conventions, but here it would add ceremony without improving the core behavior.

### Feature-First Folder Structure

The app uses feature folders:

- `features/bookings`
- `features/timeline`
- `features/activity`
- `features/realtime`
- `features/offline`

Reasons:

- Each domain owns its API, hooks, cache helpers, types, and stores.
- It is easier to review than generic `components`, `hooks`, and `utils` buckets.
- The boundaries mirror the challenge requirements and make future extraction or backend integration clearer.

Trade-off:

- Some shared primitives could be extracted later, but premature generalization would make the challenge harder to evaluate.

### TanStack Table

TanStack Table is used for booking table state and rendering.

Reasons:

- It supports headless, controlled table state.
- Server-side pagination, sorting, filtering, row selection, and column visibility are first-class patterns.
- It avoids coupling the implementation to a prebuilt table UI library.

Trade-off:

- It requires more explicit markup and state wiring, but that is useful here because the challenge evaluates table architecture.

### TanStack Virtual

TanStack Virtual is used for the bookings table body.

Reasons:

- It keeps DOM size bounded even when the page size is increased.
- It demonstrates the rendering strategy needed for large operational datasets.
- It works well with a headless table implementation.

Trade-off:

- Virtualized table markup needs fixed row height and stable column sizing to avoid layout drift.

### Mock API Instead of MSW

The app currently uses in-memory API modules rather than MSW handlers.

Reasons:

- The challenge has no real backend contract.
- In-memory APIs are enough to demonstrate server-side pagination, conflicts, realtime simulation, and offline replay.
- Keeping the API as plain async functions makes tests direct and fast.

Trade-off:

- MSW would be a good next step if the goal were to test browser-level HTTP behavior.
