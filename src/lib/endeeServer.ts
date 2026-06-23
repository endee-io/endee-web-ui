/**
 * Server-only helpers for talking to the Endee backend with a per-database
 * root-impersonation token.
 *
 * The browser never holds the root token. Next route handlers import this
 * module to build the impersonation token `root/<database>:<ROOT_TOKEN>` and
 * either drive the `endee` SDK (index/vector/search) or issue raw fetches
 * (backups) on the server.
 *
 * This module must NEVER be imported from a client component.
 */

import { Endee } from "endee"

export class ConfigError extends Error {}

/** Backend base URL for the v1 API, resolved server-side. */
export function getServerApiBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SERVER_URL || process.env.NEXT_PUBLIC_ENDEE_URL || ""
  const base = raw.replace(/\/+$/, "")
  if (!base) {
    throw new ConfigError("Server URL is not configured (NEXT_PUBLIC_SERVER_URL).")
  }
  // The env value may or may not already include the /api/v1 suffix.
  return /\/api\/v\d+$/.test(base) ? base : `${base}/api/v1`
}

function getRootToken(): string {
  const token = process.env.ROOT_TOKEN
  if (!token) {
    throw new ConfigError("Admin token is not configured (ROOT_TOKEN).")
  }
  return token
}

/** Build the root-impersonation auth value for a database: `root/<db>:<token>`. */
export function buildImpersonationToken(database: string): string {
  return `root/${database}:${getRootToken()}`
}

/** An `endee` SDK client scoped to a single database via impersonation. */
export function getImpersonatedClient(database: string): Endee {
  const client = new Endee(buildImpersonationToken(database))
  client.setBaseUrl(getServerApiBaseUrl())
  return client
}

/** Validate and extract the `db` query param from a request. */
export function requireDatabase(request: Request): string {
  const db = new URL(request.url).searchParams.get("db")
  if (!db || !db.trim()) {
    throw new ConfigError("No database selected.")
  }
  return db.trim()
}

/**
 * Fetch a backend endpoint (e.g. the backup APIs that the SDK doesn't cover)
 * with the impersonation auth header injected. `path` is appended to the v1 API
 * base, e.g. `/backups`.
 */
export function backupFetch(
  database: string,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const url = `${getServerApiBaseUrl()}${path}`
  return fetch(url, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: buildImpersonationToken(database),
    },
    cache: "no-store",
  })
}

/** Full backend URL for a path including a token query param (for downloads). */
export function backendUrlWithToken(database: string, path: string): string {
  const sep = path.includes("?") ? "&" : "?"
  return `${getServerApiBaseUrl()}${path}${sep}token=${encodeURIComponent(
    buildImpersonationToken(database)
  )}`
}
