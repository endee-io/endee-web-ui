'use client'

import { create } from 'zustand'
import { setActiveServer as setClientServer, setCurrentDatabase } from '../api/client'
import { useSelectedDatabaseStore } from './SelectedDatabaseContext'
import { SERVERS, findServerByName, type ServerConfig } from '../config/servers'

/** A configured Endee server. Sourced read-only from build-time servers.json. */
export type ServerEntry = ServerConfig

/** Point the API client at a server (or clear it) and reset any selected database. */
function applyActive(server: ServerEntry | null) {
  setClientServer(server ? { url: server.url, token: server.token } : null)
  setCurrentDatabase(null)
  useSelectedDatabaseStore.setState({ selectedDatabase: null, databases: [], error: null })
}

interface ServersState {
  servers: ServerEntry[]
  /** Name of the server the API client currently targets (from the URL). */
  activeServerName: string | null
  /** Point the API client at the server with this name (no-op if unknown). */
  setActiveServer: (name: string | null) => void
  activeServer: () => ServerEntry | null
}

export const useServersStore = create<ServersState>((set, get) => ({
  servers: SERVERS,
  activeServerName: null,

  setActiveServer: (name) => {
    const active = findServerByName(name)
    if (active?.name === get().activeServerName) return
    applyActive(active)
    set({ activeServerName: active ? active.name : null })
  },

  activeServer: () => findServerByName(get().activeServerName),
}))

export function useServers() {
  return useServersStore()
}
