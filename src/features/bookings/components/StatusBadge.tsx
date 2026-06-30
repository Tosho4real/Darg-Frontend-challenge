import clsx from 'clsx'
import type { BookingStatus } from '../types'

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending: 'bg-amber-50 text-amber-800 ring-amber-200',
  approved: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  rejected: 'bg-rose-50 text-rose-800 ring-rose-200',
  completed: 'bg-blue-50 text-blue-800 ring-blue-200',
  cancelled: 'bg-slate-100 text-slate-700 ring-slate-200',
}

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={clsx(
        'inline-flex min-w-24 justify-center rounded px-2.5 py-1 text-xs font-semibold capitalize ring-1',
        STATUS_STYLES[status],
      )}
    >
      {status}
    </span>
  )
}
