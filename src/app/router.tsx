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
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-blue-600 text-white">
              <CalendarCheck aria-hidden="true" size={22} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Marketplace Ops</p>
              <h1 className="text-xl font-semibold tracking-normal">
                Bookings Dashboard
              </h1>
            </div>
          </div>
          <nav aria-label="Primary navigation" className="flex items-center gap-2">
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
          'inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-medium transition',
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
