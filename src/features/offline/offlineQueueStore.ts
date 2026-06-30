import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BookingStatus } from '../bookings/types'

export interface OfflineBookingAction {
  id: string
  bookingIds: string[]
  status: BookingStatus
  expectedVersions: Record<string, number>
  createdAt: string
}

interface OfflineQueueState {
  isOnline: boolean
  lastReplayMessage: string | null
  queuedActions: OfflineBookingAction[]
  enqueueAction: (action: Omit<OfflineBookingAction, 'id' | 'createdAt'>) => void
  removeAction: (actionId: string) => void
  setOnline: (isOnline: boolean) => void
  setLastReplayMessage: (message: string | null) => void
}

export const useOfflineQueueStore = create<OfflineQueueState>()(
  persist(
    (set) => ({
      isOnline:
        typeof navigator === 'undefined' ? true : navigator.onLine,
      lastReplayMessage: null,
      queuedActions: [],
      enqueueAction: (action) =>
        set((state) => ({
          queuedActions: [
            ...state.queuedActions,
            {
              ...action,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
            },
          ],
        })),
      removeAction: (actionId) =>
        set((state) => ({
          queuedActions: state.queuedActions.filter(
            (action) => action.id !== actionId,
          ),
        })),
      setOnline: (isOnline) => set({ isOnline }),
      setLastReplayMessage: (lastReplayMessage) => set({ lastReplayMessage }),
    }),
    {
      name: 'booking-offline-queue',
      partialize: (state) => ({
        queuedActions: state.queuedActions,
        lastReplayMessage: state.lastReplayMessage,
      }),
    },
  ),
)
