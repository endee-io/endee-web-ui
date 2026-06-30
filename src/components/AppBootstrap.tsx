'use client'

import { useEffect } from 'react'

/**
 * App-wide client bootstrap: applies the persisted theme so full-screen pages
 * (Servers / Database picker) honor dark mode too. The server list is static
 * (build-time servers.json); the active server is resolved from the URL.
 */
export default function AppBootstrap({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark') document.documentElement.classList.add('dark')
  }, [])

  return <>{children}</>
}
