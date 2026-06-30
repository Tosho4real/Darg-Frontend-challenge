import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BookingStatus } from '../bookings/types'

interface OfflineBookingActionBase {
  id: string
  bookingIds: string[]
  expectedVersions: Record<string, number>
  createdAt: string
}

export interface OfflineStatusAction extends OfflineBookingActionBase {
  type: 'status_update'
  status: BookingStatus
}

export interface OfflineAssignDriverAction extends OfflineBookingActionBase {
  type: 'assign_driver'
  driverName: string
}

export type OfflineBookingAction =
  | OfflineStatusAction
  | OfflineAssignDriverAction

type OfflineBookingActionInput =
  | Omit<OfflineStatusAction, 'id' | 'createdAt'>
  | Omit<OfflineAssignDriverAction, 'id' | 'createdAt'>

interface OfflineQueueState {
  isOnline: boolean
  lastReplayMessage: string | null
  queuedActions: OfflineBookingAction[]
  enqueueAction: (action: OfflineBookingActionInput) => void
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
