/**
 * Server-only server-list store. Resolves the set of configured Endee servers
 * (and their secret root tokens) for the active APP_MODE:
 *
 *   - single-server: a single server derived from container env. Read-only.
 *   - multi-server:  a user-managed list persisted to SERVERS_FILE on disk.
 *
 * Tokens live only here and in the proxy routes; they are never sent to the
 * browser (see the /api/servers route, which strips them). Must NEVER be
 * imported from a client component.
 */

import { promises as fs } from "fs"
import path from "path"
import { getAppMode, getBundledServer, getServersFilePath } from "./appConfig"

export interface StoredServer {
  name: string
  url: string
  token: string
}

/** Server without its secret token — safe to send to the browser. */
export type PublicServer = Omit<StoredServer, "token">

export class ServerStoreError extends Error {}

function toPublic(s: StoredServer): PublicServer {
  return { name: s.name, url: s.url }
}

async function readFile(): Promise<StoredServer[]> {
  const file = getServersFilePath()
  try {
    const raw = await fs.readFile(file, "utf8")
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((s) => s && typeof s.name === "string" && typeof s.url === "string")
      .map((s) => ({ name: s.name, url: s.url, token: typeof s.token === "string" ? s.token : "" }))
  } catch (err: unknown) {
    // Missing file is fine — an empty list. Anything else is a real error.
    if ((err as NodeJS.ErrnoException)?.code === "ENOENT") return []
    throw new ServerStoreError(
      `Failed to read servers file: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

async function writeFile(servers: StoredServer[]): Promise<void> {
  const file = getServersFilePath()
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, JSON.stringify(servers, null, 2) + "\n", "utf8")
}

/** All configured servers (with tokens). Single-server mode returns the env server. */
export async function listServers(): Promise<StoredServer[]> {
  if (getAppMode() === "single-server") {
    const s = getBundledServer()
    return s ? [s] : []
  }
  return readFile()
}

/** Public server list (no tokens) — safe for the browser. */
export async function listPublicServers(): Promise<PublicServer[]> {
  return (await listServers()).map(toPublic)
}

/** Resolve one server's url + token by name, or null if unknown. */
export async function findServer(name: string): Promise<StoredServer | null> {
  return (await listServers()).find((s) => s.name === name) ?? null
}

function assertIndependent() {
  if (getAppMode() !== "multi-server") {
    throw new ServerStoreError("Server management is disabled in single-server mode.")
  }
}

function validate(server: Partial<StoredServer>): StoredServer {
  const name = (server.name ?? "").trim()
  const url = (server.url ?? "").trim()
  const token = (server.token ?? "").trim()
  if (!name) throw new ServerStoreError("Server name is required.")
  if (!url) throw new ServerStoreError("Server URL is required.")
  return { name, url, token }
}

/** Add a server (multi-server mode only). Rejects duplicate names. */
export async function addServer(input: Partial<StoredServer>): Promise<PublicServer[]> {
  assertIndependent()
  const server = validate(input)
  const servers = await readFile()
  if (servers.some((s) => s.name === server.name)) {
    throw new ServerStoreError(`A server named "${server.name}" already exists.`)
  }
  servers.push(server)
  await writeFile(servers)
  return servers.map(toPublic)
}

/** Delete a server by name (multi-server mode only). */
export async function deleteServer(name: string): Promise<PublicServer[]> {
  assertIndependent()
  const servers = await readFile()
  const next = servers.filter((s) => s.name !== name)
  await writeFile(next)
  return next.map(toPublic)
}

/** Replace the entire server list from an imported file (multi-server mode only). */
export async function importServers(input: unknown): Promise<PublicServer[]> {
  assertIndependent()
  if (!Array.isArray(input)) {
    throw new ServerStoreError("Imported file must be a JSON array of servers.")
  }
  const servers = input.map((s) => validate(s as Partial<StoredServer>))
  const names = new Set<string>()
  for (const s of servers) {
    if (names.has(s.name)) throw new ServerStoreError(`Duplicate server name "${s.name}" in import.`)
    names.add(s.name)
  }
  await writeFile(servers)
  return servers.map(toPublic)
}

/** Full server list (with tokens) for download/export (multi-server mode only). */
export async function exportServers(): Promise<StoredServer[]> {
  assertIndependent()
  return readFile()
}
