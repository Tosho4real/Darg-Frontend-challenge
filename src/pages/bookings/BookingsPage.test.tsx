import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PropsWithChildren } from 'react'
import { useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { BookingsPage } from './BookingsPage'

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 56,
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        key: index,
        size: 56,
        start: index * 56,
      })),
    scrollToIndex: vi.fn(),
  }),
}))

describe('BookingsPage', () => {
  it('updates the selected booking status after approving a row', async () => {
    const user = userEvent.setup()

    render(<BookingsPage />, { wrapper: TestWrapper })

    const rowCheckbox = await screen.findByLabelText('Select booking BKG-000001')
    const row = rowCheckbox.closest('tr')

    expect(row).not.toBeNull()
    expect(within(row as HTMLElement).getByText(/pending/i)).toBeInTheDocument()

    await user.click(rowCheckbox)
    await user.click(screen.getByRole('button', { name: 'Approve' }))

    expect(
      await screen.findByText('1 booking updated to approved.'),
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(within(row as HTMLElement).getByText(/approved/i)).toBeInTheDocument()
    })
  })
})

function TestWrapper({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}
