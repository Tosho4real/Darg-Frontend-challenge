# Implementation Plan

## Step 1: Foundation

- Scaffold Vite React TypeScript.
- Add React Query, React Router, Tailwind CSS, TanStack Table, TanStack Virtual, Zustand, and testing tools.
- Replace the Vite starter UI with the dashboard shell.
- Add mock booking data and server-style query functions.

## Step 2: Booking Management

- Server-side pagination, sorting, filtering, and search.
- Persist column visibility and page size.
- Row selection and bulk status actions.
- Add virtualization once the table behaviors are stable.

## Step 3: Real-Time Updates

- Add a mock WebSocket/event emitter.
- Patch React Query cache directly for visible booking pages.
- Deduplicate events by event id.
- Ignore stale events by booking version.

## Step 4: Optimistic Updates and Conflicts

- Optimistically patch status changes.
- Snapshot and rollback failed updates.
- Use booking versions to detect stale writes.
- Show conflict messages when server state has moved on.

## Step 5: Offline Mode

- Detect browser online/offline state.
- Queue user actions while offline.
- Replay queued actions in order when the connection returns.

## Step 6: Timeline and Activity Feed

- Booking detail route with lazy-loaded infinite timeline.
- Activity feed with search, infinite scroll, and live inserts.

## Step 7: Testing and Documentation

- Unit tests for query/filter utilities, event dedupe, and offline queue.
- Integration tests for booking table and optimistic update flows.
- Add ADR and performance report.
