/**
 * Server-only helpers for talking to the Endee backend (v2 Collections API).
 *
 * The browser may be connected to several servers. Each proxied request carries
 * the active server's base URL and root token in the `x-endee-url` /
 * `x-endee-token` headers; these helpers read them and build either:
 *   - a per-database root-impersonation token `root/<database>:<ROOT_TOKEN>`
 *     (data-plane: collections / objects / search / backups / tokens), or
 *   - a bare root client for control-plane admin calls (`/admin/dbs`).
 *
 * This module must NEVER be imported from a client component.
 */

import { Endee } from "endee"

export class ConfigError extends Error {}

interface ServerConfig {
  url: string
  token: string
}

/** Read the active server's base URL + root token from the request headers. */
export function getServerConfig(request: Request): ServerConfig {
  const rawUrl = request.headers.get("x-endee-url")?.trim() || ""
  const token = request.headers.get("x-endee-token")?.trim() || ""
  if (!rawUrl) {
    throw new ConfigError("No server selected (missing server URL).")
  }
  if (!token) {
    throw new ConfigError("No server token provided.")
  }
  // Be lenient: accept a bare host and append /api/v2.
  const base = rawUrl.replace(/\/+$/, "")
  const url = /\/api\/v\d+$/.test(base) ? base : `${base}/api/v2`
  return { url, token }
}

/** Build the root-impersonation auth value for a database: `root/<db>:<token>`. */
export function buildImpersonationToken(database: string, token: string): string {
  return `root/${database}:${token}`
}

/**
 * An `endee` SDK client scoped to a single database via impersonation. Used for
 * all data-plane work (collections, objects, search, backups, tokens).
 */
export function getImpersonatedClient(request: Request, database: string): Endee {
  const { url, token } = getServerConfig(request)
  const client = new Endee(buildImpersonationToken(database, token))
  client.setBaseUrl(url)
  return client
}

/**
 * A bare root client for control-plane admin operations (e.g. listing or
 * creating the server's databases via `/admin/dbs`).
 */
export function getAdminClient(request: Request): Endee {
  const { url, token } = getServerConfig(request)
  const client = new Endee(token)
  client.setBaseUrl(url)
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
 * for the backup upload endpoint, whose multipart streaming the SDK's
 * filesystem-based `uploadBackup` can't serve from a route handler.
 */
export function backupFetch(
  request: Request,
  database: string,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const { url, token } = getServerConfig(request)
  return fetch(`${url}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: buildImpersonationToken(database, token),
    },
    cache: "no-store",
  })
}

/**
 * Full backend URL for a path including a token query param (for downloads). The
 * SDK's `downloadBackup` writes to disk, so the browser streams the `.tar`
 * straight from the backend via this tokenized URL instead.
 */
export function backendUrlWithToken(request: Request, database: string, path: string): string {
  const { url, token } = getServerConfig(request)
  const sep = path.includes("?") ? "&" : "?"
  return `${url}${path}${sep}token=${encodeURIComponent(
    buildImpersonationToken(database, token)
  )}`
}
