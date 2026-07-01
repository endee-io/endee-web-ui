import { NextResponse } from "next/server"
import { getServerConfig } from "@/lib/endeeServer"
import { errorResponse, passthroughJson } from "@/lib/apiRoute"

export const dynamic = "force-dynamic"

/** Base URL for /license/* endpoints (served under /api/v2, like the rest). */
function licenseBase(request: Request): string {
  return getServerConfig(request).url
}

// POST /api/license/validate  body { license } -> activate/validate a license.
// The backend expects the raw license.lic content as the request body (not JSON).
export async function POST(request: Request) {
  try {
    const { license } = (await request.json()) as { license?: string }
    if (!license || !license.trim()) {
      return NextResponse.json({ error: "license is required" }, { status: 400 })
    }
    const upstream = await fetch(`${licenseBase(request)}/license/validate`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: license.trim(),
      cache: "no-store",
    })
    return passthroughJson(upstream)
  } catch (error) {
    return errorResponse(error)
  }
}
