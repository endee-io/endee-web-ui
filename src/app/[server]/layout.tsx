'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useServersStore } from '@/context/ServersContext'
import { useSelectedDatabaseStore } from '@/context/SelectedDatabaseContext'

/**
 * Activates the server named in the URL (pointing the API client at it) and
 * loads its databases. Redirects to the servers list if the name is unknown.
 * Renders only the breadcrumb-scoped chrome; the inner [database] layout adds
 * the sidebar. The server list is fetched from the server (mode-dependent), so
 * we wait for it to load before treating an unknown name as invalid.
 */
export default function ServerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const params = useParams<{ server: string }>()
  const serverName = params?.server ? decodeURIComponent(params.server) : ''
  const { servers, loaded } = useServersStore()
  const known = servers.some((s) => s.name === serverName)

  useEffect(() => {
    if (!loaded) return
    if (!known) {
      router.replace('/')
      return
    }
    useServersStore.getState().setActiveServer(serverName)
    useSelectedDatabaseStore.getState().refreshDatabases()
  }, [serverName, known, loaded, router])

  if (!loaded) return null
  if (!known) return null

  return <>{children}</>
}
