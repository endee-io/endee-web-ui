'use client'

import { create } from 'zustand'
import { setActiveServer as setClientServer, setCurrentDatabase } from '../api/client'
import { useSelectedDatabaseStore } from './SelectedDatabaseContext'

export type AppMode = 'bundled' | 'independent'

/** A configured Endee server as seen by the browser — never includes the token. */
export interface ServerEntry {
  name: string
  url: string
}

/** Point the API client at a server by name (or clear it) and reset the selected db. */
function applyActive(name: string | null) {
  setClientServer(name)
  setCurrentDatabase(null)
  useSelectedDatabaseStore.setState({ selectedDatabase: null, databases: [], error: null })
}

async function parseError(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null)
  return body?.error || fallback
}

interface ServersState {
  mode: AppMode
  servers: ServerEntry[]
  loaded: boolean
  /** Name of the server the API client currently targets (from the URL). */
  activeServerName: string | null
  /** Fetch mode + server list from the server. */
  refresh: () => Promise<void>
  /** Point the API client at the server with this name (no-op if unknown). */
  setActiveServer: (name: string | null) => void
  activeServer: () => ServerEntry | null
  /** Add a server (independent mode). Throws with a message on failure. */
  addServer: (input: { name: string; url: string; token: string }) => Promise<void>
  /** Remove a server by name (independent mode). */
  removeServer: (name: string) => Promise<void>
  /** Replace the server list from a parsed servers.json array (independent mode). */
  importServers: (data: unknown) => Promise<void>
}

export const useServersStore = create<ServersState>((set, get) => ({
  mode: 'bundled',
  servers: [],
  loaded: false,
  activeServerName: null,

  refresh: async () => {
    const [modeRes, serversRes] = await Promise.all([
      fetch('/api/mode'),
      fetch('/api/servers'),
    ])
    const mode: AppMode = (await modeRes.json()).mode === 'independent' ? 'independent' : 'bundled'
    const servers: ServerEntry[] = (await serversRes.json()).servers ?? []
    set({ mode, servers, loaded: true })
  },

  setActiveServer: (name) => {
    const found = name ? get().servers.find((s) => s.name === name) ?? null : null
    if (found?.name === get().activeServerName) return
    applyActive(found ? found.name : null)
    set({ activeServerName: found ? found.name : null })
  },

  activeServer: () => {
    const { activeServerName, servers } = get()
    return servers.find((s) => s.name === activeServerName) ?? null
  },

  addServer: async (input) => {
    const res = await fetch('/api/servers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error(await parseError(res, 'Failed to add server'))
    set({ servers: (await res.json()).servers ?? [] })
  },

  removeServer: async (name) => {
    const res = await fetch(`/api/servers/${encodeURIComponent(name)}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(await parseError(res, 'Failed to remove server'))
    set({ servers: (await res.json()).servers ?? [] })
  },

  importServers: async (data) => {
    const res = await fetch('/api/servers/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error(await parseError(res, 'Failed to import servers'))
    set({ servers: (await res.json()).servers ?? [] })
  },
}))

export function useServers() {
  return useServersStore()
}
