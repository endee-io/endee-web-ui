/**
 * Server-only helpers for talking to the Endee backend (v2 Collections API).
 *
 * The browser sends only the ACTIVE SERVER'S NAME in the `x-endee-server`
 * header. These helpers resolve that name to a base URL + secret root token
 * server-side (from env in single-server mode, or the on-disk servers file in
 * multi-server mode) — the token never travels to the browser. From there they
 * build either:
 *   - a per-database root-impersonation token `root/<database>:<ROOT_TOKEN>`
 *     (data-plane: collections / objects / search / backups / tokens), or
 *   - a bare root client for control-plane admin calls (`/admin/dbs`).
 *
 * This module must NEVER be imported from a client component.
 */

import { Endee } from "endee"
import { findServer } from "./serverStore"

export class ConfigError extends Error {}

interface ServerConfig {
  url: string
  token: string
}

/**
 * Resolve the active server's base URL + root token from the request. The
 * browser sends `x-endee-server: <name>`; the credentials are looked up
 * server-side.
 */
export async function getServerConfig(request: Request): Promise<ServerConfig> {
  const name = request.headers.get("x-endee-server")?.trim() || ""
  if (!name) {
    throw new ConfigError("No server selected.")
  }
  const server = await findServer(name)
  if (!server) {
    throw new ConfigError(`Unknown server "${name}".`)
  }
  if (!server.token) {
    throw new ConfigError(`Server "${name}" has no token configured.`)
  }
  // Be lenient: accept a bare host and append /api/v2.
  const base = server.url.replace(/\/+$/, "")
  const url = /\/api\/v\d+$/.test(base) ? base : `${base}/api/v2`
  return { url, token: server.token }
}

/** Build the root-impersonation auth value for a database: `root/<db>:<token>`. */
export function buildImpersonationToken(database: string, token: string): string {
  return `root/${database}:${token}`
}

/**
 * An `endee` SDK client scoped to a single database via impersonation. Used for
 * all data-plane work (collections, objects, search, backups, tokens).
 */
export async function getImpersonatedClient(request: Request, database: string): Promise<Endee> {
  const { url, token } = await getServerConfig(request)
  const client = new Endee(buildImpersonationToken(database, token))
  client.setBaseUrl(url)
  return client
}

/**
 * A bare root client for control-plane admin operations (e.g. listing or
 * creating the server's databases via `/admin/dbs`).
 */
export async function getAdminClient(request: Request): Promise<Endee> {
  const { url, token } = await getServerConfig(request)
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
 * Fetch a backend endpoint with the impersonation auth header injected. For
 * endpoints the SDK doesn't cover: backup upload/download (multipart streaming
 * the SDK's filesystem-based helpers can't serve from a route handler) and
 * object graph links.
 */
export async function backupFetch(
  request: Request,
  database: string,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const { url, token } = await getServerConfig(request)
  return fetch(`${url}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: buildImpersonationToken(database, token),
    },
    cache: "no-store",
  })
}
