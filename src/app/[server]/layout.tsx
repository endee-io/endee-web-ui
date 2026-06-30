'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useServersStore } from '@/context/ServersContext'
import { useSelectedDatabaseStore } from '@/context/SelectedDatabaseContext'
import { findServerByName } from '@/config/servers'

/**
 * Activates the server named in the URL (pointing the API client at it) and
 * loads its databases. Redirects to the servers list if the name is unknown.
 * Renders only the breadcrumb-scoped chrome; the inner [database] layout adds
 * the sidebar.
 */
export default function ServerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const params = useParams<{ server: string }>()
  const serverName = params?.server ? decodeURIComponent(params.server) : ''

  useEffect(() => {
    const server = findServerByName(serverName)
    if (!server) {
      router.replace('/')
      return
    }
    useServersStore.getState().setActiveServer(serverName)
    useSelectedDatabaseStore.getState().refreshDatabases()
  }, [serverName, router])

  if (!findServerByName(serverName)) return null

  return <>{children}</>
}
