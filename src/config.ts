export const APP_VERSION = "beta"

declare global {
  interface Window {
    __ENV__?: {
      ENDEE_URL?: string
    }
  }
}

/**
 * Resolve the base URL of the Endee server.
 *
 * The browser talks to the Endee server DIRECTLY (not proxied through Next),
 * so this must be a fully-qualified URL reachable from the user's browser.
 *
 * Resolution order:
 *   1. window.__ENV__.ENDEE_URL  — injected at container runtime via /config.js
 *      (overwritten by docker-entrypoint.sh from the ENDEE_URL env var).
 *   2. NEXT_PUBLIC_ENDEE_URL     — build-time fallback, handy for local dev
 *      (set in .env.local).
 *   3. ""                        — same-origin relative requests (dev default
 *      when neither is set; assumes a proxy or co-located backend).
 *
 * The returned value has any trailing slash stripped so callers can safely
 * append `/api/v1/...`.
 */
export function getBackendUrl(): string {
  const runtime =
    typeof window !== "undefined" ? window.__ENV__?.ENDEE_URL : undefined
  const url = runtime || process.env.NEXT_PUBLIC_ENDEE_URL || ""
  return url.replace(/\/+$/, "")
}

/** Convenience: full base URL for the v1 API, e.g. `http://host:8080/api/v1`. */
export function getApiBaseUrl(): string {
  return `${getBackendUrl()}/api/v1`
}
