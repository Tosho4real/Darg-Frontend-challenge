# Senior Frontend Technical Challenge

React booking operations dashboard for managing large marketplace booking datasets.

## Stack

- React
- TypeScript
- React Query
- React Router
- Tailwind CSS
- Zustand
- TanStack Table
- TanStack Virtual
- Vitest

## Getting Started

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

Run tests:

```bash
npm test -- --run
```

Build:

```bash
npm run build
```

## Main Routes

- `/bookings` - booking management table
- `/bookings/:bookingId` - booking detail and timeline
- `/activity` - audit activity feed

## Features Implemented

### Booking Management

- Server-style pagination
- Server-style sorting
- Server-style filtering and search
- Column visibility controls
- Persisted table preferences with Zustand
- Row selection
- Bulk actions: approve, reject, cancel, assign driver
- Virtualized table body
- Booking detail links

### Real-Time Updates

- Mock socket event emitter
- `booking_updated` events
- React Query cache patching without page refresh
- Preserves table pagination/filter/sort state
- Event deduplication
- Stale event protection using booking versions

### Booking Timeline

- Detail page per booking
- Lazy-loaded timeline
- Infinite scroll via `IntersectionObserver`
- Accessible timeline list markup

### Optimistic Updates

- Optimistic booking status changes
- Snapshot and rollback strategy
- Conflict handling using booking versions
- Simulated stale-write conflict for concurrent agent behavior

### Offline Mode

- Browser online/offline detection
- Persisted offline action queue
- Optimistic local update while offline
- Automatic replay when online returns
- Conflict handling during replay

### Auditability

- Activity feed route
- Infinite scrolling
- Search by actor, action, or booking id
- Live inserts from realtime booking updates
- Audit entries from agent actions and offline replay

### Accessibility

- Keyboard-accessible controls
- Visible focus states
- Semantic buttons, links, tables, lists, and form labels
- `aria-live` messages for status updates
- Non-color-only online/offline and status signals

## Data Model

The app uses a mock in-memory API. It generates 100,000 bookings and exposes async API functions that behave like backend endpoints.

Bookings include a `version` field to support stale data and conflict handling:

```ts
interface Booking {
  id: string
  customerName: string
  agentName: string
  driverName?: string
  status: BookingStatus
  amount: number
  createdAt: string
  version: number
}
```

## Architecture Notes

Feature code is grouped by domain:

```txt
src/
  app/
  features/
    activity/
    bookings/
    offline/
    realtime/
    timeline/
  pages/
```

React Query owns server/cache state. Zustand owns small client state such as table preferences and offline queue state.

## Deliverables

- ADR: [docs/adr.md](docs/adr.md)
- Performance report: [docs/performance-report.md](docs/performance-report.md)
- Implementation plan: [docs/implementation-plan.md](docs/implementation-plan.md)
- Tests: `src/**/*.test.ts`

## Trade-Offs

- The backend is simulated with in-memory async functions because the challenge provides no API.
- Search is immediate rather than debounced. In production, a short debounce would reduce backend pressure.
- Activity and timeline infinite feeds retain loaded pages. Production implementations may cap retained pages for very long sessions.
