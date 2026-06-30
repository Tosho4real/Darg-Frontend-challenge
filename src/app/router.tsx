import { Activity, CalendarCheck, ListChecks } from 'lucide-react'
import type { ReactNode } from 'react'
import { createBrowserRouter, Navigate, NavLink, Outlet } from 'react-router-dom'
import { ActivityPage } from '../pages/activity/ActivityPage'
import { BookingDetailPage } from '../pages/bookings/BookingDetailPage'
import { BookingsPage } from '../pages/bookings/BookingsPage'

function AppLayout() {
  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-blue-600 text-white sm:h-10 sm:w-10">
              <CalendarCheck aria-hidden="true" size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-500">Marketplace Ops</p>
              <h1 className="truncate text-lg font-semibold tracking-normal sm:text-xl">
                Bookings Dashboard
              </h1>
            </div>
          </div>
          <nav
            aria-label="Primary navigation"
            className="grid grid-cols-2 gap-2 sm:flex sm:items-center"
          >
            <NavItem to="/bookings" icon={<ListChecks size={18} />}>
              Bookings
            </NavItem>
            <NavItem to="/activity" icon={<Activity size={18} />}>
              Activity
            </NavItem>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}

function NavItem({
  to,
  icon,
  children,
}: {
  to: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'inline-flex items-center justify-center gap-2 rounded px-3 py-2 text-sm font-medium transition',
          isActive
            ? 'bg-blue-50 text-blue-700'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
        ].join(' ')
      }
    >
      {icon}
      {children}
    </NavLink>
  )
}

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/bookings" replace /> },
      { path: '/bookings', element: <BookingsPage /> },
      { path: '/bookings/:bookingId', element: <BookingDetailPage /> },
      { path: '/activity', element: <ActivityPage /> },
    ],
  },
])
