/** Shared helpers for the server proxy route handlers. */

import { NextResponse } from "next/server"
import { ConfigError } from "./endeeServer"

/** Forward an upstream backend Response (status + JSON body) to the client. */
export async function passthroughJson(upstream: Response): Promise<NextResponse> {
  const text = await upstream.text()
  let body: unknown
  try {
    body = text ? JSON.parse(text) : {}
  } catch {
    body = { error: text || `Request failed (status ${upstream.status}).` }
  }
  return NextResponse.json(body, { status: upstream.status })
}

/** Map a thrown error from the SDK / fetch into a JSON error response. */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof ConfigError) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  const message = error instanceof Error ? error.message : "Unknown error"
  const lower = message.toLowerCase()
  if (lower.includes("401") || lower.includes("invalid token") || lower.includes("unauthorized")) {
    return NextResponse.json({ error: message }, { status: 401 })
  }
  if (lower.includes("not found") || lower.includes("404")) {
    return NextResponse.json({ error: message }, { status: 404 })
  }
  return NextResponse.json({ error: message }, { status: 500 })
}
