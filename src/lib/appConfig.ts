/**
 * Server-only runtime configuration. Read at request time (never cached) so the
 * same image can run in either mode by flipping the APP_MODE env var.
 *
 * APP_MODE:
 *   - "bundled":     one Endee server, its URL + root token come from the
 *                    container env (NDD_SERVER_URL / NDD_ROOT_TOKEN). The token
 *                    stays server-side; the browser never sees it and cannot
 *                    add/import/download servers.
 *   - "independent": servers are user-managed and persisted to a JSON file on
 *                    disk (SERVERS_FILE, default ./data/servers.json). The UI can
 *                    add / delete / import / download them.
 *
 * This module must NEVER be imported from a client component.
 */

export type AppMode = "bundled" | "independent"

export function getAppMode(): AppMode {
  return process.env.APP_MODE === "independent" ? "independent" : "bundled"
}

/** Absolute-or-relative path to the independent-mode server list file. */
export function getServersFilePath(): string {
  return process.env.SERVERS_FILE?.trim() || "./data/servers.json"
}

/**
 * The bundled-mode server derived from env. `NDD_SERVER_URL` is preferred;
 * `ENDEE_URL` is accepted for backward-compat with the older compose file.
 * Returns null if no URL is configured.
 */
export function getBundledServer(): { name: string; url: string; token: string } | null {
  const url = (process.env.NDD_SERVER_URL || process.env.ENDEE_URL || "").trim()
  const token = (process.env.NDD_ROOT_TOKEN || process.env.ROOT_TOKEN || "").trim()
  if (!url) return null
  return { name: process.env.NDD_SERVER_NAME?.trim() || "Endee", url, token }
}
