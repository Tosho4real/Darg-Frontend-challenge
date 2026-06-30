import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  type Row,
  type RowSelectionState,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ChevronDown, ChevronUp, Eye, Search } from 'lucide-react'
import type { ReactNode } from 'react'
import { memo, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BookingConflictError } from '../../features/bookings/api/bookingsApi'
import { patchBookingsInCache } from '../../features/bookings/cache/bookingsCache'
import { StatusBadge } from '../../features/bookings/components/StatusBadge'
import { useBookingsQuery } from '../../features/bookings/hooks/useBookingsQuery'
import { useUpdateBookingStatus } from '../../features/bookings/hooks/useUpdateBookingStatus'
import { useTablePreferencesStore } from '../../features/bookings/stores/tablePreferencesStore'
import type {
  Booking,
  BookingFilters,
  BookingSort,
  BookingStatus,
} from '../../features/bookings/types'
import { useOfflineQueueStore } from '../../features/offline/offlineQueueStore'

const STATUSES: Array<BookingStatus | 'all'> = [
  'all',
  'pending',
  'approved',
  'rejected',
  'completed',
  'cancelled',
]

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function BookingsPage() {
  const queryClient = useQueryClient()
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const persistedColumnVisibility = useTablePreferencesStore(
    (state) => state.columnVisibility,
  )
  const persistedPageSize = useTablePreferencesStore((state) => state.pageSize)
  const setPersistedColumnVisibility = useTablePreferencesStore(
    (state) => state.setColumnVisibility,
  )
  const setPersistedPageSize = useTablePreferencesStore(
    (state) => state.setPageSize,
  )

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: persistedPageSize,
  })
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'createdAt', desc: true },
  ])
  const [filters, setFilters] = useState<BookingFilters>({
    search: '',
    status: 'all',
    agentName: '',
  })
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    persistedColumnVisibility,
  )
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const bookingQuery = useBookingsQuery({
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
    filters,
    sorting: sorting as BookingSort[],
  })
  const statusMutation = useUpdateBookingStatus()
  const isOnline = useOfflineQueueStore((state) => state.isOnline)
  const queuedActionCount = useOfflineQueueStore(
    (state) => state.queuedActions.length,
  )
  const enqueueAction = useOfflineQueueStore((state) => state.enqueueAction)
  const lastReplayMessage = useOfflineQueueStore(
    (state) => state.lastReplayMessage,
  )

  const columns = useMemo<ColumnDef<Booking>[]>(
    () => [
      {
        id: 'select',
        size: 56,
        header: ({ table }) => (
          <input
            aria-label="Select all visible bookings"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            type="checkbox"
          />
        ),
        cell: ({ row }) => (
          <input
            aria-label={`Select booking ${row.original.id}`}
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            type="checkbox"
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'id',
        size: 150,
        header: 'Booking ID',
        cell: ({ row }) => (
          <Link
            className="font-medium text-blue-700 hover:text-blue-900 hover:underline"
            to={`/bookings/${row.original.id}`}
          >
            {row.original.id}
          </Link>
        ),
      },
      {
        accessorKey: 'customerName',
        size: 210,
        header: 'Customer',
      },
      {
        accessorKey: 'agentName',
        size: 150,
        header: 'Agent',
        enableSorting: false,
      },
      {
        accessorKey: 'status',
        size: 150,
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'amount',
        size: 130,
        header: 'Amount',
        cell: ({ row }) => currencyFormatter.format(row.original.amount),
      },
      {
        accessorKey: 'createdAt',
        size: 240,
        header: 'Created',
        cell: ({ row }) => dateFormatter.format(new Date(row.original.createdAt)),
      },
    ],
    [],
  )

  const table = useReactTable({
    data: bookingQuery.data?.rows ?? [],
    columns,
    rowCount: bookingQuery.data?.total ?? 0,
    state: {
      pagination,
      sorting,
      columnVisibility,
      rowSelection,
    },
    getRowId: (row) => row.id,
    manualPagination: true,
    manualSorting: true,
    enableRowSelection: true,
    onPaginationChange: (updater) => {
      setPagination((current) => {
        const next = typeof updater === 'function' ? updater(current) : updater
        setPersistedPageSize(next.pageSize)
        return next
      })
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: (updater) => {
      setColumnVisibility((current) => {
        const next = typeof updater === 'function' ? updater(current) : updater
        setPersistedColumnVisibility(next)
        return next
      })
    },
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
  })

  const selectedBookingIds = table
    .getSelectedRowModel()
    .rows.map((row) => row.original.id)
  const tableRows = table.getRowModel().rows
  const rowVirtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 56,
    overscan: 8,
  })
  const virtualRows = rowVirtualizer.getVirtualItems()

  function updateFilter<Key extends keyof BookingFilters>(
    key: Key,
    value: BookingFilters[Key],
  ) {
    setFilters((current) => ({ ...current, [key]: value }))
    setPagination((current) => ({ ...current, pageIndex: 0 }))
  }

  async function runBulkAction(status: BookingStatus) {
    if (selectedBookingIds.length === 0) return

    const expectedVersions = Object.fromEntries(
      table
        .getSelectedRowModel()
        .rows.map((row) => [row.original.id, row.original.version]),
    )

    setActionMessage(null)

    if (!isOnline) {
      enqueueAction({
        bookingIds: selectedBookingIds,
        status,
        expectedVersions,
      })
      patchBookingsInCache(queryClient, selectedBookingIds, (booking) => ({
        ...booking,
        status,
        version: booking.version + 1,
      }))
      setActionMessage(
        `${selectedBookingIds.length} booking${
          selectedBookingIds.length === 1 ? '' : 's'
        } queued while offline. The action will replay automatically.`,
      )
      setRowSelection({})
      return
    }

    try {
      await statusMutation.mutateAsync({
        bookingIds: selectedBookingIds,
        status,
        expectedVersions,
      })
      setActionMessage(
        `${selectedBookingIds.length} booking${
          selectedBookingIds.length === 1 ? '' : 's'
        } updated to ${status}.`,
      )
      setRowSelection({})
    } catch (error) {
      if (error instanceof BookingConflictError) {
        const latest = error.latestBookings
          .map((booking) => `${booking.id}: ${booking.status}`)
          .join(', ')
        setActionMessage(
          `Conflict detected. Latest server state restored (${latest}).`,
        )
        return
      }

      setActionMessage('Update failed. Your previous table state was restored.')
    }
  }

  return (
    <section className="space-y-5" aria-labelledby="bookings-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-700">Operations</p>
          <h2 id="bookings-heading" className="text-2xl font-semibold">
            Booking Management
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Server-style filtering, sorting, pagination, persisted table
            preferences, row selection, and bulk actions over 100,000 bookings.
          </p>
        </div>
        <div className="rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
          <span
            className={`mr-3 inline-flex items-center gap-2 ${
              isOnline ? 'text-emerald-700' : 'text-amber-700'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isOnline ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            {isOnline ? 'Live' : 'Offline'}
          </span>
          {bookingQuery.data?.total.toLocaleString() ?? '...'} matching bookings
          {queuedActionCount > 0 ? (
            <span className="ml-3 text-amber-700">
              {queuedActionCount} queued
            </span>
          ) : null}
        </div>
      </div>

      <div className="border border-slate-200 bg-white">
        {actionMessage ? (
          <div className="border-b border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            <p aria-live="polite">{actionMessage}</p>
          </div>
        ) : null}
        {lastReplayMessage ? (
          <div className="border-b border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <p aria-live="polite">{lastReplayMessage}</p>
          </div>
        ) : null}
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="relative block">
              <span className="sr-only">Search bookings</span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                className="h-10 w-full rounded border border-slate-300 pl-10 pr-3 text-sm"
                placeholder="Search ID, customer, agent"
                value={filters.search}
                onChange={(event) => updateFilter('search', event.target.value)}
              />
            </label>

            <label>
              <span className="sr-only">Filter by status</span>
              <select
                className="h-10 w-full rounded border border-slate-300 px-3 text-sm capitalize"
                value={filters.status}
                onChange={(event) =>
                  updateFilter(
                    'status',
                    event.target.value as BookingFilters['status'],
                  )
                }
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status === 'all' ? 'All statuses' : status}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="sr-only">Filter by agent</span>
              <input
                className="h-10 w-full rounded border border-slate-300 px-3 text-sm"
                placeholder="Filter agent"
                value={filters.agentName}
                onChange={(event) =>
                  updateFilter('agentName', event.target.value)
                }
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ColumnVisibilityMenu table={table} />
            <BulkActionButton
              disabled={selectedBookingIds.length === 0 || statusMutation.isPending}
              onClick={() => void runBulkAction('approved')}
            >
              Approve
            </BulkActionButton>
            <BulkActionButton
              disabled={selectedBookingIds.length === 0 || statusMutation.isPending}
              onClick={() => void runBulkAction('rejected')}
            >
              Reject
            </BulkActionButton>
            <BulkActionButton
              disabled={selectedBookingIds.length === 0 || statusMutation.isPending}
              onClick={() => void runBulkAction('cancelled')}
            >
              Cancel
            </BulkActionButton>
          </div>
        </div>

        <div
          ref={tableContainerRef}
          aria-label="Virtualized bookings table"
          className="max-h-[620px] overflow-auto"
        >
          <table className="grid min-w-[1036px] border-separate border-spacing-0 text-left text-sm">
            <thead className="sticky top-0 z-[1] grid bg-slate-50 text-xs uppercase text-slate-500">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="flex w-full">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="border-b border-slate-200 px-4 py-3 font-semibold"
                      style={{ flex: `0 0 ${header.getSize()}px` }}
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          className="inline-flex items-center gap-1 disabled:cursor-default"
                          disabled={!header.column.getCanSort()}
                          onClick={header.column.getToggleSortingHandler()}
                          type="button"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {header.column.getIsSorted() === 'asc' ? (
                            <ChevronUp aria-hidden="true" size={14} />
                          ) : null}
                          {header.column.getIsSorted() === 'desc' ? (
                            <ChevronDown aria-hidden="true" size={14} />
                          ) : null}
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody
              className="relative grid"
              style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
            >
              {virtualRows.map((virtualRow) => (
                <VirtualizedBookingRow
                  key={tableRows[virtualRow.index].id}
                  row={tableRows[virtualRow.index]}
                  top={virtualRow.start}
                />
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600" aria-live="polite">
            {selectedBookingIds.length} selected
            {bookingQuery.isFetching ? ' | Refreshing...' : ''}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Rows per page"
              className="h-9 rounded border border-slate-300 px-2 text-sm"
              value={pagination.pageSize}
              onChange={(event) =>
                table.setPageSize(Number(event.target.value))
              }
            >
              {[10, 25, 50, 100, 250, 500].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize} rows
                </option>
              ))}
            </select>
            <button
              className="h-9 rounded border border-slate-300 px-3 text-sm disabled:opacity-50"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
              type="button"
            >
              Previous
            </button>
            <span className="text-sm text-slate-600">
              Page {pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <button
              className="h-9 rounded border border-slate-300 px-3 text-sm disabled:opacity-50"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

function BulkActionButton({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      className="h-10 rounded bg-slate-900 px-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  )
}

const VirtualizedBookingRow = memo(function VirtualizedBookingRow({
  row,
  top,
}: {
  row: Row<Booking>
  top: number
}) {
  return (
    <tr
      className="absolute flex w-full hover:bg-slate-50"
      style={{ transform: `translateY(${top}px)` }}
    >
      {row.getVisibleCells().map((cell) => (
        <td
          key={cell.id}
          className="h-14 border-b border-slate-100 px-4 py-3 align-middle text-slate-700"
          style={{ flex: `0 0 ${cell.column.getSize()}px` }}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </tr>
  )
})

function ColumnVisibilityMenu({
  table,
}: {
  table: ReturnType<typeof useReactTable<Booking>>
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        aria-expanded={open}
        className="inline-flex h-10 items-center gap-2 rounded border border-slate-300 bg-white px-3 text-sm font-medium"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <Eye aria-hidden="true" size={16} />
        Columns
      </button>
      {open ? (
        <div className="absolute right-0 z-10 mt-2 w-56 rounded border border-slate-200 bg-white p-2 shadow-lg">
          {table
            .getAllLeafColumns()
            .filter((column) => column.id !== 'select')
            .map((column) => (
              <label
                key={column.id}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm hover:bg-slate-50"
              >
                <input
                  checked={column.getIsVisible()}
                  onChange={column.getToggleVisibilityHandler()}
                  type="checkbox"
                />
                <span className="capitalize">
                  {column.id.replace(/([A-Z])/g, ' $1')}
                </span>
              </label>
            ))}
        </div>
      ) : null}
    </div>
  )
}
