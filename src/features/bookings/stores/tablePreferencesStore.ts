import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface TablePreferencesState {
  columnVisibility: Record<string, boolean>
  pageSize: number
  setColumnVisibility: (columnVisibility: Record<string, boolean>) => void
  setPageSize: (pageSize: number) => void
}

export const useTablePreferencesStore = create<TablePreferencesState>()(
  persist(
    (set) => ({
      columnVisibility: {},
      pageSize: 25,
      setColumnVisibility: (columnVisibility) => set({ columnVisibility }),
      setPageSize: (pageSize) => set({ pageSize }),
    }),
    {
      name: 'booking-table-preferences',
    },
  ),
)
