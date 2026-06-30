export type BookingStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'cancelled'

export interface Booking {
  id: string
  customerName: string
  agentName: string
  driverName?: string
  status: BookingStatus
  amount: number
  createdAt: string
  version: number
}

export interface BookingFilters {
  search: string
  status: BookingStatus | 'all'
  agentName: string
}

export interface BookingSort {
  id: keyof Pick<Booking, 'createdAt' | 'amount' | 'customerName' | 'status'>
  desc: boolean
}

export interface BookingsQuery {
  pageIndex: number
  pageSize: number
  filters: BookingFilters
  sorting: BookingSort[]
}

export interface BookingsResponse {
  rows: Booking[]
  total: number
}
