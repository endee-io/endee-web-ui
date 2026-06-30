// Build-time server list. Servers are read-only and sourced from
// `servers.json` (gitignored — copy `servers.example.json` to create it).
// Server identity is the `name`, which must be unique.
import raw from './servers.json'

export interface ServerConfig {
  name: string
  url: string
  token: string
}

export const SERVERS: ServerConfig[] = Array.isArray(raw) ? (raw as ServerConfig[]) : []

export function findServerByName(name: string | null | undefined): ServerConfig | null {
  if (!name) return null
  return SERVERS.find((s) => s.name === name) ?? null
}
