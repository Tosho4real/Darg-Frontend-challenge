# Architecture Decision Record

## Status

Accepted for the take-home challenge.

## Context

The application is a booking operations dashboard for a marketplace with a large
booking dataset. Operations agents need to view, filter, update, and audit
bookings while handling real-time updates, stale data, conflicts, and offline
actions.

There is no real backend in the brief, so the project uses an in-memory mock API.
The mock API still follows backend-like contracts:

- pagination
- filtering
- sorting
- cursor-based feeds
- versioned writes
- conflict responses

The goal is to make the frontend architecture close to what would be used
against real HTTP endpoints, without adding unnecessary infrastructure to the
challenge.

## Decision 1: React Query For Server State

### Decision

Use React Query for bookings, booking detail, booking timelines, and activity
feed data.

### Rationale

React Query matches the problem domain well because most application state is
server-derived and asynchronous. It handles loading states, cache ownership,
query keys, mutation lifecycles, and cache updates without requiring custom
request state machines.

The bookings query key includes the current table state:

- page index
- page size
- filters
- sorting

This mirrors how a production backend endpoint would be queried.

React Query mutations also provide a clear optimistic update lifecycle:

- cancel relevant queries
- snapshot previous cached data
- patch the cache optimistically
- rollback on failure
- reconcile with the server response

### Trade-Offs

React Query is not used for purely local UI state such as column visibility or
offline queue metadata. Using server-state tooling for local preferences would
make the state model less clear.

## Decision 2: Zustand For Client State

### Decision

Use Zustand for persisted table preferences and offline queue state.

### Rationale

The local state in this app is small and application-specific. Zustand keeps
that state explicit without the ceremony of Redux-style reducers, actions, and
selectors.

Zustand persistence is used for:

- column visibility preferences
- preferred page size
- queued offline actions

This keeps browser-local state separate from React Query's server cache.

### Trade-Offs

Redux Toolkit would be reasonable in a larger team with an established Redux
standard. For this challenge, it would add boilerplate without improving the
core behavior being evaluated.

## Decision 3: Feature-First Folder Structure

### Decision

Organize code by domain feature rather than by technical type.

Current feature folders:

- `features/bookings`
- `features/timeline`
- `features/activity`
- `features/realtime`
- `features/offline`

### Rationale

Each feature owns its API functions, hooks, cache helpers, types, and local
stores. This makes the code easier to review because the folder boundaries match
the challenge requirements.

This structure also makes future extraction easier. For example, the bookings
mock API could later be replaced with HTTP calls without touching activity or
timeline internals.

### Trade-Offs

Some primitives could be moved into a shared UI or utilities layer later.
The project avoids premature shared abstractions until reuse is clear.

## Decision 4: TanStack Table

### Decision

Use TanStack Table for the booking management table.

### Rationale

The challenge requires advanced table behavior:

- server-side pagination
- server-side sorting
- server-side filtering
- column visibility
- row selection
- bulk actions

TanStack Table is headless, so it provides the table state model without forcing
a prebuilt visual design. That keeps the implementation flexible and makes the
data flow explicit.

### Trade-Offs

Headless table libraries require more wiring than prebuilt table components.
That extra wiring is acceptable here because the challenge evaluates table
architecture and state management.

## Decision 5: TanStack Virtual

### Decision

Use TanStack Virtual for the bookings table body.

### Rationale

The dataset contains 100,000 generated bookings. Even though the table uses
server-side pagination, page sizes can still be large. Virtualization keeps the
number of mounted rows bounded while preserving responsive scrolling.

### Trade-Offs

Virtualized table layouts need stable row heights and explicit column sizing.
This adds layout constraints, but it prevents the DOM from growing with large
page sizes.

## Decision 6: In-Memory Mock API Instead Of MSW

### Decision

Use plain in-memory async API modules instead of MSW handlers.

### Rationale

The challenge does not provide a real HTTP contract. In-memory API modules are
enough to demonstrate:

- server-side pagination
- filtering and sorting
- real-time event simulation
- optimistic updates
- stale-write conflicts
- offline replay

Plain async functions also keep unit tests direct and fast.

### Trade-Offs

MSW would be a good next step if the goal were browser-level HTTP integration
testing or contract testing. For this challenge, the extra HTTP simulation layer
would add setup cost without changing the core frontend architecture.
