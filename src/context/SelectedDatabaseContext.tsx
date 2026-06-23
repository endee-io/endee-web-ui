'use client'

import { useEffect, useRef } from 'react'
import { create } from 'zustand'
import { setCurrentDatabase } from '../api/client'

const SELECTED_DB_KEY = 'endee_selected_database'

export interface DatabaseInfo {
  username: string
  user_type: string
  is_active: boolean
  created_at: number
}

interface SelectedDatabaseState {
  databases: DatabaseInfo[]
  selectedDatabase: string | null
  loading: boolean
  error: string | null
  selectDatabase: (name: string) => void
  refreshDatabases: () => Promise<void>
}

export const useSelectedDatabaseStore = create<SelectedDatabaseState>((set, get) => ({
  databases: [],
  selectedDatabase: null,
  loading: true,
  error: null,

  selectDatabase: (name: string) => {
    set({ selectedDatabase: name })
    setCurrentDatabase(name)
    if (typeof window !== 'undefined') {
      localStorage.setItem(SELECTED_DB_KEY, name)
    }
  },

  refreshDatabases: async () => {
    set({ loading: true })
    try {
      const response = await fetch('/api/databases', { cache: 'no-store' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load databases')
      }
      const list: DatabaseInfo[] = (data.users || []).sort(
        (a: DatabaseInfo, b: DatabaseInfo) => b.created_at - a.created_at
      )

      // Resolve the active selection: keep the current one if still valid,
      // otherwise restore the persisted value, otherwise auto-select the first.
      const names = list.map((d) => d.username)
      const prev = get().selectedDatabase
      const stored =
        typeof window !== 'undefined' ? localStorage.getItem(SELECTED_DB_KEY) : null
      const next =
        (prev && names.includes(prev) && prev) ||
        (stored && names.includes(stored) && stored) ||
        list[0]?.username ||
        null
      if (next && typeof window !== 'undefined') {
        localStorage.setItem(SELECTED_DB_KEY, next)
      }
      setCurrentDatabase(next)

      set({ databases: list, selectedDatabase: next, error: null })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load databases' })
    } finally {
      set({ loading: false })
    }
  },
}))

let hydrated = false

/**
 * Triggers the one-time initial database fetch. Mount once near the app root
 * (e.g. in AppShell) so the store is populated regardless of which page loads.
 */
export function useHydrateSelectedDatabase() {
  const mounted = useRef(false)
  useEffect(() => {
    if (mounted.current || hydrated) return
    mounted.current = true
    hydrated = true
    useSelectedDatabaseStore.getState().refreshDatabases()
  }, [])
}

/**
 * Drop-in replacement for the former context hook. Returns the full store
 * state so existing consumers keep working unchanged.
 */
export function useSelectedDatabase() {
  return useSelectedDatabaseStore()
}
