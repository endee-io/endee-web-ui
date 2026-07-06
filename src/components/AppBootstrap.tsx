'use client'

import { useEffect } from 'react'
import { useServersStore } from '../context/ServersContext'

/**
 * App-wide client bootstrap: applies the persisted theme so full-screen pages
 * (Servers / Database picker) honor dark mode too, and loads the runtime app
 * mode + server list (from /api/mode and /api/servers). The active server is
 * resolved from the URL once the list is loaded.
 */
export default function AppBootstrap({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark') document.documentElement.classList.add('dark')
    useServersStore.getState().refresh()
  }, [])

  return <>{children}</>
}
