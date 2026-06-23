'use client'

import { create } from 'zustand'
import type { NotificationType } from '../components/Notification'

interface NotificationState {
  notification: { type: NotificationType; message: string } | null
  showNotification: (type: NotificationType, message: string) => void
  clearNotification: () => void
}

let timer: ReturnType<typeof setTimeout> | null = null

function clearTimer() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notification: null,

  clearNotification: () => {
    clearTimer()
    set({ notification: null })
  },

  showNotification: (type: NotificationType, message: string) => {
    clearTimer()
    set({ notification: { type, message } })

    if (type === 'success' || type === 'info') {
      timer = setTimeout(() => {
        timer = null
        set({ notification: null })
      }, 4000)
    }
  },
}))

/**
 * Drop-in replacement for the former context hook.
 */
export function useNotification() {
  return useNotificationStore()
}
