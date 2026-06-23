'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react'
import type { ReactNode } from 'react'
import { setCurrentDatabase } from '../api/client'

const SELECTED_DB_KEY = 'endee_selected_database'

export interface DatabaseInfo {
  username: string
  user_type: string
  is_active: boolean
  created_at: number
}

interface SelectedDatabaseContextType {
  databases: DatabaseInfo[]
  selectedDatabase: string | null
  loading: boolean
  error: string | null
  selectDatabase: (name: string) => void
  refreshDatabases: () => Promise<void>
}

const SelectedDatabaseContext = createContext<SelectedDatabaseContextType | undefined>(
  undefined
)

export function SelectedDatabaseProvider({ children }: { children: ReactNode }) {
  const [databases, setDatabases] = useState<DatabaseInfo[]>([])
  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hydratedRef = useRef(false)

  // Keep the api client's scope in sync with the selection.
  useEffect(() => {
    setCurrentDatabase(selectedDatabase)
  }, [selectedDatabase])

  const selectDatabase = useCallback((name: string) => {
    setSelectedDatabase(name)
    setCurrentDatabase(name)
    if (typeof window !== 'undefined') {
      localStorage.setItem(SELECTED_DB_KEY, name)
    }
  }, [])

  const refreshDatabases = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/databases', { cache: 'no-store' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load databases')
      }
      const list: DatabaseInfo[] = (data.users || []).sort(
        (a: DatabaseInfo, b: DatabaseInfo) => b.created_at - a.created_at
      )
      setDatabases(list)
      setError(null)

      // Resolve the active selection: restore persisted value if still valid,
      // otherwise auto-select the first database.
      setSelectedDatabase((prev) => {
        const names = list.map((d) => d.username)
        const stored =
          typeof window !== 'undefined'
            ? localStorage.getItem(SELECTED_DB_KEY)
            : null
        const next =
          (prev && names.includes(prev) && prev) ||
          (stored && names.includes(stored) && stored) ||
          list[0]?.username ||
          null
        if (next && typeof window !== 'undefined') {
          localStorage.setItem(SELECTED_DB_KEY, next)
        }
        setCurrentDatabase(next)
        return next
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load databases')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (hydratedRef.current) return
    hydratedRef.current = true
    refreshDatabases()
  }, [refreshDatabases])

  return (
    <SelectedDatabaseContext.Provider
      value={{
        databases,
        selectedDatabase,
        loading,
        error,
        selectDatabase,
        refreshDatabases,
      }}
    >
      {children}
    </SelectedDatabaseContext.Provider>
  )
}

export function useSelectedDatabase() {
  const context = useContext(SelectedDatabaseContext)
  if (context === undefined) {
    throw new Error(
      'useSelectedDatabase must be used within a SelectedDatabaseProvider'
    )
  }
  return context
}
