import { NextResponse } from "next/server"
import { exportServers, ServerStoreError } from "@/lib/serverStore"

export const dynamic = "force-dynamic"

// GET /api/servers/export -> the full servers.json (WITH tokens) as a download.
// Multi-server mode only; tokens are included so the file round-trips via import.
export async function GET() {
  try {
    const servers = await exportServers()
    return new NextResponse(JSON.stringify(servers, null, 2) + "\n", {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="servers.json"',
      },
    })
  } catch (error) {
    if (error instanceof ServerStoreError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
