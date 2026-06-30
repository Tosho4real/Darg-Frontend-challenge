import { ArrowLeft, Loader2 } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { StatusBadge } from '../../features/bookings/components/StatusBadge'
import { useBookingQuery } from '../../features/bookings/hooks/useBookingQuery'
import { useBookingTimeline } from '../../features/timeline/hooks/useBookingTimeline'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function BookingDetailPage() {
  const { bookingId = '' } = useParams()
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const bookingQuery = useBookingQuery(bookingId)
  const timelineQuery = useBookingTimeline(bookingId)
  const timelineEvents = useMemo(
    () => timelineQuery.data?.pages.flatMap((page) => page.events) ?? [],
    [timelineQuery.data],
  )

  useEffect(() => {
    const target = loadMoreRef.current
    if (!target) return

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries

      if (
        entry.isIntersecting &&
        timelineQuery.hasNextPage &&
        !timelineQuery.isFetchingNextPage
      ) {
        void timelineQuery.fetchNextPage()
      }
    })

    observer.observe(target)

    return () => observer.disconnect()
  }, [
    timelineQuery.fetchNextPage,
    timelineQuery.hasNextPage,
    timelineQuery.isFetchingNextPage,
  ])

  if (bookingQuery.isLoading) {
    return (
      <div className="flex min-h-80 items-center justify-center text-slate-600">
        <Loader2 className="mr-2 animate-spin" size={18} />
        Loading booking
      </div>
    )
  }

  if (!bookingQuery.data) {
    return (
      <section className="border border-slate-200 bg-white p-8">
        <Link
          to="/bookings"
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-700"
        >
          <ArrowLeft size={16} />
          Back to bookings
        </Link>
        <h2 className="mt-4 text-xl font-semibold">Booking not found</h2>
      </section>
    )
  }

  const booking = bookingQuery.data

  return (
    <section className="space-y-5" aria-labelledby="booking-detail-heading">
      <Link
        to="/bookings"
        className="inline-flex items-center gap-2 text-sm font-medium text-blue-700"
      >
        <ArrowLeft size={16} />
        Back to bookings
      </Link>

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <aside className="border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-blue-700">Booking</p>
              <h2 id="booking-detail-heading" className="mt-1 text-2xl font-semibold">
                {booking.id}
              </h2>
            </div>
            <StatusBadge status={booking.status} />
          </div>

          <dl className="mt-6 space-y-4 text-sm">
            <DetailItem label="Customer" value={booking.customerName} />
            <DetailItem label="Agent" value={booking.agentName} />
            <DetailItem
              label="Driver"
              value={booking.driverName ?? 'Unassigned'}
            />
            <DetailItem
              label="Amount"
              value={currencyFormatter.format(booking.amount)}
            />
            <DetailItem
              label="Created"
              value={dateFormatter.format(new Date(booking.createdAt))}
            />
            <DetailItem label="Version" value={String(booking.version)} />
          </dl>
        </aside>

        <section
          className="border border-slate-200 bg-white"
          aria-labelledby="timeline-heading"
        >
          <div className="border-b border-slate-200 p-5">
            <h3 id="timeline-heading" className="text-lg font-semibold">
              Timeline
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Lazy-loaded event history with infinite scroll.
            </p>
          </div>

          <ol className="divide-y divide-slate-100" aria-label="Booking timeline">
            {timelineEvents.map((item) => (
              <li key={item.id} className="grid grid-cols-[28px_1fr] gap-3 p-5">
                <div className="relative flex justify-center">
                  <span className="mt-1 h-3 w-3 rounded-full bg-blue-600" />
                  <span className="absolute top-5 h-[calc(100%+20px)] w-px bg-slate-200" />
                </div>
                <div>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-medium text-slate-950">{item.event}</p>
                    <time
                      className="text-sm text-slate-500"
                      dateTime={item.timestamp}
                    >
                      {dateFormatter.format(new Date(item.timestamp))}
                    </time>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{item.details}</p>
                  <p className="mt-2 text-xs font-medium uppercase text-slate-500">
                    {item.actorName}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div ref={loadMoreRef} className="p-5 text-center text-sm text-slate-600">
            {timelineQuery.isFetchingNextPage ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="animate-spin" size={16} />
                Loading more events
              </span>
            ) : null}
            {!timelineQuery.hasNextPage && timelineEvents.length > 0
              ? 'End of timeline'
              : null}
          </div>
        </section>
      </div>
    </section>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 text-slate-900">{value}</dd>
    </div>
  )
}
