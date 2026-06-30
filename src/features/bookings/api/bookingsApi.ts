import type {
  Booking,
  BookingFilters,
  BookingSort,
  BookingStatus,
  BookingsQuery,
  BookingsResponse,
} from '../types'

export class BookingConflictError extends Error {
  latestBookings: Booking[]

  constructor(latestBookings: Booking[]) {
    super('One or more bookings changed while your request was in flight.')
    this.name = 'BookingConflictError'
    this.latestBookings = latestBookings
  }
}

const CUSTOMER_FIRST_NAMES = [
  'Ava',
  'Noah',
  'Mia',
  'Liam',
  'Zoe',
  'Ethan',
  'Ivy',
  'Omar',
  'Nora',
  'Kai',
]
const CUSTOMER_LAST_NAMES = [
  'Johnson',
  'Okafor',
  'Patel',
  'Chen',
  'Garcia',
  'Smith',
  'Brown',
  'Khan',
  'Wilson',
  'Adeyemi',
]
const AGENTS = ['John', 'Mary', 'David', 'Aisha', 'Priya', 'Daniel']
const STATUSES: BookingStatus[] = [
  'pending',
  'approved',
  'rejected',
  'completed',
  'cancelled',
]
const REALTIME_STATUSES: BookingStatus[] = ['approved', 'completed', 'cancelled']

let bookingsCache: Booking[] | null = null
let realtimeSequence = 0

function wait(ms = 350) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function createBookings(count: number): Booking[] {
  const now = Date.now()

  return Array.from({ length: count }, (_, index) => {
    const idNumber = index + 1
    const firstName = CUSTOMER_FIRST_NAMES[index % CUSTOMER_FIRST_NAMES.length]
    const lastName =
      CUSTOMER_LAST_NAMES[Math.floor(index / 3) % CUSTOMER_LAST_NAMES.length]
    const agentName = AGENTS[index % AGENTS.length]
    const status = STATUSES[index % STATUSES.length]

    return {
      id: `BKG-${idNumber.toString().padStart(6, '0')}`,
      customerName: `${firstName} ${lastName}`,
      agentName,
      status,
      amount: 45 + ((index * 37) % 950),
      createdAt: new Date(now - index * 18 * 60_000).toISOString(),
      version: 1,
    }
  })
}

function getBookingsStore() {
  if (!bookingsCache) {
    bookingsCache = createBookings(100_000)
  }

  return bookingsCache
}

export async function getBookings(
  query: BookingsQuery,
): Promise<BookingsResponse> {
  await wait()

  const filteredRows = applyFilters(getBookingsStore(), query.filters)
  const sortedRows = applySorting(filteredRows, query.sorting)
  const start = query.pageIndex * query.pageSize
  const rows = sortedRows.slice(start, start + query.pageSize)

  return {
    rows,
    total: filteredRows.length,
  }
}

export async function getBookingById(bookingId: string) {
  await wait(250)

  return (
    getBookingsStore().find((booking) => booking.id === bookingId) ?? null
  )
}

export async function updateBookingStatus({
  bookingIds,
  status,
  expectedVersions,
}: {
  bookingIds: string[]
  status: BookingStatus
  expectedVersions: Record<string, number>
}) {
  maybeSimulateConcurrentChange(bookingIds, status)
  await wait(500)

  const store = getBookingsStore()
  const updated: Booking[] = []
  const conflicts: Booking[] = []

  for (const bookingId of bookingIds) {
    const index = store.findIndex((booking) => booking.id === bookingId)
    if (index === -1) continue

    if (store[index].version !== expectedVersions[bookingId]) {
      conflicts.push(store[index])
      continue
    }

    const nextBooking = {
      ...store[index],
      status,
      version: store[index].version + 1,
    }
    store[index] = nextBooking
    updated.push(nextBooking)
  }

  if (conflicts.length > 0) {
    throw new BookingConflictError(conflicts)
  }

  return updated
}

export function createMockBookingUpdatedEvent() {
  const store = getBookingsStore()
  const index = (realtimeSequence * 97 + 13) % store.length
  const nextStatus = REALTIME_STATUSES[realtimeSequence % REALTIME_STATUSES.length]
  const nextBooking = {
    ...store[index],
    status: nextStatus,
    version: store[index].version + 1,
  }

  realtimeSequence += 1
  store[index] = nextBooking

  return {
    id: `evt-booking-${nextBooking.id}-${nextBooking.version}`,
    type: 'booking_updated' as const,
    bookingId: nextBooking.id,
    status: nextBooking.status,
    version: nextBooking.version,
    occurredAt: new Date().toISOString(),
  }
}

function maybeSimulateConcurrentChange(
  bookingIds: string[],
  requestedStatus: BookingStatus,
) {
  if (requestedStatus !== 'approved') return

  const store = getBookingsStore()
  const conflictedBookingId = bookingIds.find((bookingId) => {
    const numericId = Number(bookingId.replace('BKG-', ''))
    return numericId % 17 === 0
  })

  if (!conflictedBookingId) return

  const index = store.findIndex((booking) => booking.id === conflictedBookingId)
  if (index === -1 || store[index].status === 'cancelled') return

  store[index] = {
    ...store[index],
    status: 'cancelled',
    version: store[index].version + 1,
  }
}

function applyFilters(rows: Booking[], filters: BookingFilters) {
  const search = filters.search.trim().toLowerCase()
  const agentName = filters.agentName.trim().toLowerCase()

  return rows.filter((booking) => {
    if (filters.status !== 'all' && booking.status !== filters.status) {
      return false
    }

    if (agentName && !booking.agentName.toLowerCase().includes(agentName)) {
      return false
    }

    if (!search) return true

    return (
      booking.id.toLowerCase().includes(search) ||
      booking.customerName.toLowerCase().includes(search) ||
      booking.agentName.toLowerCase().includes(search)
    )
  })
}

function applySorting(rows: Booking[], sorting: BookingSort[]) {
  const [sort] = sorting
  if (!sort) return rows

  return [...rows].sort((a, b) => {
    const direction = sort.desc ? -1 : 1
    const aValue = a[sort.id]
    const bValue = b[sort.id]

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return (aValue - bValue) * direction
    }

    return String(aValue).localeCompare(String(bValue)) * direction
  })
}
