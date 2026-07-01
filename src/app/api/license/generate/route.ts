import { NextResponse } from "next/server"
import { getServerConfig } from "@/lib/endeeServer"
import { errorResponse, passthroughJson } from "@/lib/apiRoute"

export const dynamic = "force-dynamic"

/** Base URL for /license/* endpoints (served under /api/v2, like the rest). */
function licenseBase(request: Request): string {
  return getServerConfig(request).url
}

// POST /api/license/generate  body { email } -> ask the server to email a license
export async function POST(request: Request) {
  try {
    const { email } = (await request.json()) as { email?: string }
    if (!email || !email.trim()) {
      return NextResponse.json({ error: "email is required" }, { status: 400 })
    }
    const upstream = await fetch(`${licenseBase(request)}/license/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
      cache: "no-store",
    })
    return passthroughJson(upstream)
  } catch (error) {
    return errorResponse(error)
  }
}
