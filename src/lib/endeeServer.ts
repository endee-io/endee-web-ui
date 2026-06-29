/**
 * Server-only helpers for talking to the Endee backend (v2 Collections API).
 *
 * The browser never holds a token. Next route handlers import this module to
 * build either:
 *   - a per-database root-impersonation token `root/<database>:<ROOT_TOKEN>`
 *     (data-plane: collections / objects / search / backups), or
 *   - a bare root client for control-plane admin calls (`/admin/dbs`).
 *
 * This module must NEVER be imported from a client component.
 */

import { Endee } from "endee"

export class ConfigError extends Error {}

/** Backend base URL for the v2 API, resolved server-side. */
export function getServerApiBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SERVER_URL || process.env.NEXT_PUBLIC_ENDEE_URL || ""
  const base = raw.replace(/\/+$/, "")
  if (!base) {
    throw new ConfigError("Server URL is not configured (NEXT_PUBLIC_SERVER_URL).")
  }
  // The env value may or may not already include the /api/v2 suffix.
  return /\/api\/v\d+$/.test(base) ? base : `${base}/api/v2`
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

/**
 * An `endee` SDK client scoped to a single database via impersonation. Used for
 * all data-plane work (collections, objects, search, backups).
 */
export function getImpersonatedClient(database: string): Endee {
  const client = new Endee(buildImpersonationToken(database))
  client.setBaseUrl(getServerApiBaseUrl())
  return client
}

/**
 * A bare root client for control-plane admin operations (e.g. listing the
 * server's databases via `/admin/dbs`). The root token cannot run data ops
 * directly — use `getImpersonatedClient` for those.
 */
export function getAdminClient(): Endee {
  const client = new Endee(getRootToken())
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
 * Fetch a backend endpoint with the impersonation auth header injected. Retained
 * only for the backup upload endpoint, whose multipart streaming the SDK's
 * filesystem-based `uploadBackup` can't serve from a route handler. `path` is
 * appended to the v2 API base, e.g. `/backups/upload`.
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

/**
 * Full backend URL for a path including a token query param (for downloads). The
 * SDK's `downloadBackup` writes to disk, so the browser streams the `.tar`
 * straight from the backend via this tokenized URL instead.
 */
export function backendUrlWithToken(database: string, path: string): string {
  const sep = path.includes("?") ? "&" : "?"
  return `${getServerApiBaseUrl()}${path}${sep}token=${encodeURIComponent(
    buildImpersonationToken(database)
  )}`
}
