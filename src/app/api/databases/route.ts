import { NextResponse } from "next/server"

/**
 * Server-side proxy for listing server users (surfaced as "Databases" in the
 * UI). Runs on the server only so the admin ROOT_TOKEN is never exposed to the
 * browser.
 *
 * GET /api/databases  ->  GET {SERVER_URL}/admin/users  (Authorization: ROOT_TOKEN)
 */

// This route depends on request-time env/secrets; never statically cache it.
export const dynamic = "force-dynamic"

interface ServerUser {
  username: string
  user_type: string
  is_active: boolean
  created_at: number
}

function getServerUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SERVER_URL || process.env.NEXT_PUBLIC_ENDEE_URL || ""
  return url.replace(/\/+$/, "")
}

export async function GET() {
  const serverUrl = getServerUrl()
  const rootToken = process.env.ROOT_TOKEN

  if (!serverUrl) {
    return NextResponse.json(
      { error: "Server URL is not configured (NEXT_PUBLIC_SERVER_URL)." },
      { status: 500 }
    )
  }
  if (!rootToken) {
    return NextResponse.json(
      { error: "Admin token is not configured (ROOT_TOKEN)." },
      { status: 500 }
    )
  }

  let upstream: Response
  try {
    upstream = await fetch(`${serverUrl}/admin/users`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: rootToken,
      },
      cache: "no-store",
    })
  } catch {
    return NextResponse.json(
      { error: "Could not reach the Endee server." },
      { status: 502 }
    )
  }

  if (!upstream.ok) {
    let message = `Failed to list databases (status ${upstream.status}).`
    if (upstream.status === 401) {
      message = "Admin token rejected by the server."
    }
    return NextResponse.json({ error: message }, { status: upstream.status })
  }

  const data = (await upstream.json().catch(() => ({}))) as {
    users?: ServerUser[]
  }
  return NextResponse.json({ users: data.users ?? [] })
}
