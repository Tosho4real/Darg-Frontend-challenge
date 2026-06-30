import { useQueryClient } from '@tanstack/react-query'
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
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, ChevronDown, ChevronUp, Eye, Search } from 'lucide-react'
import type { ReactNode } from 'react'
import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BookingConflictError,
  getSuggestedDriverName,
} from '../../features/bookings/api/bookingsApi'
import { patchBookingsInCache } from '../../features/bookings/cache/bookingsCache'
import { StatusBadge } from '../../features/bookings/components/StatusBadge'
import { useAssignDriver } from '../../features/bookings/hooks/useAssignDriver'
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
  const navigate = useNavigate()
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

  const [pageSize, setPageSize] = useState(persistedPageSize)
  const [pageIndex, setPageIndex] = useState(0)
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
    pageIndex,
    pageSize,
    filters,
    sorting: sorting as BookingSort[],
  })
  const bookings = bookingQuery.data?.rows ?? []
  const totalBookings = bookingQuery.data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(totalBookings / pageSize))
  const currentPage = Math.min(pageIndex + 1, pageCount)
  const firstVisibleBooking = totalBookings === 0 ? 0 : pageIndex * pageSize + 1
  const lastVisibleBooking = Math.min((pageIndex + 1) * pageSize, totalBookings)
  const statusMutation = useUpdateBookingStatus()
  const assignDriverMutation = useAssignDriver()
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
            aria-label="Select all bookings on this page"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
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
        accessorKey: 'driverName',
        size: 180,
        header: 'Driver',
        enableSorting: false,
        cell: ({ row }) => row.original.driverName ?? 'Unassigned',
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
    data: bookings,
    columns,
    rowCount: totalBookings,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
    },
    getRowId: (row) => row.id,
    manualSorting: true,
    enableRowSelection: true,
    onSortingChange: (updater) => {
      setSorting(updater)
      setPageIndex(0)
      setRowSelection({})
    },
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
  const hasNoBookings =
    !bookingQuery.isLoading && !bookingQuery.isFetching && bookings.length === 0

  function updateFilter<Key extends keyof BookingFilters>(
    key: Key,
    value: BookingFilters[Key],
  ) {
    setFilters((current) => ({ ...current, [key]: value }))
    setPageIndex(0)
    setRowSelection({})
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
        type: 'status_update',
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

  async function runAssignDriverAction() {
    if (selectedBookingIds.length === 0) return

    const driverName = getSuggestedDriverName(selectedBookingIds)
    const expectedVersions = Object.fromEntries(
      table
        .getSelectedRowModel()
        .rows.map((row) => [row.original.id, row.original.version]),
    )

    setActionMessage(null)

    if (!isOnline) {
      enqueueAction({
        type: 'assign_driver',
        bookingIds: selectedBookingIds,
        driverName,
        expectedVersions,
      })
      patchBookingsInCache(queryClient, selectedBookingIds, (booking) => ({
        ...booking,
        driverName,
        version: booking.version + 1,
      }))
      setActionMessage(
        `${selectedBookingIds.length} booking${
          selectedBookingIds.length === 1 ? '' : 's'
        } queued for driver assignment to ${driverName}.`,
      )
      setRowSelection({})
      return
    }

    try {
      await assignDriverMutation.mutateAsync({
        bookingIds: selectedBookingIds,
        driverName,
        expectedVersions,
      })
      setActionMessage(
        `${driverName} assigned to ${selectedBookingIds.length} booking${
          selectedBookingIds.length === 1 ? '' : 's'
        }.`,
      )
      setRowSelection({})
    } catch (error) {
      if (error instanceof BookingConflictError) {
        const latest = error.latestBookings
          .map((booking) => `${booking.id}: version ${booking.version}`)
          .join(', ')
        setActionMessage(
          `Conflict detected. Latest server state restored (${latest}).`,
        )
        return
      }

      setActionMessage(
        'Driver assignment failed. Your previous table state was restored.',
      )
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
            Server-side filtering, sorting, pagination, persisted table
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
          {totalBookings.toLocaleString()} matching bookings
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
        <div className="grid gap-4 border-b border-slate-200 p-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
          <div className="grid min-w-0 gap-3 md:grid-cols-3">
            <label className="relative block min-w-0">
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

            <StatusFilterDropdown
              value={filters.status}
              onChange={(status) => updateFilter('status', status)}
            />

            <label className="min-w-0">
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

          <div className="grid min-w-0 grid-cols-2 gap-2 min-[430px]:grid-cols-3 sm:flex sm:flex-wrap sm:items-center xl:justify-end">
            <ColumnVisibilityMenu table={table} />
            <BulkActionButton
              disabled={
                selectedBookingIds.length === 0 || assignDriverMutation.isPending
              }
              onClick={() => void runAssignDriverAction()}
            >
              Assign Driver
            </BulkActionButton>
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
          <table className="grid min-w-[1216px] border-separate border-spacing-0 text-left text-sm">
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
            {bookingQuery.isLoading ? (
              <BookingTableSkeleton columnCount={table.getVisibleLeafColumns().length} />
            ) : (
              <tbody
                className="relative grid"
                style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
              >
                {virtualRows.map((virtualRow) => (
                  <VirtualizedBookingRow
                    key={tableRows[virtualRow.index].id}
                    row={tableRows[virtualRow.index]}
                    top={virtualRow.start}
                    onOpenBooking={(bookingId) => navigate(`/bookings/${bookingId}`)}
                  />
                ))}
              </tbody>
            )}
          </table>

          {hasNoBookings ? (
            <EmptyState
              title="No bookings found"
              description="Adjust your search or filters to find matching bookings."
            />
          ) : null}

          {bookingQuery.isFetching && !bookingQuery.isLoading ? (
            <div className="p-4 text-center text-sm text-slate-600">
              Refreshing page...
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600" aria-live="polite">
            {selectedBookingIds.length} selected
            {bookingQuery.isFetching && !bookingQuery.isLoading ? ' | Refreshing...' : ''}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Rows per page"
              className="h-9 rounded border border-slate-300 px-2 text-sm"
              value={pageSize}
              onChange={(event) => {
                const nextPageSize = Number(event.target.value)
                setPageSize(nextPageSize)
                setPersistedPageSize(nextPageSize)
                setPageIndex(0)
                setRowSelection({})
              }}
            >
              {[25, 50, 100, 250, 500].map((pageSizeOption) => (
                <option key={pageSizeOption} value={pageSizeOption}>
                  {pageSizeOption} rows
                </option>
              ))}
            </select>
            <span className="text-sm text-slate-600">
              Showing {firstVisibleBooking.toLocaleString()}-
              {lastVisibleBooking.toLocaleString()} of {totalBookings.toLocaleString()}
            </span>
            <button
              className="h-9 rounded border border-slate-300 px-3 text-sm disabled:opacity-50"
              disabled={pageIndex === 0 || bookingQuery.isFetching}
              onClick={() => {
                setPageIndex((current) => Math.max(0, current - 1))
                setRowSelection({})
              }}
              type="button"
            >
              Previous
            </button>
            <span className="text-sm text-slate-600">
              Page {currentPage.toLocaleString()} of {pageCount.toLocaleString()}
            </span>
            <button
              className="h-9 rounded border border-slate-300 px-3 text-sm disabled:opacity-50"
              disabled={pageIndex >= pageCount - 1 || bookingQuery.isFetching}
              onClick={() => {
                setPageIndex((current) => Math.min(pageCount - 1, current + 1))
                setRowSelection({})
              }}
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

function BookingTableSkeleton({ columnCount }: { columnCount: number }) {
  return (
    <tbody className="grid" aria-hidden="true">
      {Array.from({ length: 10 }, (_, rowIndex) => (
        <tr key={rowIndex} className="flex w-full">
          {Array.from({ length: columnCount }, (_, cellIndex) => (
            <td
              key={cellIndex}
              className="h-14 flex-1 border-b border-slate-100 px-4 py-3"
            >
              <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  )
}

function EmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="p-10 text-center">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
    </div>
  )
}

function StatusFilterDropdown({
  value,
  onChange,
}: {
  value: BookingFilters['status']
  onChange: (status: BookingFilters['status']) => void
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="flex h-10 w-full min-w-0 items-center justify-between rounded border border-slate-300 bg-white px-3 text-left text-sm font-medium text-slate-700 hover:border-slate-400 focus-visible:border-blue-600"
          type="button"
        >
          <span>{formatStatusLabel(value)}</span>
          <ChevronDown aria-hidden="true" size={16} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          className="z-30 w-[--radix-dropdown-menu-trigger-width] rounded border border-slate-200 bg-white p-1 shadow-lg"
          sideOffset={6}
        >
          <DropdownMenu.Label className="px-3 py-2 text-xs font-semibold uppercase text-slate-500">
            Filter status
          </DropdownMenu.Label>
          <DropdownMenu.RadioGroup
            value={value}
            onValueChange={(status) =>
              onChange(status as BookingFilters['status'])
            }
          >
            {STATUSES.map((status) => (
              <DropdownMenu.RadioItem
                key={status}
                value={status}
                className="flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-sm text-slate-700 outline-none hover:bg-blue-50 hover:text-blue-700 focus:bg-blue-50 focus:text-blue-700 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white"
              >
                <span className="w-4">
                  <DropdownMenu.ItemIndicator>
                    <Check size={14} />
                  </DropdownMenu.ItemIndicator>
                </span>
                {formatStatusLabel(status)}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

function formatStatusLabel(status: BookingStatus | 'all') {
  if (status === 'all') return 'All statuses'

  return status.charAt(0).toUpperCase() + status.slice(1)
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
      className="h-10 w-full shrink-0 whitespace-nowrap rounded bg-slate-900 px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  )
}

function VirtualizedBookingRow({
  row,
  top,
  onOpenBooking,
}: {
  row: Row<Booking>
  top: number
  onOpenBooking: (bookingId: string) => void
}) {
  function shouldIgnoreNavigation(target: EventTarget | null) {
    return (
      target instanceof Element &&
      Boolean(target.closest('a, button, input, select, textarea, label'))
    )
  }

  return (
    <tr
      aria-label={`Open booking ${row.original.id}`}
      className="absolute flex w-full cursor-pointer hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
      onClick={(event) => {
        if (shouldIgnoreNavigation(event.target)) return
        onOpenBooking(row.original.id)
      }}
      onKeyDown={(event) => {
        if (shouldIgnoreNavigation(event.target)) return

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpenBooking(row.original.id)
        }
      }}
      role="link"
      style={{ transform: `translateY(${top}px)` }}
      tabIndex={0}
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
}

function ColumnVisibilityMenu({
  table,
}: {
  table: ReturnType<typeof useReactTable<Booking>>
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded border border-slate-300 bg-white px-3 text-sm font-medium sm:w-auto"
          type="button"
        >
          <Eye aria-hidden="true" size={16} />
          Columns
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          className="z-20 w-56 rounded border border-slate-200 bg-white p-2 shadow-lg"
          sideOffset={8}
        >
          {table
            .getAllLeafColumns()
            .filter((column) => column.id !== 'select')
            .map((column) => (
              <DropdownMenu.CheckboxItem
                key={column.id}
                checked={column.getIsVisible()}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm outline-none hover:bg-slate-50 focus:bg-slate-50"
                onCheckedChange={(checked) => column.toggleVisibility(!!checked)}
                onSelect={(event) => event.preventDefault()}
              >
                <span className="w-4 text-blue-600">
                  <DropdownMenu.ItemIndicator>
                    <Check size={14} />
                  </DropdownMenu.ItemIndicator>
                </span>
                <span className="capitalize">
                  {column.id.replace(/([A-Z])/g, ' $1')}
                </span>
              </DropdownMenu.CheckboxItem>
            ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
